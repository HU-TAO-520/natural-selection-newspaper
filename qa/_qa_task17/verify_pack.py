#!/usr/bin/env python3
"""Task 17.5/17.6 independent re-verification of deploy artefacts.

This is the QA chain. It deliberately does NOT import build/pack.py: it reads
deploy/manifest.json and deploy/site.zip back from disk with zipfile + hashlib and
re-derives the page set from build/build.py only. Reproducibility is proven by running
the packer again in a fresh subprocess and comparing bytes, never by trusting pack.py's
own self-report.
"""

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'build'))
import build as builder  # noqa: E402  page-set authority only

HEADERS_BASELINE = 'b0273f2ff60c2c95d24899b8bd8a72ae050d233bc38e8b9903a28421d6f9ba7a'
ZIP_STAMP = (1980, 1, 1, 0, 0, 0)
STRAY_NAME = 'd9e2b35cb26c98dfbff2d77290cf1f0a.txt'
NEGATIVE_SHA = 'f41b021cf874621da785eaca206c1e324549ced340571da1076303ac10a9b5f3'


def negative_sample():
    """The 2026-09-19 Results.zip, found by content hash so a rename by the user keeps reruns alive."""
    for candidate in sorted(ROOT.glob('*.zip')):
        if sha(candidate) == NEGATIVE_SHA:
            return candidate
    return ROOT / 'Results.zip'
ENTRY_LINK_ATTR = 'class="entry-list__link" href="'
FRONT_MATTER_RE = re.compile(rb'^(slug|column|title|byline|date|display_date|end_date|order):')
ISO_RE = re.compile(r'\d{4}-\d{2}-\d{2}')
YEAR_RE = re.compile(r'(19|20)\d{2}')
DATE_KEY_RE = re.compile(r'"(?:date|display_date|end_date)"\s*:')

FINGERPRINT = [
    'Results/article-classroom-screen-upgrade.html', 'Results/article-math-to-ai-learning.html',
    'Results/article-school-course-volunteer.html', 'Results/404.html', 'Results/index.html', 'Results/news-commentary.html',
    'Results/news-feature.html', 'Results/news-message.html', 'Results/script.js', 'Results/styles.css',
    'deploy/_headers', 'build/build.py', 'build/shell.html', 'build/partials/home-intro.html',
    'content/columns.md', 'content/_模板.md', 'content/articles/classroom-screen-upgrade.md',
    'content/articles/math-to-ai-learning.md', 'content/articles/school-course-volunteer.md',
    'qa/_qa_task13/baseline/index.html', 'qa/_qa_task13/baseline/news-message.html',
    'qa/_qa_task13/baseline/news-feature.html', 'qa/_qa_task13/baseline/news-commentary.html',
    'qa/_qa_task13/baseline/styles.css', 'qa/_qa_task13/baseline/script.js',
    'qa/_qa_task13/expected-spec.json', STRAY_NAME,
]

ROWS = []


def check(group, name, ok, detail=''):
    ROWS.append((group, name, 'PASS' if ok else 'FAIL', detail))
    return bool(ok)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def measure(rel):
    data = (ROOT / rel).read_bytes()
    return len(data), hashlib.sha256(data).hexdigest()


def fingerprint():
    rels = list(FINGERPRINT)
    sample = negative_sample()
    if sample.is_file():
        rels.append(sample.relative_to(ROOT).as_posix())
    out = {}
    for rel in rels:
        path = ROOT / rel
        out[rel] = (path.stat().st_size, sha(path)) if path.is_file() else None
    return out


def page_authority():
    built = builder.build_pages(ROOT)
    names = sorted(set(built['pages']) | set(builder.FOREIGN_ALLOWED))
    return built, names


def kind(path):
    if path == '_headers':
        return '配置（只进包，不进 Results/）'
    return '页面' if path.endswith('.html') else '资源'


def list_page_links(list_page):
    text = (ROOT / 'Results' / list_page).read_text(encoding='utf-8')
    return [chunk.split('"', 1)[0] for chunk in text.split(ENTRY_LINK_ATTR)[1:]]


def group_A(built, names):
    disk = sorted(p.name for p in (ROOT / 'Results').iterdir() if p.is_file())
    dirs = sorted(p.name for p in (ROOT / 'Results').iterdir() if p.is_dir())
    check('A', 'A1/集合双向相等', disk == names and not dirs,
          '磁盘 %d／期望 %d／子目录 %s' % (len(disk), len(names), dirs or '无'))
    drift = [n for n in sorted(built['pages']) if (ROOT / 'Results' / n).read_bytes() != built['pages'][n]]
    check('A', 'A2/装配出口字节==磁盘', not drift, '漂移 %s' % (drift or '无'))
    pack_src = (ROOT / 'build' / 'pack.py').read_text(encoding='utf-8')
    body = pack_src.split('def derive_page_set', 1)[1].split('\ndef ', 1)[0]
    wild = [t for t in ('glob(', 'iglob', 'iterdir', 'listdir', 'scandir') if t in body]
    check('A', 'A3/页集合来自构建器非目录通配', not wild and 'build_pages' in body,
          'derive_page_set 内通配 token=%s，含 build_pages=%s' % (wild or '无', 'build_pages' in body))
    check('A', 'A4/Results 无部署期文件', not {'manifest.json', 'UPLOAD.md', 'site.zip', '_headers'} & set(disk),
          '、'.join(sorted({'manifest.json', 'UPLOAD.md', 'site.zip', '_headers'} & set(disk))) or '干净')
    deploy = sorted(p.name for p in (ROOT / 'deploy').iterdir())
    check('A', 'A5/deploy 恰四文件', deploy == ['UPLOAD.md', '_headers', 'manifest.json', 'site.zip'], str(deploy))


def group_M(manifest, names):
    check('M', 'M1/顶层键序与 schema', list(manifest.keys()) == ['schema', 'columns', 'pages', 'config', 'counts']
          and manifest['schema'] == 1, str(list(manifest.keys())))
    paths = [p['path'] for p in manifest['pages']]
    check('M', 'M2/pages==交付集合且字典序', paths == sorted(names), str(paths))
    bad = []
    for entry in manifest['pages']:
        if (entry['bytes'], entry['sha256']) != measure('Results/' + entry['path']):
            bad.append(entry['path'])
    check('M', 'M3/pages 逐项 bytes+sha256==磁盘实测', not bad,
          '、'.join(bad) or '%d/%d 相等' % (len(manifest['pages']), len(manifest['pages'])))
    check('M', 'M4/config 仅 _headers', [c['path'] for c in manifest['config']] == ['_headers']
          and (manifest['config'][0]['bytes'], manifest['config'][0]['sha256']) == measure('deploy/_headers')
          and manifest['config'][0]['sha256'] == HEADERS_BASELINE)
    banned = {'manifest.json', 'UPLOAD.md', 'site.zip'} & set(paths)
    check('M', 'M5/部署期文件不在 pages', not banned, str(sorted(banned)) if banned else '无')
    registry = builder.load_registry(ROOT)
    if check('M', 'M6/columns 三栏与注册表等长',
             len(manifest['columns']) == len(registry)
             and [(c['key'], c['label'], c['list']) for c in manifest['columns']]
             == [(r.key, r.label, r.list_page) for r in registry]):
        mismatch = []
        for column in manifest['columns']:
            actual = list_page_links(column['list'])
            declared = [a['page'] for a in column['articles']]
            if actual != declared:
                mismatch.append('%s：%s≠%s' % (column['key'], declared, actual))
            for article, href in zip(column['articles'], actual):
                if article['slug'] not in href:
                    mismatch.append('%s slug 未编码进 %s' % (article['slug'], href))
        check('M', 'M7/articles 顺序==列表页实际条目顺序', not mismatch, '；'.join(mismatch) or '三栏一致')
    counts = manifest['counts']
    n = counts['articles']
    check('M', 'M8/counts 四式独立成立',
          counts['pages'] == len(manifest['pages']) == 7 + n
          and counts['html'] == len([p for p in paths if p.endswith('.html')]) == counts['pages'] - 2
          and counts['config'] == len(manifest['config']) == 1
          and n == sum(len(c['articles']) for c in manifest['columns']),
          'counts=%s（交付 7+N=%d，zip 条目 8+N=%d，HTML 5+N=%d）'
          % (counts, 7 + n, 8 + n, 5 + n))
    raw = (ROOT / 'deploy' / 'manifest.json').read_bytes()
    check('M', 'M9/字节形态 UTF-8无BOM LF 两空格缩进',
          not raw.startswith(b'\xef\xbb\xbf') and b'\r' not in raw and b'\t' not in raw
          and raw.endswith(b'\n') and not raw.endswith(b'\n\n')
          and raw.decode('utf-8').split('\n')[1].startswith('  "schema"'),
          '%d 字节' % len(raw))


def zip_form(zip_path, manifest):
    """Return (failures-by-class dict, entry list). Used for both the real package and Results.zip."""
    found = {}
    with zipfile.ZipFile(str(zip_path)) as archive:
        infos = archive.infolist()
    dir_entries = [i.filename for i in infos if i.is_dir() or i.filename.endswith('/')]
    files = [i for i in infos if not (i.is_dir() or i.filename.endswith('/'))]
    names = [i.filename for i in files]
    found['目录条目'] = dir_entries
    found['前缀或分隔符'] = sorted(n for n in names if '/' in n or '\\' in n)
    expected = sorted(set([p['path'] for p in manifest['pages']]) | set(
        c['path'] for c in manifest['config']))
    found['集合不符'] = sorted(set(expected) ^ set(names))
    found['条目数'] = (len(names), len(expected))
    found['缺_headers'] = '_headers' not in [Path(n).name for n in names]
    found['禁止条目'] = sorted(n for n in names
                          if Path(n).name in ('manifest.json', 'UPLOAD.md', 'site.zip')
                          or n.endswith('.txt') or '__pycache__' in n)
    found['时间戳'] = sorted({i.date_time for i in files})
    found['压缩方式'] = sorted({i.compress_type for i in files})
    found['extra或comment'] = sorted(i.filename for i in files if i.extra or i.comment)
    found['顺序未排序'] = names != sorted(names)
    return found, files, infos


def unpack_and_compare(zip_path, manifest):
    """Extract to a fresh temp dir and compare each entry against disk and manifest (bytes AND sha).

    Entries with a path prefix are still content-compared under their basename, so a bad-form
    package also yields the per-file hash evidence (needed for the Results.zip negative sample).
    """
    bad = []
    with zipfile.ZipFile(str(zip_path)) as archive:
        stage = Path(tempfile.mkdtemp(prefix='qa17-'))
        try:
            for info in archive.infolist():
                if info.is_dir() or info.filename.endswith('/'):
                    continue
                bare = Path(info.filename).name
                if bare != info.filename:
                    bad.append('%s：条目名带路径分隔符或目录前缀' % info.filename)
                target = stage / bare
                with open(str(target), 'wb') as handle:
                    handle.write(archive.read(info))
                extracted = (target.stat().st_size, sha(target))
                entry = next((e for e in manifest['pages'] + manifest['config']
                              if e['path'] == bare), None)
                if entry is None:
                    bad.append('%s：不在清单内' % bare)
                    continue
                if extracted != (entry['bytes'], entry['sha256']):
                    bad.append('%s：解包 %s/%s ≠ 清单 %s/%s' % (bare, extracted[0], extracted[1][:8],
                                                             entry['bytes'], entry['sha256'][:8]))
                    continue
                source = 'deploy/_headers' if bare == '_headers' else 'Results/' + bare
                if not (ROOT / source).is_file():
                    bad.append('%s：源文件缺失' % source)
                elif extracted != measure(source):
                    bad.append('%s：解包 ≠ 磁盘源实测' % bare)
        finally:
            import shutil
            shutil.rmtree(str(stage), ignore_errors=True)
    return bad


def group_Z(manifest, names):
    zip_path = ROOT / 'deploy' / 'site.zip'
    found, files, infos = zip_form(zip_path, manifest)
    check('Z', 'Z1/0 目录条目', not found['目录条目'], str(found['目录条目']))
    check('Z', 'Z2/0 含分隔符条目名', not found['前缀或分隔符'], str(found['前缀或分隔符']))
    check('Z', 'Z3/文件条目集合==pages∪config', not found['集合不符'], str(found['集合不符']))
    check('Z', 'Z4/条目数==counts.pages+config', found['条目数'][0] == found['条目数'][1],
          'zip %d vs 期望 %d' % found['条目数'])
    check('Z', 'Z5/无禁止条目', not found['禁止条目'], str(found['禁止条目']))
    check('Z', 'Z6/_headers 在场且==基线', not found['缺_headers']
          and manifest['config'][0]['sha256'] == HEADERS_BASELINE)
    check('Z', 'Z7/时间戳固定为常量', found['时间戳'] == [ZIP_STAMP], str(found['时间戳']))
    check('Z', 'Z8/全部 ZIP_DEFLATED', found['压缩方式'] == [zipfile.ZIP_DEFLATED], str(found['压缩方式']))
    check('Z', 'Z9/无 extra／comment', not found['extra或comment'], str(found['extra或comment']))
    check('Z', 'Z10/条目顺序为 sorted(名)', not found['顺序未排序'])
    check('Z', 'Z11/create_system 与 external_attr 统一',
          len({i.create_system for i in files}) == 1 and len({i.external_attr for i in files}) == 1,
          'cs=%s ext=%s' % ({i.create_system for i in files}, {i.external_attr for i in files}))
    bad = unpack_and_compare(zip_path, manifest)
    n_entries = found['条目数'][0]
    check('Z', 'Z12/逐条目 SHA-256 与字节数三方相等（zip／磁盘源／清单）', not bad,
          '；'.join(bad) or '%d/%d 相等' % (n_entries, n_entries))


def group_R(manifest):
    size, digest = measure('deploy/site.zip')
    msize, mdigest = measure('deploy/manifest.json')
    upath = ROOT / 'deploy' / 'UPLOAD.md'
    usize, udigest = measure('deploy/UPLOAD.md')
    env_full = dict(os.environ)
    env_full['PYTHONIOENCODING'] = 'utf-8'
    env_full['PYTHONDONTWRITEBYTECODE'] = '1'
    same = True
    for _ in range(2):
        done = subprocess.run([sys.executable, str(ROOT / 'build' / 'pack.py'), 'all'],
                              cwd=str(ROOT), env=env_full, capture_output=True)
        if done.returncode != 0:
            check('R', 'R1/重跑 pack.py all 退出码', False, done.stderr.decode('utf-8', 'replace')[:200])
            return
        same = same and measure('deploy/site.zip') == (size, digest)
        same = same and measure('deploy/manifest.json') == (msize, mdigest)
        same = same and measure('deploy/UPLOAD.md') == (usize, udigest)
    check('R', 'R1/连续两次重跑：三产物 SHA-256 全等（可复现）', same,
          'site.zip=%s… manifest=%s… UPLOAD=%s…' % (digest[:12], mdigest[:12], udigest[:12]))
    with zipfile.ZipFile(str(ROOT / 'deploy' / 'site.zip')) as archive:
        stamps = sorted({i.date_time for i in archive.infolist()})
    check('R', 'R2/时间戳不继承 mtime', stamps == [ZIP_STAMP], str(stamps))


def group_D(manifest):
    raw_manifest = (ROOT / 'deploy' / 'manifest.json').read_text(encoding='utf-8')
    upload = (ROOT / 'deploy' / 'UPLOAD.md').read_text(encoding='utf-8')
    built = builder.build_pages(ROOT)
    date_values = sorted({v for a in built['ordered'] for v in (a.date, a.display_date, a.end_date) if v})
    problems = []
    for label, text in (('manifest.json', raw_manifest), ('UPLOAD.md', upload)):
        stripped = re.sub(r'[0-9a-f]{16,}', '', text)
        if DATE_KEY_RE.search(text):
            problems.append('%s 含 date 字段名' % label)
        if ISO_RE.search(stripped):
            problems.append('%s 含 ISO 日期串' % label)
        if re.search(r'[0-2]?\d:[0-5]\d', stripped):
            problems.append('%s 含时间戳形态' % label)
        if re.search(r'[A-Za-z]:[\\/]', stripped):
            problems.append('%s 含机器路径' % label)
        for value in date_values:
            if value in stripped:
                problems.append('%s 泄漏内容源日期值 %s' % (label, value))
    for value in (v for e in manifest['pages'] + manifest['config'] for v in e.values() if isinstance(v, str)):
        if not re.fullmatch(r'[0-9a-f]{64}', value) and YEAR_RE.search(value):
            problems.append('manifest 字符串值含四位年份 %s' % value)
    with zipfile.ZipFile(str(ROOT / 'deploy' / 'site.zip')) as archive:
        names = archive.namelist()
        contents = {n: archive.read(n) for n in names}
    for name in names:
        if ISO_RE.search(name) or YEAR_RE.search(Path(name).stem):
            problems.append('zip 条目名含日期形态 %s' % name)
    for name, data in contents.items():
        text = data.decode('utf-8', 'replace')
        if ISO_RE.search(text):
            problems.append('zip 内 %s 含 ISO 日期串' % name)
        if YEAR_RE.search(re.sub(r'[0-9a-f]{16,}', '', text)):
            problems.append('zip 内 %s 含四位年份' % name)
        if any(FRONT_MATTER_RE.match(line.encode()) for line in text.split('\n')):
            problems.append('zip 内 %s 含 front-matter 键行' % name)
    check('D', 'D1/manifest+UPLOAD+zip 日期扫描命中 0', not problems, '；'.join(problems) or '命中 0')
    check('D', 'D2/内容源日期值清单（比对基准）', bool(date_values), '、'.join(date_values))


def group_U(manifest):
    upload = (ROOT / 'deploy' / 'UPLOAD.md').read_text(encoding='utf-8')
    lines = upload.split('\n')
    counts = manifest['counts']
    entries = counts['pages'] + counts['config']
    size, digest = measure('deploy/site.zip')
    need = [
        '| 交付文件数 `7 + N` | `Results/` 内要交付的文件（含线上专用 `404.html`），N 为详情页篇数 | %d |' % counts['pages'],
        '| zip 文件条目数 `8 + N` | `deploy/site.zip` 内的文件条目，含只进包不进 `Results/` 的 `_headers` | %d |' % entries,
        '| 站点 HTML 页面数 `5 + N` | 站点页面数（含线上专用 `404.html`）；Pages 后台的 "Pages" 计数只数 HTML | %d |' % counts['html'],
        '`%s`' % digest,
        '%d 字节' % size,
        '- N = %d（内容源文章数，即详情页张数）' % counts['articles'],
    ]
    missing = [x for x in need if not any(x in line for line in lines)]
    check('U', 'U1/三个数字与包哈希由 counts／实测值生成且一致', not missing, '；'.join(missing) or '6 行全在')
    rows = [line for line in lines if line.startswith('| `')]
    want = ['| `%s` | %s | %d | `%s` |' % (e['path'], kind(e['path']), e['bytes'], e['sha256'][:16])
            for e in sorted(manifest['pages'] + manifest['config'], key=lambda x: x['path'])]
    with zipfile.ZipFile(str(ROOT / 'deploy' / 'site.zip')) as archive:
        order = archive.namelist()
    check('U', 'U2/清单逐项路径+哈希前16位，按字典序且与 zip 同序',
          rows == want and [w.split('`')[1] for w in want] == order,
          '表 %d 行 vs zip %d 条目；首个条目 %s' % (len(rows), len(order), order[0]))
    n = counts['articles']
    check('U', 'U3/人工可读：三数各 7+N／8+N／5+N（由 N 推导，不钉死篇数）',
          counts['pages'] == 7 + n and entries == 8 + n and counts['html'] == 5 + n,
          'N=%d → 交付 %d／zip 条目 %d／HTML %d' % (n, counts['pages'], entries, counts['html']))
    check('U', 'U4/关闭项与手工上传前提在文', all(k in upload for k in
          ('Auto-Minify', 'Rocket Loader', 'Bot Fight Mode', '.pages.dev', '上传成功清单')), '')


def group_N(manifest):
    sample = negative_sample()
    found, files, infos = zip_form(sample, manifest)
    hit = {}
    hit['目录条目'] = bool(found['目录条目'])
    hit['Results/ 前缀'] = bool([n for n in found['前缀或分隔符'] if n.startswith('Results/')])
    hit['缺 _headers'] = found['缺_headers']
    hit['文件条目数不符'] = found['条目数'][0] != found['条目数'][1]
    bad = unpack_and_compare(sample, manifest)
    hit['哈希或字节与当前源不符'] = bool([b for b in bad if '解包' in b])
    css = [b for b in bad if 'styles.css' in b]
    with zipfile.ZipFile(str(sample)) as archive:
        css_data = archive.read('Results/styles.css')
    hit['含旧版 styles.css'] = (len(css_data), hashlib.sha256(css_data).hexdigest()) != measure('Results/styles.css')
    for label, ok in hit.items():
        check('N', 'N/%s 被形态检查命中' % label, ok, '')
    check('N', 'N/旧 CSS 尺寸实测 12062（早于 v1 的 12401）', len(css_data) == 12062,
          '包内 %d B，当前源 %d B；回验命中：%s' % (len(css_data), measure('Results/styles.css')[0], bool(css)))
    check('N', 'N/时间戳与压缩方式同样被判红', found['时间戳'] != [ZIP_STAMP] or found['压缩方式'] != [8],
          '时间戳 %s，压缩 %s' % (found['时间戳'], found['压缩方式']))
    return hit


def group_X():
    src = (ROOT / 'build' / 'pack.py').read_text(encoding='utf-8')
    tokens = ('cloudflare', 'requests', 'urllib', 'socket', 'http://', 'https://', 'subprocess',
              'os.rename', '.rename(', 'shutil.move', 'os.remove', 'os.replace')
    present = [t for t in tokens if t in src]
    check('X', 'X1/无上传／无网络／无外部服务调用', not present, str(present))
    write_lines = [line.strip() for line in src.split('\n')
                   if re.search(r'write_bytes\(|write_text\(|open\(', line)]
    offenders = [line for line in write_lines if 'Results' in line or 'RESULTS' in line]
    check('X', 'X2/写盘语句不指向 Results/', not offenders,
          '%d 条写盘语句；指向 Results 的：%s' % (len(write_lines), offenders or '无'))
    consts = re.findall(r"^(MANIFEST_REL|ZIP_REL|UPLOAD_REL|HEADERS_REL) = '([^']+)'", src, re.MULTILINE)
    check('X', 'X3/四个部署期路径常量都在 deploy/', len(consts) == 4 and all(v.startswith('deploy/') for _, v in consts),
          str(dict(consts)))
    unlinks = set(re.findall(r'(\w+)\.unlink', src))
    check('X', 'X4/删除只针对本包自写产物（zip／manifest／UPLOAD 局部变量）',
          unlinks <= {'path', 'zip_path'}, str(sorted(unlinks)))
    check('X', 'X5/无 .bak／无 zip comment 字面量', '.bak' not in src, '')
    check('X', 'X6/build 内本包只新增 pack.py',
          sorted(p.name for p in (ROOT / 'build').iterdir() if p.is_file()) == ['build.py', 'pack.py', 'shell.html'],
          str(sorted(p.name for p in (ROOT / 'build').iterdir() if p.is_file())))
    check('X', 'X7/无 __pycache__ 副作用',
          not (ROOT / 'build' / '__pycache__').exists() and not (ROOT / 'deploy' / '__pycache__').exists(),
          'build/__pycache__=%s' % (ROOT / 'build' / '__pycache__').exists())
    mods = set(re.findall(r'^import\s+([a-z_0-9]+)', src, re.MULTILINE)) \
        | set(re.findall(r'^from\s+([a-z_0-9]+)', src, re.MULTILINE))
    allowed = {'argparse', 'hashlib', 'json', 're', 'shutil', 'sys', 'tempfile', 'time', 'zipfile',
               'pathlib', 'typing', 'build'}
    check('X', 'X8/仅标准库与 build 模块', mods <= allowed, '引入：%s；越界：%s' % (sorted(mods), sorted(mods - allowed)))


def group_O(start, tag):
    now = fingerprint()
    diff = [k for k in now if now[k] != start.get(k)]
    check('O', 'O/%s 只读证明：%d 项指纹逐项相等' % (tag, len(now)), not diff, '、'.join(diff) or '全等')
    return now


def main():
    manifest = json.loads((ROOT / 'deploy' / 'manifest.json').read_text(encoding='utf-8'))
    built, names = page_authority()
    start = fingerprint()
    group_A(built, names)
    group_M(manifest, names)
    group_Z(manifest, names)
    group_D(manifest)
    group_U(manifest)
    group_N(manifest)
    group_X()
    group_O(start, '跑 R 组之前')
    group_R(manifest)
    group_O(start, '重跑打包之后')
    groups = {}
    for group, name, verdict, detail in ROWS:
        groups.setdefault(group, []).append(verdict)
    for group in sorted(groups):
        print('%s 组：%d PASS / %d FAIL' % (group, groups[group].count('PASS'), groups[group].count('FAIL')))
    print('')
    for group, name, verdict, detail in ROWS:
        print('%-4s %-6s %-58s %s' % (verdict, group, name, detail[:150]))
    fails = [r for r in ROWS if r[2] == 'FAIL']
    print('')
    print('合计 %d 条断言，FAIL %d' % (len(ROWS), len(fails)))
    print('site.zip SHA-256 %s' % measure('deploy/site.zip')[1])
    print('manifest.json SHA-256 %s' % measure('deploy/manifest.json')[1])
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
