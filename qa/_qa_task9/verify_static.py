"""Task 9 static acceptance for Results/script.js.

File-level gates from plan/Task9-实现导航脚本与渐进增强.md: the deliverable set stays six
files, the script is a dependency-free classic script, no-js -> js runs first, the only DOM
writes are the three contracted state sites, the breakpoint string is (min-width: 769px),
and the four HTML files + styles.css are byte-identical to the pre-Task-9 baseline.
QA-only; nothing here is written to Results/.
"""
import hashlib
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
RESULTS = HERE.parent / "Results"
if len(sys.argv) > 1:
    RESULTS = Path(sys.argv[1])
SCRIPT = RESULTS / "script.js"
BASELINE = HERE / "hashes_before.txt"
PAGES = ["index.html", "news-message.html", "news-feature.html", "news-commentary.html"]

CHECKS = []


def check(name, ok, detail=""):
    CHECKS.append({"name": name, "pass": bool(ok), "detail": str(detail)[:400]})


def strip_comments(src):
    """Remove // and /* */ comments, honouring string literals."""
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c in "\"'`":
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == c:
                    break
                j += 1
            out.append(src[i:min(j + 1, n)])
            i = j + 1
        elif src.startswith("//", i):
            j = src.find("\n", i)
            i = n if j < 0 else j
        elif src.startswith("/*", i):
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def main():
    if not SCRIPT.exists():
        print("FAIL: Results/script.js does not exist")
        return 1

    raw = SCRIPT.read_bytes()
    check("script.js 非空且体积合理", 300 <= len(raw) <= 4096, f"{len(raw)} bytes")
    check("无 BOM", not raw.startswith(b"\xef\xbb\xbf"))
    try:
        src = raw.decode("utf-8")
        check("严格 UTF-8 解码", True)
    except UnicodeDecodeError as exc:
        check("严格 UTF-8 解码", False, exc)
        src = raw.decode("utf-8", "replace")
    check("无 NUL/控制字符", not re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", src))
    check("以换行结尾", src.endswith("\n"))

    code = strip_comments(src)

    # ---- 交付集合与文件所有权 ----
    listing = sorted(p.name for p in RESULTS.iterdir() if p.is_file())
    check("Results/ 恰为六个交付文件（无第七个）",
          listing == sorted(PAGES + ["script.js", "styles.css"]), listing)

    # ---- 经典脚本、零依赖、零网络 ----
    for pat, label in [(r"\bimport\b", "import"), (r"\bexport\b", "export"),
                       (r"\brequire\s*\(", "require"), (r"\bfetch\s*\(", "fetch"),
                       (r"XMLHttpRequest", "XMLHttpRequest"), (r"\bnew\s+Worker", "Worker"),
                       (r"WebSocket|EventSource|sendBeacon", "其它网络 API"),
                       (r"https?:", "协议 URL"), (r"^\s*//\s*\S", "协议相对 URL"),
                       (r"\burl\s*\(", "CSS url()"), (r"@import", "@import"),
                       (r"console\s*\.", "console."), (r"\bdebugger\b", "debugger"),
                       (r"\beval\s*\(|new\s+Function", "eval / new Function"),
                       (r"document\.write", "document.write")]:
        hit = re.search(pat, code, flags=re.M)
        check(f"禁用项不存在：{label}", not hit, hit.group(0) if hit else "")
    check("注释中也不含 URL", not re.search(r"https?://|\bgit\b|\bcdn\b", src))
    check("不含 ES6+ 模块/顶层 await", not re.search(r"\bawait\b|\basync\b|=>|\bclass\s|\blet\b|\bconst\b", code))

    # ---- IIFE + 严格模式 + 无全局泄漏 ----
    stripped = code.strip()
    check("整体包在 IIFE 中并立即调用",
          stripped.startswith("(function") and re.search(r"\}\)\(\);?$", stripped) is not None, stripped[-12:])
    check("严格模式声明为 IIFE 首句",
          re.search(r"function\s*\(\s*\)\s*\{\s*['\"]use strict['\"]\s*;", code) is not None)
    check("不向 window/globalThis/self 写属性",
          not re.search(r"\b(window|globalThis|self)\s*\.\s*[A-Za-z_$][\w$]*\s*=", code))
    check("无顶层游离声明（全部包在 IIFE 内）",
          not re.search(r"^(var|let|const|function)\s", code, flags=re.M))

    # ---- 行为 1：no-js -> js 位于首位 ----
    i_remove = code.find("classList.remove('no-js')")
    i_add = code.find("classList.add('js')")
    i_query = code.find("getElementById")
    check("存在 classList.remove('no-js')", i_remove >= 0)
    check("存在 classList.add('js')", i_add >= 0)
    check("no-js -> js 先于任何元素查询", -1 < i_remove < i_query and -1 < i_add < i_query,
          f"remove={i_remove} add={i_add} query={i_query}")
    check("no-js -> js 先于任何其它状态写入",
          i_remove >= 0 and (i_add < code.find("classList.toggle") or code.find("classList.toggle") < 0))
    check("用 classList 而非整体改写 class 字符串", "className" not in code)
    check("接口缺失时先完成 no-js->js 再安全 return",
          re.search(r"classList\.add\('js'\).*?if\s*\(\s*!\s*toggle\s*\|\|\s*!\s*navigation\s*\)\s*\{\s*return\s*;\s*\}",
                    code, flags=re.S) is not None)
    check("无 try/catch 吞错", not re.search(r"\btry\b|\bcatch\b|\bthrow\b", code))

    # ---- 输出面：只允许三处状态写入 ----
    set_attr = re.findall(r"([A-Za-z_$][\w$]*)\s*\.\s*setAttribute\s*\(\s*['\"]([^'\"]+)['\"]", code)
    check("setAttribute 仅出现在 toggle.aria-expanded",
          set_attr == [("toggle", "aria-expanded")], set_attr)
    check("aria-expanded 取值仅 'true'/'false' 且随 open 同步",
          re.search(r"setAttribute\(\s*['\"]aria-expanded['\"]\s*,\s*open\s*\?\s*'true'\s*:\s*'false'\s*\)", code) is not None)
    check("无 removeAttribute / toggleAttribute",
          not re.search(r"removeAttribute|toggleAttribute", code))
    writes = re.findall(r"([A-Za-z_$][\w$]*)\s*\.\s*(classList|style|innerHTML|outerHTML|insertAdjacentHTML"
                        r"|textContent|innerText|className|attributes|sheet)\b", code)
    allowed = {"root", "navigation", "toggle"}
    check("DOM 写入对象仅限 root/navigation/toggle",
          not [w for w in writes if w[0] not in allowed], [w for w in writes if w[0] not in allowed])
    cl = re.findall(r"([A-Za-z_$][\w$]*)\s*\.\s*classList\s*\.\s*(add|remove|toggle)\s*\(\s*['\"]([^'\"]+)['\"]", code)
    contract = {("root", "remove", "no-js"), ("root", "add", "js"), ("navigation", "toggle", "is-open")}
    check("classList 写入仅限合同三组（类名+对象+方法）", set(cl) <= contract, cl)
    check("is-open 与 aria-expanded 在同一函数内原子写入",
          re.search(r"classList\.toggle\(\s*'is-open'\s*,\s*open\s*\)\s*;\s*"
                    r"toggle\.setAttribute\(\s*'aria-expanded'", code) is not None)
    check("不存在只改 is-open 或只改 aria-expanded 的路径",
          len(re.findall(r"classList\.toggle\(\s*'is-open'", code)) == 1
          and len(re.findall(r"setAttribute\(\s*'aria-expanded'", code)) == 1)
    check("无内联样式/布局尺寸读写",
          not re.search(r"\.style|offsetWidth|offsetHeight|clientWidth|clientHeight"
                        r"|innerWidth|innerHeight|getBoundingClientRect|scrollTo|scrollIntoView", code))
    check("不用 tabindex / aria-hidden / hidden 管理可聚焦性",
          not re.search(r"tabIndex|tabindex|aria-hidden|\.hidden\s*=|setAttribute\(\s*['\"]hidden", code))
    check("不读写 dataset", "dataset" not in code)
    check("不新增/删除/克隆 DOM 节点",
          not re.search(r"createElement|appendChild|removeChild|insertBefore|cloneNode|replaceChild|\.remove\(\)", code))
    ids = set(re.findall(r"getElementById\(\s*['\"]([^'\"]+)['\"]", code))
    sels = set(re.findall(r"querySelector(?:All)?\(\s*['\"]([^'\"]+)['\"]", code)) \
        | set(re.findall(r"closest\(\s*['\"]([^'\"]+)['\"]", code))
    check("元素查询仅基于三个冻结接口（ID/类名）",
          ids <= {"nav-toggle", "site-navigation"} and sels <= {".site-navigation__link"},
          (sorted(ids), sorted(sels)))

    # ---- 行为 2–5 存在性 ----
    check("按钮 click 恰好绑定一次", len(re.findall(r"toggle\.addEventListener\(\s*'click'", code)) == 1)
    check("切换语义为按当前状态取反", re.search(r"setOpen\(\s*!\s*isOpen\(\)\s*\)", code) is not None)
    check("不为按钮绑定 keydown（避免 Enter/Space 双触发）",
          not re.search(r"toggle\.addEventListener\(\s*['\"]key(down|press|up)", code))
    check("keydown 只挂在 document 上",
          re.search(r"document\.addEventListener\(\s*'keydown'", code) is not None
          and len(re.findall(r"addEventListener\(\s*['\"]key", code)) == 1)
    check("Esc 判定兼容旧值 'Esc'", "'Escape'" in code and "'Esc'" in code)
    check("Esc 仅在打开时关闭并返回焦点",
          re.search(r"if\s*\(isOpen\(\)\)\s*\{\s*closeMenu\(\)\s*;\s*toggle\.focus\(\)\s*;\s*\}", code) is not None)
    check("Esc 关闭态无副作用（focus 只在该分支内）",
          code.count(".focus()") == 1, code.count(".focus()"))
    check("链接点击委托绑定在 navigation 上且按类名匹配",
          re.search(r"navigation\.addEventListener\(\s*'click'", code) is not None
          and re.search(r"closest\(\s*'\.site-navigation__link'\s*\)", code) is not None)
    check("链接关闭仅在打开态发生", re.search(r"closest\([^)]*\)\s*&&\s*isOpen\(\)", code) is not None)
    check("不对链接事件 preventDefault（保持真实导航）", "preventDefault" not in code)
    check("跨断点使用 matchMedia('(min-width: 769px)')",
          re.search(r"matchMedia\(\s*'\(min-width:\s*769px\)'\s*\)", code) is not None)
    check("断点不含 768 / 48rem / max-width", not re.search(r"768|48rem|max-width", code))
    check("change 监听进入桌面时关闭",
          re.search(r"addEventListener\(\s*'change'\s*,\s*handleBreakpoint", code) is not None
          and re.search(r"if\s*\(event\.matches\)\s*\{\s*closeMenu\(\)\s*;\s*\}", code) is not None)
    check("保留旧版 Safari addListener 回退",
          re.search(r"typeof\s+media\.addEventListener\s*===\s*'function'", code) is not None
          and re.search(r"else if\s*\(typeof\s+media\.addListener\s*===\s*'function'\)", code) is not None
          and re.search(r"media\.addListener\(", code) is not None)
    check("DOMContentLoaded 未使用（defer 已保证解析完成）", "DOMContentLoaded" not in code)
    check("启动归一化为关闭态且先于监听绑定",
          0 <= code.find("closeMenu();") < code.find("toggle.addEventListener('click'"),
          (code.find("closeMenu();"), code.find("toggle.addEventListener('click'")))

    # ---- 范围禁区 ----
    listeners = re.findall(r"([A-Za-z_$][\w$]*)\s*\.\s*addEventListener\(\s*['\"]([^'\"]+)['\"]", code)
    check("监听器总数为 4 且类型符合合同",
          len(re.findall(r"addEventListener\(\s*['\"]", code)) == 4
          and sorted(t for _, t in listeners) == ["change", "click", "click", "keydown"], listeners)
    check("未实现“点击菜单外部关闭”",
          not re.search(r"(document|window|body|navigation)\s*\.\s*addEventListener\s*\(\s*"
                        r"['\"](pointerdown|mousedown|mouseup|touchstart)", code), listeners)
    check("document/window 上不绑定 click",
          not re.search(r"(document|window)\s*\.\s*addEventListener\(\s*['\"]click", code))
    check("代码（注释外）不含任何中文", not re.search(r"[\u4e00-\u9fff]", code),
          re.findall(r"[\u4e00-\u9fff]+", code)[:6])
    check("全文不含中文链接文本判定",
          not any(t in src for t in ["首页", "新闻消息", "新闻通讯", "新闻评论"]))
    check("无任何单页分支（不含页面名/文件名判定）",
          not re.search(r"index\.html|news-|message|feature|commentary|location\.(pathname|href)|document\.URL|navigator\.", code),
          re.findall(r"index\.html|news-\w+|location\.\w+|document\.URL|navigator\.\w+", code)[:4])
    check("不以位置索引选择元素",
          not re.search(r"(children|childNodes|querySelectorAll)\s*(\[[0-9]|\.\s*\[)", code))
    check("不触碰文章/正文节点", not re.search(r"article|main-content|<p|paragraph", code, flags=re.I))

    # ---- 上游接口仍在四页中（只读核对） ----
    for name in PAGES:
        h = (RESULTS / name).read_text(encoding="utf-8")
        check(f"{name} 保留 Task 2 脚本接口",
              'class="no-js"' in h and 'id="nav-toggle"' in h
              and 'aria-controls="site-navigation"' in h and 'aria-expanded="false"' in h
              and 'id="site-navigation"' in h and '<script src="script.js" defer>' in h
              and h.count('class="site-navigation__link"') == 4,
              "")
        check(f"{name} 无内联 <script>/内联事件属性",
              not re.search(r"<script(?![^>]*\bsrc=)", h)
              and not re.search(r"\son(click|keydown|load|error)\s*=", h))
    check("四页均以 defer 引用同一共享脚本",
          all((RESULTS / n).read_text(encoding="utf-8").count('src="script.js"') == 1 for n in PAGES))

    # ---- 文件所有权：HTML/CSS 逐字节未变 ----
    if BASELINE.exists():
        for line in BASELINE.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            fname, want = line.split()
            got = hashlib.sha256((RESULTS / fname).read_bytes()).hexdigest()
            check(f"{fname} 与实施前 SHA-256 一致", got == want, f"{got[:16]} vs {want[:16]}")
    else:
        check("存在实施前哈希基线", False, BASELINE)

    mat_files = [p for p in (ROOT / "Materials").rglob("*") if p.is_file()]
    newest_mat = max(p.stat().st_mtime for p in mat_files)
    check("Materials/ 内 Word 素材均未被修改",
          newest_mat < SCRIPT.stat().st_mtime,
          f"{len(mat_files)} 个素材文件，最后修改早于 script.js")

    failed = [c for c in CHECKS if not c["pass"]]
    out = []
    for c in CHECKS:
        out.append(f"{'PASS' if c['pass'] else 'FAIL'}  {c['name']}"
                   + (f"  :: {c['detail']}" if not c["pass"] and c["detail"] else ""))
    text = "\n".join(out) + f"\n\nSTATIC: {len(CHECKS) - len(failed)}/{len(CHECKS)} pass, {len(failed)} failures\n"
    # Mutant runs must not clobber the control report (they pass a results dir as argv[1]).
    report = HERE / ("static_result.txt" if len(sys.argv) <= 1
                     else f"static_result_{RESULTS.name}.txt")
    report.write_text(text, encoding="utf-8")
    print(text)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
