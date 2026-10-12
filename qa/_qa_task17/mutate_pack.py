#!/usr/bin/env python3
"""Task 17.8 mutation controls: inject 12 violation classes into copy trees.

Every mutation first self-proves that the injected state really is a violation (otherwise a
red assertion may be reacting to the harness rather than to the breach), then requires the
designated assertion to turn red. The real Results/, deploy/ and build/ trees are never the
target: each mutation runs against _qa_task17/mutants/<id>/.
"""

import hashlib
import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'build'))
import build as builder  # noqa: E402
import pack  # noqa: E402

MUTANTS = ROOT / 'qa/_qa_task17' / 'mutants'
COPY_TREE = ('content', 'build', 'deploy', 'Results', 'qa/_qa_task13')
GUARD = ('Results/article-classroom-screen-upgrade.html', 'Results/article-math-to-ai-learning.html',
         'Results/article-school-course-volunteer.html', 'Results/index.html',
         'Results/news-commentary.html', 'Results/news-feature.html', 'Results/news-message.html',
         'Results/script.js', 'Results/styles.css', 'deploy/_headers', 'deploy/site.zip',
         'deploy/manifest.json', 'deploy/UPLOAD.md', 'build/build.py', 'build/shell.html',
         'build/partials/home-intro.html', 'content/columns.md',
         'content/articles/classroom-screen-upgrade.md', 'content/articles/math-to-ai-learning.md',
         'content/articles/school-course-volunteer.md', 'qa/_qa_task13/expected-spec.json',
         'qa/_qa_task13/baseline/index.html', 'qa/_qa_task13/baseline/news-message.html',
         'qa/_qa_task13/baseline/news-feature.html', 'qa/_qa_task13/baseline/news-commentary.html',
         'qa/_qa_task13/baseline/styles.css', 'qa/_qa_task13/baseline/script.js',
         'd9e2b35cb26c98dfbff2d77290cf1f0a.txt')

NEGATIVE_SHA = 'f41b021cf874621da785eaca206c1e324549ced340571da1076303ac10a9b5f3'


def negative_sample():
    """The 2026-09-19 Results.zip located by content hash, so a user rename stays harmless."""
    for candidate in sorted(ROOT.glob('*.zip')):
        if sha(candidate) == NEGATIVE_SHA:
            return candidate
    return ROOT / 'Results.zip'


def guard_names():
    sample = negative_sample()
    extra = [sample.relative_to(ROOT).as_posix()] if sample.is_file() else []
    return list(GUARD) + extra

ROWS = []
NEGATIVE = {}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def fingerprint():
    return {rel: ((ROOT / rel).stat().st_size, sha(ROOT / rel)) for rel in guard_names()
            if (ROOT / rel).is_file()}


def record(mid, name, self_proof, caught, detail):
    ROWS.append((mid, name, self_proof, caught, detail))


def new_mutant(mid):
    target = MUTANTS / mid
    if target.exists():
        shutil.rmtree(str(target))
    target.mkdir(parents=True)
    for rel in COPY_TREE:
        src = ROOT / rel
        dest = target / rel
        if src.is_dir():
            shutil.copytree(str(src), str(dest), ignore=shutil.ignore_patterns('__pycache__'))
        else:
            shutil.copy2(str(src), str(dest))
    (target / 'deploy' / 'site.zip').unlink(missing_ok=True)
    return target


def manifest_of(mutant):
    path = mutant / 'deploy' / 'manifest.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else None


def fresh_manifest(mutant):
    result = pack.run_preflight(mutant)
    sources = pack.collect_sources(mutant, result['page_set']['names'])
    return pack.build_manifest(mutant, result, sources), result, sources


def expect_pack_fail(call, needle, code=None):
    try:
        rc = call()
    except pack.PackFail as failure:
        hit = needle in failure.message and (code is None or failure.code == code)
        return hit, '退出码 %d｜%s' % (failure.code, failure.message[:260])
    except builder.Fail as failure:
        return False, '构建器 Fail（码 %d）：%s' % (failure.code, failure.rendered[:200])
    except Exception as error:  # noqa: BLE001  harness must report any unexpected shape
        return False, '意外异常 %s：%s' % (type(error).__name__, str(error)[:200])
    return False, '未翻红（返回 %r）' % (rc,)


def expect_fails(fails, needle):
    joined = '；'.join(fails)
    return needle in joined, joined[:260]


def command_all(mutant):
    return lambda: pack.command_all(mutant)


def command_verify(mutant):
    return lambda: pack.command_verify(mutant)


def m01_missing_article():
    mutant = new_mutant('m01')
    victim = mutant / 'Results' / 'article-math-to-ai-learning.html'
    before = victim.is_file()
    victim.unlink()
    self_proof = before and not victim.exists()
    caught, detail = expect_pack_fail(lambda: pack.run_preflight(mutant), '缺文件', pack.EXIT_INPUT)
    record('1', '删掉一个详情页 → preflight 缺文件红', self_proof, caught, detail)


def m02a_stray_txt():
    mutant = new_mutant('02a')
    stray = mutant / 'Results' / 'notes.txt'
    stray.write_text('个人备注，不属于交付集合\n', encoding='utf-8')
    self_proof = stray.is_file() and 'notes.txt' not in pack.derive_page_set(mutant)['names']
    caught, detail = expect_pack_fail(lambda: pack.run_preflight(mutant), '清单外文件', pack.EXIT_STRAY)
    notice = pack.STRAY_NOTICE in detail
    record('2a', 'Results/ 放 notes.txt → 退出码 4 并点名', self_proof, caught and notice,
           '%s｜含"请勿删除"提示=%s' % (detail, notice))


def m02b_stray_headers():
    mutant = new_mutant('02b')
    copy = mutant / 'Results' / '_headers'
    shutil.copy2(str(mutant / 'deploy' / '_headers'), str(copy))
    self_proof = copy.is_file() and (ROOT / 'deploy' / '_headers').read_bytes() == copy.read_bytes()
    caught, detail = expect_pack_fail(lambda: pack.run_preflight(mutant), '清单外文件：Results/_headers',
                                      pack.EXIT_STRAY)
    both = 'zip 要求 _headers 在场于 deploy/' in detail
    record('2b', 'Results/ 放名为 _headers 的文件 → 同样退出码 4', self_proof, caught and both,
           '%s｜点名"只进包不进 Results/"=%s' % (detail, both))


def m03_subdir():
    mutant = new_mutant('m03')
    nested = mutant / 'Results' / 'articles' / 'article-notes-page.html'
    nested.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(str(mutant / 'Results' / 'index.html'), str(nested))
    self_proof = nested.is_file()
    caught, detail = expect_pack_fail(lambda: pack.run_preflight(mutant), '子目录：Results/articles/',
                                      pack.EXIT_STRAY)
    record('3', '创建 Results/articles/ 并放入一页 → 子目录错误', self_proof, caught, detail)


def m04_case():
    mutant = new_mutant('m04')
    target = mutant / 'Results' / 'styles.css'
    holder = mutant / 'Results' / '__case_holder.tmp'
    shutil.move(str(target), str(holder))
    shutil.move(str(holder), str(mutant / 'Results' / 'Styles.css'))
    listed = sorted(p.name for p in (mutant / 'Results').iterdir())
    self_proof = 'Styles.css' in listed and 'styles.css' not in listed
    caught, detail = expect_pack_fail(lambda: pack.run_preflight(mutant), '大小写不符：Results/Styles.css',
                                      pack.EXIT_STRAY)
    record('4', 'styles.css 改名 Styles.css → 大小写错误', self_proof, caught,
           '目录列举=%s｜%s' % ('、'.join(n for n in listed if 'tyles' in n.lower()), detail))


def m05_results_zip_as_package():
    target = negative_sample()
    manifest, _, _ = fresh_manifest(ROOT)
    fails = pack.unpack_compare(target, ROOT, manifest, pack.derive_page_set(ROOT)['names'])
    joined = '\n'.join(fails)
    NEGATIVE['fails'] = fails
    classes = {
        '目录条目': 'zip 含目录条目' in joined,
        'Results/ 前缀': '条目名含路径分隔符或目录前缀' in joined and 'Results/index.html' in joined,
        '旧 CSS 哈希不符': any('styles.css 解包实测' in f and '≠ 清单承诺' in f for f in fails),
        '缺 _headers': '_headers 不在包内' in joined,
        '文件条目数不符': '文件条目数' in joined,
    }
    NEGATIVE['classes'] = classes
    with zipfile.ZipFile(str(target)) as archive:
        infos = archive.infolist()
        css = archive.read('Results/styles.css')
    self_proof = (any(i.is_dir() for i in infos)
                  and all(i.filename.startswith('Results/') for i in infos if not i.is_dir())
                  and not any(i.filename in ('_headers', 'Results/_headers') for i in infos)
                  and len(css) != (ROOT / 'Results' / 'styles.css').stat().st_size)
    record('5', '用 Results.zip 当包体跑回验 → 五类失败逐项命中', bool(self_proof), all(classes.values()),
           '命中 %d 条失败；五类判定=%s' % (len(fails), classes))


def m06_missing_headers():
    mutant = new_mutant('m06')
    names = pack.derive_page_set(mutant)['names']
    zip_path = mutant / 'deploy' / 'site.zip'
    pack.write_zip(zip_path, mutant, names)
    manifest, _, _ = fresh_manifest(mutant)
    self_proof = '_headers' not in [Path(n).name for n in zipfile.ZipFile(str(zip_path)).namelist()]
    caught, detail = expect_fails(pack.unpack_compare(zip_path, mutant, manifest, names), '合同6(d)')
    record('6', '打包漏掉 _headers → 回验 (d) 红', self_proof, caught, detail)


def m07_mtime_timestamp():
    mutant = new_mutant('m07')
    names = pack.package_names(pack.derive_page_set(mutant)['names'])
    manifest, _, _ = fresh_manifest(mutant)
    zip_path = mutant / 'deploy' / 'site.zip'
    pack.write_zip(zip_path, mutant, names, date_time=None)
    with zipfile.ZipFile(str(zip_path)) as archive:
        stamps = sorted({i.date_time for i in archive.infolist()})
    self_proof = pack.ZIP_DATE_TIME not in stamps
    caught_stamp, detail_stamp = expect_fails(pack.unpack_compare(zip_path, mutant, manifest, names),
                                              '未固定为 (1980, 1, 1, 0, 0, 0)')
    first = pack.pack_hash(mutant, names, date_time=None)
    touched = mutant / 'Results' / 'index.html'
    os.utime(str(touched), ns=(touched.stat().st_atime_ns, touched.stat().st_mtime_ns + 86400 * 10 ** 9))
    second = pack.pack_hash(mutant, names, date_time=None)
    nonrepro = first != second
    fixed = pack.pack_hash(mutant, names) == pack.pack_hash(mutant, names)
    record('7', '时间戳继承 mtime → 可复现性红', self_proof and nonrepro, caught_stamp,
           '继承 mtime 时改一次 mtime 包字节就变（%s≠%s）；固定时间戳同样改 mtime 后仍相等=%s｜%s'
           % (first[:10], second[:10], fixed, detail_stamp[:150]))


def m08_manifest_into_zip():
    mutant = new_mutant('m08')
    names = pack.package_names(pack.derive_page_set(mutant)['names'])
    manifest, _, _ = fresh_manifest(mutant)
    zip_path = mutant / 'deploy' / 'site.zip'
    pack.write_zip(zip_path, mutant, names)
    with zipfile.ZipFile(str(zip_path), 'a') as archive:
        archive.write(str(mutant / 'deploy' / 'manifest.json'), 'manifest.json')
    self_proof = 'manifest.json' in zipfile.ZipFile(str(zip_path)).namelist()
    caught, detail = expect_fails(pack.unpack_compare(zip_path, mutant, manifest, names), '合同4：zip 含禁止条目')
    record('8', '把 manifest.json 塞进 zip → 集合红', self_proof, caught, detail)


def m09_tampered_sha():
    mutant = new_mutant('m09')
    manifest = manifest_of(mutant)
    victim = manifest['pages'][0]
    original = victim['sha256']
    victim['sha256'] = ('0' * 8 if original[0] != '0' else '1' * 8) + original[8:]
    result = pack.classify_collection(mutant)
    sources = pack.collect_sources(mutant, result['page_set']['names'])
    caught, detail = expect_fails(
        pack.check_manifest(mutant, manifest, sources, result['page_set']['names']), '与磁盘实测')
    zip_path = mutant / 'deploy' / 'site.zip'
    pack.write_zip(zip_path, mutant, pack.package_names(result['page_set']['names']))
    caught_zip, detail_zip = expect_fails(
        pack.unpack_compare(zip_path, mutant, manifest, result['page_set']['names']), '合同6(b)')
    self_proof = victim['sha256'] != original and len(victim['sha256']) == 64
    record('9', '篡改某个 sha256 → 与实测不符红', self_proof, caught and caught_zip,
           '%s｜%s' % (detail[:160], detail_zip[:110]))


def m10_date_in_manifest():
    mutant = new_mutant('m10')
    pack.command_all(mutant)
    manifest = manifest_of(mutant)
    manifest['pages'][0]['date'] = '2026-09-18'
    (mutant / 'deploy' / 'manifest.json').write_bytes(pack.serialize_manifest(manifest))
    text = (mutant / 'deploy' / 'manifest.json').read_text(encoding='utf-8')
    self_proof = '"date": "2026-09-18"' in text
    result = pack.classify_collection(mutant)
    sources = pack.collect_sources(mutant, result['page_set']['names'])
    caught_scan, detail_scan = expect_fails(
        pack.check_manifest(mutant, manifest, sources, result['page_set']['names'],
                           pack.content_date_values(result['page_set'])), 'date／display_date／end_date 字段')
    caught_iso = 'ISO 日期串 2026-09-18' in detail_scan
    caught_verify, detail_verify = expect_pack_fail(command_verify(mutant), 'date／display_date／end_date 字段',
                                                    pack.EXIT_VERIFY)
    record('10', 'manifest 写入 date: 2026-09-18 → R5① 扫描红', self_proof,
           bool(caught_scan and caught_iso and caught_verify),
           '%s｜verify 也拒：%s' % (detail_scan[:170], detail_verify[:110]))


def m11_column_order_swapped():
    mutant = new_mutant('m11')
    page = mutant / 'Results' / 'news-message.html'
    text = page.read_text(encoding='utf-8')
    first, second = 'article-school-course-volunteer.html', 'article-math-to-ai-learning.html'
    blocks = re.findall(r'      <li class="entry-list__item">\n.*?\n      </li>', text, re.S)
    extra = blocks[0].replace(first, second)
    page.write_bytes((text.replace(blocks[0], blocks[0] + '\n' + extra, 1)).encode('utf-8'))
    shown = pack.list_page_order(mutant, 'news-message.html')
    result = pack.classify_collection(mutant)
    sources = pack.collect_sources(mutant, result['page_set']['names'])
    manifest = pack.build_manifest(mutant, result, sources)

    def entry(name):
        return {'slug': name[len('article-'):-len('.html')], 'page': name, 'title': '变异条目'}

    manifest['columns'][0]['articles'] = [entry(second), entry(first)]
    self_proof = shown == [first, second] and [a['page'] for a in manifest['columns'][0]['articles']] == [second, first]
    caught, detail = expect_fails(
        pack.check_manifest(mutant, manifest, sources, result['page_set']['names']), '契约3')
    record('11', 'columns.articles 顺序与列表页实际条目顺序交换 → 一致性红',
           bool(self_proof), caught, '页面实际 %s vs 清单声明 %s｜%s' % (shown, [second, first], detail[:170]))


def m12_split_state():
    mutant = new_mutant('m12')
    pack.command_all(mutant)
    manifest = manifest_of(mutant)
    removed = manifest['pages'].pop(0)
    (mutant / 'deploy' / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n',
                                                     encoding='utf-8')
    self_proof = (mutant / 'deploy' / 'site.zip').is_file() and removed['path'] not in [
        p['path'] for p in manifest['pages']]
    caught, detail = expect_pack_fail(command_verify(mutant), '分裂', None)
    if not caught:
        caught, detail = expect_pack_fail(command_verify(mutant), '文件条目数', pack.EXIT_VERIFY)
    record('12', '只改 manifest 不重打包 → zip 与 manifest 集合比较红', bool(self_proof), caught,
           '删掉的条目=%s｜%s' % (removed['path'], detail[:220]))


def main():
    start = fingerprint()
    if MUTANTS.exists():
        shutil.rmtree(str(MUTANTS))
    MUTANTS.mkdir(parents=True)
    for step in (m01_missing_article, m02a_stray_txt, m02b_stray_headers, m03_subdir, m04_case,
                 m05_results_zip_as_package, m06_missing_headers, m07_mtime_timestamp,
                 m08_manifest_into_zip, m09_tampered_sha, m10_date_in_manifest,
                 m11_column_order_swapped, m12_split_state):
        try:
            step()
        except Exception as error:  # noqa: BLE001
            record(step.__name__, 'harness 异常', False, False, '%s：%s' % (type(error).__name__, error))
    end = fingerprint()
    drift = [rel for rel in end if end[rel] != start[rel]]
    print('| # | 变异 | 自证确实违约 | 指定断言翻红 | 证据 |')
    print('| --- | --- | --- | --- | --- |')
    for mid, name, self_proof, caught, detail in ROWS:
        print('| %s | %s | %s | %s | %s |' % (mid, name, '是' if self_proof else '否',
                                            '红（正确）' if caught else '未捕获（缺陷）', detail))
    caught_all = sum(1 for r in ROWS if r[3])
    print('')
    print('## 17.6 反面样本 Results.zip 逐条失败（%d 条，五类判定=%s）'
          % (len(NEGATIVE.get('fails', [])), NEGATIVE.get('classes')))
    for line in NEGATIVE.get('fails', []):
        print('- %s' % line)
    print('')
    print('捕获 %d／%d；真实树 %d 项指纹在变异前后%s'
          % (caught_all, len(ROWS), len(end), '未变' if not drift else '发生变化：%s（缺陷）' % drift))
    if drift:
        for rel in drift:
            print('  %s %s → %s' % (rel, start[rel], end[rel]))
    return 0 if caught_all == len(ROWS) and not drift else 1


if __name__ == '__main__':
    sys.exit(main())
