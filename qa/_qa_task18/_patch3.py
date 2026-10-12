# -*- coding: utf-8 -*-
"""一次性补丁 3：三处缺失文件容错 + 重复键非致命 + 探针失败时整页不入事实。用完即删。"""
import io


def load(p):
    return io.open(p, encoding='utf-8').read()


def save(p, s):
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)


def rep(p, pairs):
    s = load(p)
    for a, b, tag in pairs:
        assert a in s, 'MISS %s in %s' % (tag, p)
        s = s.replace(a, b, 1)
    save(p, s)
    print('patched', p, len(pairs))


# ---- 1) 台架：探针某页取不到事实时，整页不写入 facts（让 M5/C0 显式记"无快照"），不放占位对象
rep('qa/_qa_task18/mutate_task18.mjs', [(
    """      let last;
      for (let k = 0; k < 2; k++) { try { facts[page] = await browser.snapOne(ctx.Results, page); last = null; break; } catch (e) { last = e; } }
      if (last) { facts[page] = { __probeError: String(last.message).slice(0, 160) }; }""",
    """      let last = null;
      for (let k = 0; k < 2; k++) { try { facts[page] = await browser.snapOne(ctx.Results, page); last = null; break; } catch (e) { last = e; delete facts[page]; } }
      // 取不到事实就整页缺席：M5 与 C0 会把它记成"无快照 FAIL"，而不是让下游读半截对象崩掉（D3）
      if (last) process.stderr.write('  探针未取到 ' + page + '：' + String(last.message).slice(0, 90) + '\\n');""",
    'probe omit missing page')])

# ---- 2) 核验器：清单登记而磁盘缺失的文件一律走安全读取，M1／A3／J 组不得因 ENOENT 而崩溃
rep('qa/_qa_task18/verify_task18.mjs', [
    ("""const read = (p) => fs.readFileSync(p, 'utf8');
const readBuf = (p) => fs.readFileSync(p);""",
     """const read = (p) => fs.readFileSync(p, 'utf8');
const readBuf = (p) => fs.readFileSync(p);
/* 清单登记而磁盘缺失的文件：以下两个安全读取把"缺失"交给断言判红，绝不让 ENOENT 变成栈（D3） */
const safe = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
const safeBuf = (p) => (fs.existsSync(p) ? fs.readFileSync(p) : null);""",
     'safe readers'),
    ("""    for (const p of HTML_PAGES) {
      const disk = shaLo(readBuf(path.join(RESULTS, p)));
      const snap = (META.perPageSha256 || {})[p];""",
     """    for (const p of HTML_PAGES) {
      const buf = safeBuf(path.join(RESULTS, p));
      const disk = buf ? shaLo(buf) : '<磁盘缺失>';
      const snap = (META.perPageSha256 || {})[p];""",
     'M1 disk guard'),
    ("""      chkEq('M1b/' + p, String((META.perPageBytes || {})[p]), String(fs.statSync(path.join(RESULTS, p)).size), p + ' 快照字节数 == 目录实测', 'Task 18.2');""",
     """      const b2 = safeBuf(path.join(RESULTS, p));
      chkEq('M1b/' + p, String((META.perPageBytes || {})[p]), String(b2 ? b2.length : '<磁盘缺失>'), p + ' 快照字节数 == 目录实测', 'Task 18.2');""",
     'M1b guard'),
    ("""  const utf8bad = PAGE_SET.filter((f) => { const b = readBuf(path.join(RESULTS, f)), t = b.toString('utf8');""",
     """  const utf8bad = PAGE_SET.filter((f) => { const b0 = safeBuf(path.join(RESULTS, f)); if (!b0) return true; const b = b0, t = b.toString('utf8');""",
     'A3 utf8 guard'),
    ("""  const all = MP.map((p) => [p.path, read(path.join(RESULTS, p.path))]);""",
     """  const all = MP.map((p) => [p.path, safe(path.join(RESULTS, p.path))]).filter((e) => e[1] !== null);""",
     'J group all guard'),
])

# ---- 3) src_check：重复键改为"记录并继续"，让 Q1/no-duplicate 真的能判红而不是把整篇丢掉
rep('qa/_qa_task18/src_check.py', [(
    """        if k in fields:
            raise ParseError("重复键：%s" % k)""",
    """        if k in fields:
            # 重复键不是"无法解析"，而是"违约"：记录后继续，交给 Q1/no-duplicate 判红（否则整篇被丢弃，
            # 该判据永远不响，等于把变异吃进解析失败里）
            dup_keys.append("%s=%r" % (k, fields.get(k)))""",
    'dup non-fatal'),
    ("""    fields, seen = {}, []""", """    fields, seen, dup_keys = {}, [], []""", 'dup init'),
    ("""    q1 = {"unknown_keys": [k for k in seen if k not in an.fields],
          "duplicate_keys": len(seen) != len(set(seen)),""",
     """    q1 = {"unknown_keys": [k for k in seen if k not in an.fields],
          "duplicate_keys": dup_keys or (len(seen) != len(set(seen))),""",
    'q1 dup detail'),
    ("""        add("Q1/no-duplicate", s, not q1["duplicate_keys"], "无重复键（键序 %s）" % q1["keys_seen"])""",
     """        add("Q1/no-duplicate", s, not q1["duplicate_keys"], "重复键=%s（键序 %s）" % (q1["duplicate_keys"], q1["keys_seen"]))""",
    'dup detail msg')])
