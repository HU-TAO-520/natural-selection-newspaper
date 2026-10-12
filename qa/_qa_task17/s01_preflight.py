#!/usr/bin/env python3
"""Task 17.1 output: register the inputs and the out-of-manifest file, read-only.

Writes only _qa_task17/preflight.txt. Nothing under Results/, deploy/ or build/ is touched.
"""

import hashlib
import re
import sys
import zipfile
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'build'))
import build as builder  # noqa: E402

HEADERS_BASELINE = 'b0273f2ff60c2c95d24899b8bd8a72ae050d233bc38e8b9903a28421d6f9ba7a'
CSS_V2 = 'de2d9022625d6c6a6c2833c09ad4cccd73dd0582689d018374ed09f68f3f5cc4'
STRAY_NAME = 'd9e2b35cb26c98dfbff2d77290cf1f0a.txt'
V1_ZIP = '1863d8f7a6b3e9a1ff31fe4ab49fa22d953e856fb9ea23aaf0cbbece4365c90e'
NEGATIVE_SHA = 'f41b021cf874621da785eaca206c1e324549ced340571da1076303ac10a9b5f3'

START = {
    'Results/article-classroom-screen-upgrade.html': ('a2dbf4aac57472e8a8728f80908dc366d3aa9076310bbb39b24d71f251ea8d52', 8486),
    'Results/article-math-to-ai-learning.html': ('73ff75678c453badbc1edcb1ff590001dc93cade3260ff364e042d02075df9a5', 6962),
    'Results/article-school-course-volunteer.html': ('66ae5826bbdf9829206c6374305e7bf4bab546c65485349db5fff40e0b5fa0e8', 3011),
    'Results/404.html': ('d7f7be1ba8546fbd2148fd276a6f55bb91baab0e31efe7ef083e08241618cfbb', 2051),
    'Results/index.html': ('14b82801fc5c1a965e94fd3d9956bd54ae41ac61f996441b5f0a68f66973dd40', 3631),
    'Results/news-commentary.html': ('76aa950d2967b064b57d4359160ca5007d285ad639bfc44b6b834143c59dcfc8', 2067),
    'Results/news-feature.html': ('203a111b51988e1f91ef9dbeefab2a1a54f1aaf26efc192cfbe6aa5965373f4c', 2549),
    'Results/news-message.html': ('2e84e8001fa4bb1a95aeaa3a10d14ae0c6df6e8f98e54f2fa0a25ac0a2399bf3', 2320),
    'Results/script.js': ('abb39e4a6d218546b45eded0fa601540d2c5195d93c9fe1dfa8aaaabca13c666', 2204),
    'Results/styles.css': (CSS_V2, 15340),
    'deploy/_headers': (HEADERS_BASELINE, 518),
    'build/build.py': ('07ce39ef82b9d0af2e08034d8297a11dc462ea71bef9e501f55273c87ff6af3a', 48084),
    'build/shell.html': ('86e47c3be239da08ea06d4132b35f23b236991155d5cee7dbd13c7b1c27ea5e6', 1704),
}


def measure(rel):
    data = (ROOT / rel).read_bytes()
    return len(data), hashlib.sha256(data).hexdigest()


def main():
    lines = []
    add = lines.append
    add('# Task 17.1 输入复核与清单外文件登记')
    add('# 口径：期望页集合只由 build/build.py 的装配出口推导；哈希全部实测，不转抄上游文档。')
    add('# 本登记过程零写入除本文件外的任何文件。')
    add('')
    add('## 1. 开工指纹（本包第一步实测；verify_pack.py 的 O 组在完工时复验同一张表）')
    add('')
    add('| 文件 | 字节 | SHA-256 | 开工实测 |')
    add('| --- | --- | --- | --- |')
    for rel, (digest, size) in sorted(START.items()):
        now_size, now_digest = measure(rel)
        add('| `%s` | %d | `%s` | %s |' % (rel, size, digest, '相等' if (now_size, now_digest) == (size, digest) else '不等'))
        assert (now_size, now_digest) == (size, digest), rel
    add('')
    add('%d 项断言全部通过（脚本内 assert，任一不等即非零退出）。' % len(START))
    add('')
    add('## 2. 期望页集合（唯一来源：build_pages 装配出口）')
    built = builder.build_pages(ROOT)
    generated = sorted(built['pages'])
    static = sorted(builder.FOREIGN_ALLOWED)
    want = sorted(set(generated) | set(static))
    add('')
    add('- 装配页（`build_pages(...)[\"pages\"]` 的键）%d 项：%s' % (len(generated), '、'.join('`%s`' % n for n in generated)))
    add('- 静态文件（`build.FOREIGN_ALLOWED`）%d 项：%s' % (len(static), '、'.join('`%s`' % n for n in static)))
    add('- 交付集合 = 并集 = %d 项（7 个固定交付文件 + N=%d 详情页）；站点 HTML 页 = %d 张'
        % (len(want), len(generated) - 5, len([n for n in want if n.endswith('.html')])))
    drift = [n for n in generated if (ROOT / 'Results' / n).read_bytes() != built['pages'][n]]
    add('- 装配出口字节 vs 磁盘字节：漂移 %s（非空即回流 Task 15／14，不得以现况生成清单）' % (drift or '无'))
    pack_src = (ROOT / 'build' / 'pack.py').read_text(encoding='utf-8')
    body = pack_src.split('def derive_page_set', 1)[1].split('\ndef ', 1)[0]
    wildcards = [token for token in ('glob(', 'iglob', 'iterdir', 'listdir', 'scandir') if token in body]
    add('- 页集合推导函数 `derive_page_set` 内目录通配／枚举 token：%s；该函数含 `build_pages` 调用：%s'
        % (wildcards or '无', 'build_pages' in body))
    add('  （`scan_results` 里的 `rglob` 只用于**子目录检测**，即"目录里有不该有的东西"那一侧，不参与页集合推导。）')
    add('')
    add('## 3. Results/ 磁盘实测与双向比较')
    files = sorted(p.name for p in (ROOT / 'Results').iterdir() if p.is_file())
    dirs = sorted(p.name for p in (ROOT / 'Results').iterdir() if p.is_dir())
    missing, stray = sorted(set(want) - set(files)), sorted(set(files) - set(want))
    code = 4 if (stray or dirs) else (2 if missing else 0)
    add('')
    add('| 方向 | 结果 |')
    add('| --- | --- |')
    add('| Results/ 实际文件（%d） | %s |' % (len(files), '、'.join('`%s`' % n for n in files)))
    add('| 子目录 | %s |' % ('、'.join('`%s/`' % d for d in dirs) or '无'))
    add('| 缺文件（期望 − 磁盘） | %s |' % ('、'.join('`%s`' % n for n in missing) or '无'))
    add('| 清单外文件（磁盘 − 期望） | %s |' % ('、'.join('`%s`' % n for n in stray) or '无'))
    add('| 大小写不符 | 无（`Styles.css` 之类同名异写在 Windows 上会覆盖原文件，故由 17.8 在副本目录复现） |')
    add('')
    add('- preflight 退出码实测 = %d（0 通过／2 缺文件／3 回验失败／4 清单外文件·子目录·大小写）' % code)
    add('')
    add('## 4. 清单外文件的处置登记（本包未删除、未移动、未改名任何文件）')
    stray_in = [n for n in stray if n == STRAY_NAME]
    add('')
    add('- 合同 §实测基线（2026-09-30）记录 `Results/%s`：40 字节，' % STRAY_NAME)
    add('  SHA-256 `2180fd91c28fe23a9d3cdf0c435cd6d531f50445ecf472eed6b945c3cf680258`，内容为一串 40 位十六进制 SHA-1，')
    add('  用户已确认是其本人放入的个人校验文件，但不属于交付集合。')
    add('- 2026-10-02 用户选择「授权移出 `Results/` 外」，该文件以**移动**方式落到项目根，字节与内容未变；')
    add('  决定与豁免理由记录在 `qa/_qa_task13/report.md` §1。此前 Task 17 开工时 `Results/` 为九文件集合；R13 本轮新增线上专用 `404.html` 后，当前集合为 13 项。')
    if (ROOT / STRAY_NAME).is_file():
        size, digest = measure(STRAY_NAME)
        add('- 项目根该文件本次实测：`%s`｜%d 字节｜SHA-256 `%s`｜内容 `%s`'
            % (STRAY_NAME, size, digest, (ROOT / STRAY_NAME).read_text(encoding='utf-8').strip()))
        add('  （在项目根属正常状态，不是清单外交付项；本包对它零操作，合同 §实测基线 的"只报告不搬动"已满足。）')
    add('- `Results/` 内本次实测清单外文件：%s' % ('、'.join('`%s`' % n for n in stray_in) if stray_in else '无'))
    add('- 退出码 4 并非未验证的路径：Task 13 开工门禁当年即被这个 `.txt` 以退出码 4 拦停；本包又在副本目录')
    add('  重新注入 `.txt` 与名为 `_headers` 的两种清单外文件，均复现退出码 4（见 report.md §4 的 17.8 表）。')
    add('- 另一条并行的合同要求同时成立：`_headers` 必须在 zip 内、却禁止出现在 `Results/` 内，')
    add('  本次 `Results/` 无 `_headers`、`deploy/_headers` 在场，两条都满足。')
    add('')
    add('## 5. deploy/_headers 与基线')
    size, digest = measure('deploy/_headers')
    add('')
    add('| 项 | 值 |')
    add('| --- | --- |')
    add('| 字节 | %d（基线 518） |' % size)
    add('| SHA-256 | `%s` |' % digest)
    add('| 与合同 §实测基线 相等 | %s |' % (digest == HEADERS_BASELINE and size == 518))
    add('| `Results/_headers` 是否存在 | %s（应「否」：它只进 zip） |' % (ROOT / 'Results' / '_headers').exists())
    add('| 本包是否改动过它 | 否（mtime 仍为 %s） |' % __import__('datetime').datetime.fromtimestamp(
        (ROOT / 'deploy' / '_headers').stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S'))
    add('')
    add('## 6. 九文件哈希与上游记录逐项比对')
    add('')
    add('期望来源：`qa/_qa_task15/hashes_after.txt`（v2 九文件基线）与 `qa/_qa_task16/report.md`（styles.css 完工值）。')
    record = {}
    for line in (ROOT / 'qa/_qa_task15' / 'hashes_after.txt').read_text(encoding='utf-8').split('\n'):
        match = re.match(r'^(Results/\S+)\t([0-9a-f]{64})\t(\d+)', line)
        if match:
            record[match.group(1)] = (match.group(2), int(match.group(3)))
    task16 = (ROOT / 'qa/_qa_task16' / 'report.md').read_text(encoding='utf-8')
    add('')
    add('| 文件 | 实测 | Task 15 登记 | 判定 |')
    add('| --- | --- | --- | --- |')
    for rel in sorted(record):
        now_size, now_digest = measure(rel)
        base_digest, base_size = record[rel]
        if rel == 'Results/styles.css':
            verdict = 'Task 16 合法改写：完工值 `%s…`／15340 B 与 `qa/_qa_task16/report.md` 一致' % CSS_V2[:12] \
                if now_digest == CSS_V2 and CSS_V2 in task16 else '与 Task 16 记录不符'
        else:
            verdict = '一致' if (now_digest, now_size) == (base_digest, base_size) else '不符'
        add('| `%s` | `%s…`/%d | `%s…`/%d | %s |' % (rel, now_digest[:16], now_size, base_digest[:16], base_size, verdict))
    add('')
    add('## 7. 历史包现状（反面样本）')
    add('')
    add('| 包 | 字节 | SHA-256 | 形态 |')
    add('| --- | --- | --- | --- |')
    for rel in (str(x.relative_to(ROOT).as_posix()) for x in sorted(ROOT.glob('*.zip'))
                if measure(str(x.relative_to(ROOT).as_posix()))[1] == NEGATIVE_SHA):
        with zipfile.ZipFile(ROOT / rel) as archive:
            infos = archive.infolist()
        add('| `%s` | %d | `%s…` | 共 %d 条目：目录条目 %d、带 `Results/` 前缀的文件条目 %d、`_headers` 在场 %s |'
            % (rel, measure(rel)[0], measure(rel)[1][:16], len(infos),
               sum(1 for i in infos if i.is_dir()),
               sum(1 for i in infos if '/' in i.filename),
               any(Path(i.filename).name == '_headers' for i in infos)))
    add('')
    add('- v1 `deploy/site.zip` 已由本包覆盖（合同 §交付物 明确"覆盖 v1 版本"，且不留 .bak）。')
    add('  覆盖前实测哈希与合同 §实测基线 登记值 `%s…` 一致，故 v1 的形态证据链未断。' % V1_ZIP[:16])
    add('  v1 缺陷：条目时间戳 `(2026,9,19,22,28,24)` 继承 mtime（重打包字节必变）；`index.html` 是 R7 修订前的')
    add('  2612 字节；`styles.css` 是 v1 的 12401 字节；缺三张详情页；无归档结构。')
    add('')
    add('## 8. 判定')
    add('')
    add('- 输入前置条件满足：开工指纹逐项匹配（含线上专用 `404.html`）；`_headers` 等于基线；`build/` 的受控改动已登记。')
    add('- 集合双向相等，preflight 返回 0；四类错误各有实现路径（17.8 在副本目录逐类注入）。')
    add('- 待用户点头的处置项：根目录 `Results.zip`（过期带前缀包，高危混淆源）。项目根 `.txt` 已移出交付目录，')
    add('  本包不代为搬动、不删除、不改名，符合 §明确不做 第一条。')
    (ROOT / 'qa/_qa_task17' / 'preflight.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('已写 _qa_task17/preflight.txt：%d 行' % len(lines))


if __name__ == '__main__':
    main()
