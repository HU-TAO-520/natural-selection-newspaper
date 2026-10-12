#!/usr/bin/env python3
"""Rebuild the publish artefacts: deploy/manifest.json, deploy/site.zip, deploy/UPLOAD.md.

Contract authority: plan/Task17-重建打包与发布产物.md. The page set comes only from the builder's
assembly exit (build/build.py build_pages); Results/ is read-only, and this script writes nothing
except its three deploy/ artefacts and temp dirs it creates and removes itself.
"""

import argparse
import hashlib
import json
import re
import shutil
import sys
import tempfile
import time
import zipfile
from pathlib import Path

sys.dont_write_bytecode = True

BUILD_DIR = Path(__file__).resolve().parent
if str(BUILD_DIR) not in sys.path:
    sys.path.insert(0, str(BUILD_DIR))

import build as builder  # noqa: E402  the only authority for page naming and ordering

EXIT_OK = 0
EXIT_INPUT = 2
EXIT_VERIFY = 3
EXIT_STRAY = 4

SCHEMA = 1
SHELL_FILES = 7  # index + 3 lists + 404 + styles.css + script.js
RESULTS_DIR = 'Results'
MANIFEST_REL = 'deploy/manifest.json'
ZIP_REL = 'deploy/site.zip'
UPLOAD_REL = 'deploy/UPLOAD.md'
HEADERS_NAME = '_headers'
HEADERS_REL = 'deploy/' + HEADERS_NAME
HEADERS_BASELINE = (518, 'b0273f2ff60c2c95d24899b8bd8a72ae050d233bc38e8b9903a28421d6f9ba7a')

ZIP_DATE_TIME = (1980, 1, 1, 0, 0, 0)
ZIP_CREATE_SYSTEM = 0
ZIP_EXTERNAL_ATTR = 0o644 << 16
ZIP_COMPRESS_TYPE = zipfile.ZIP_DEFLATED
ZIP_COMPRESS_LEVEL = 9

FORBIDDEN_ZIP_NAMES = ('manifest.json', 'UPLOAD.md', 'site.zip')
ENTRY_LINK_ATTR = 'class="entry-list__link" href="'
DATE_FIELD_KEY_RE = re.compile(r'"(?:date|display_date|end_date)"\s*:')
DRIVE_PATH_RE = re.compile(r'[A-Za-z]:[\\/]')
LONG_HEX_RE = re.compile(r'[0-9a-f]{16,}')
DIGEST_RE = re.compile(r'[0-9a-f]{64}')
TIME_RE = re.compile(r'[0-2]?\d:[0-5]\d(?::[0-5]\d)?')

STRAY_NOTICE = '该文件不属于本项目任何任务，请勿删除，请由用户确认处置'


class PackFail(Exception):
    def __init__(self, code: int, message: str):
        Exception.__init__(self)
        self.code = code
        self.message = message

    def __str__(self) -> str:
        return self.message


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def measure_file(path: Path) -> tuple:
    data = path.read_bytes()
    return len(data), digest(data)


def source_path(root: Path, name: str) -> Path:
    if name == HEADERS_NAME:
        return root / HEADERS_REL
    return root / RESULTS_DIR / name


def derive_page_set(root: Path) -> dict:
    try:
        built = builder.build_pages(root)
    except builder.Fail as failure:
        raise PackFail(failure.code, '页集合推导失败（build/build.py 装配出口）：%s' % failure.rendered)
    generated = sorted(built['pages'])
    static = sorted(builder.FOREIGN_ALLOWED)
    if set(generated) & set(static):
        raise PackFail(EXIT_VERIFY, '装配出口与静态文件名冲突：%s' % sorted(set(generated) & set(static)))
    names = sorted(set(generated) | set(static))
    for name in names:
        if not name or name != Path(name).name:
            raise PackFail(EXIT_VERIFY, '装配出口给出的页名不是裸文件名：%r' % name)
    return {'names': names, 'generated': generated, 'static': static, 'pages': built['pages'],
            'registry': built['registry'], 'ordered': built['ordered']}


def package_names(page_names) -> list:
    return sorted(set(page_names) | {HEADERS_NAME})


def scan_results(root: Path):
    base = root / RESULTS_DIR
    if not base.is_dir():
        raise PackFail(EXIT_INPUT, 'Results/ 目录不存在')
    entries = sorted(base.iterdir(), key=lambda p: p.name)
    files = [p.name for p in entries if p.is_file()]
    dirs = [p.name for p in entries if p.is_dir()]
    nested = []
    for name in dirs:
        nested += sorted(p.relative_to(base).as_posix() for p in (base / name).rglob('*') if p.is_file())
    return files, dirs, nested


def classify_collection(root: Path) -> dict:
    page_set = derive_page_set(root)
    files, dirs, nested = scan_results(root)
    present, want = set(files), set(page_set['names'])
    by_lower = {}
    for name in page_set['names']:
        by_lower.setdefault(name.lower(), name)
    case, stray = [], []
    for name in sorted(present - want):
        canonical = by_lower.get(name.lower())
        if canonical is not None:
            case.append((name, canonical))
        else:
            stray.append(name)
    missing = sorted(want - present - {canon for _, canon in case})
    return {'page_set': page_set, 'files': files, 'dirs': dirs, 'nested': nested,
            'missing': missing, 'stray': stray, 'case': case}


def preflight_lines(result: dict) -> list:
    lines = ['期望页集合来源：build/build.py build_pages 装配出口（%d 个装配页 + %d 个静态文件）'
             % (len(result['page_set']['generated']), len(result['page_set']['static']))]
    for name, canon in result['case']:
        lines.append('大小写不符：Results/%s（清单期望 %s，文件系统大小写不敏感，二者是同一个文件）——按清单外文件处理'
                     % (name, canon))
    for name in result['dirs']:
        detail = '，内含 %s' % '、'.join(result['nested']) if result['nested'] else ''
        lines.append('子目录：%s/%s/%s' % (RESULTS_DIR, name, detail))
    for name in result['stray']:
        extra = '（zip 要求 _headers 在场于 deploy/，Results/ 禁止它在场）' if name == HEADERS_NAME else ''
        lines.append('清单外文件：Results/%s%s' % (name, extra))
    for name in result['missing']:
        lines.append('缺文件：Results/%s' % name)
    if not (result['case'] or result['dirs'] or result['stray'] or result['missing']):
        lines.append('Results/ 与期望页集合双向相等：%d 个文件' % len(result['page_set']['names']))
    return lines


def preflight_code(result: dict) -> int:
    if result['case'] or result['dirs'] or result['stray']:
        return EXIT_STRAY
    if result['missing']:
        return EXIT_INPUT
    return EXIT_OK


def check_generated_drift(root: Path, page_set: dict) -> None:
    drift = []
    for name in page_set['generated']:
        path = root / RESULTS_DIR / name
        if path.is_file() and path.read_bytes() != page_set['pages'][name]:
            drift.append(name)
    if drift:
        raise PackFail(EXIT_INPUT, 'Results/ 与构建器装配结果字节不等（漂移）：%s——回流 Task 15／14，'
                                   '不得以现况为准生成清单' % '、'.join(drift))


def run_preflight(root: Path) -> dict:
    result = classify_collection(root)
    code = preflight_code(result)
    if code != EXIT_OK:
        messages = preflight_lines(result)
        if result['stray']:
            messages.append(STRAY_NOTICE)
        raise PackFail(code, '；'.join(messages))
    check_generated_drift(root, result['page_set'])
    return result


def collect_sources(root: Path, names) -> dict:
    sources = {}
    for name in names:
        path = source_path(root, name)
        if not path.is_file():
            raise PackFail(EXIT_INPUT, '源文件缺失：%s' % path.name)
        size, sha = measure_file(path)
        sources[name] = {'path': path.relative_to(root).as_posix(), 'bytes': size, 'sha256': sha}
    if HEADERS_NAME not in sources:
        headers_path = root / HEADERS_REL
        if not headers_path.is_file():
            raise PackFail(EXIT_INPUT, 'deploy/_headers 缺失（zip 要求它在场）')
        size, sha = measure_file(headers_path)
        if (size, sha) != HEADERS_BASELINE:
            raise PackFail(EXIT_INPUT, 'deploy/_headers 与基线不符（期望 %d/%s…，实得 %d/%s…）'
                                       '——安全策略文件变更须用户单独批准'
                           % (HEADERS_BASELINE[0], HEADERS_BASELINE[1][:8], size, sha[:8]))
        sources[HEADERS_NAME] = {'path': HEADERS_REL, 'bytes': size, 'sha256': sha}
    return sources


def build_columns(page_set: dict) -> list:
    columns = []
    for row in page_set['registry']:
        columns.append({
            'key': row.key, 'label': row.label, 'list': row.list_page,
            'articles': [{'slug': a.slug, 'page': a.output_name, 'title': a.title}
                         for a in page_set['ordered'] if a.column == row.key],
        })
    return columns


def build_manifest(root: Path, result: dict, sources: dict) -> dict:
    pages = [{'path': n, 'bytes': sources[n]['bytes'], 'sha256': sources[n]['sha256']}
             for n in sorted(result['page_set']['names'])]
    config = [{'path': HEADERS_NAME, 'bytes': sources[HEADERS_NAME]['bytes'],
               'sha256': sources[HEADERS_NAME]['sha256']}]
    columns = build_columns(result['page_set'])
    return {
        'schema': SCHEMA,
        'columns': columns,
        'pages': pages,
        'config': config,
        'counts': {'pages': len(pages),
                   'html': len([p['path'] for p in pages if p['path'].endswith('.html')]),
                   'config': len(config),
                   'articles': sum(len(c['articles']) for c in columns)},
    }


def list_page_order(root: Path, list_page: str) -> list:
    text = (root / RESULTS_DIR / list_page).read_text(encoding='utf-8')
    return [chunk.split('"', 1)[0] for chunk in text.split(ENTRY_LINK_ATTR)[1:]]


def string_values(node):
    if isinstance(node, dict):
        for key, value in node.items():
            yield str(key)
            for found in string_values(value):
                yield found
    elif isinstance(node, list):
        for item in node:
            for found in string_values(item):
                yield found
    elif isinstance(node, str):
        yield node


def scan_leakage(text: str, label: str, date_values=()) -> list:
    fails = []
    if DATE_FIELD_KEY_RE.search(text):
        fails.append('%s：出现 date／display_date／end_date 字段（Task12 R5①）' % label)
    stripped = LONG_HEX_RE.sub('', text)
    iso = builder.ISO_FORM_RE.search(stripped)
    if iso:
        fails.append('%s：出现 ISO 日期串 %s' % (label, iso.group(0)))
    if DRIVE_PATH_RE.search(stripped):
        fails.append('%s：出现绝对路径或机器路径片段' % label)
    stamp = TIME_RE.search(stripped)
    if stamp:
        fails.append('%s：出现时间戳形态 %s' % (label, stamp.group(0)))
    for value in sorted(set(date_values)):
        if value and value in stripped:
            fails.append('%s：泄漏内容源日期值 %s' % (label, value))
    return fails


def check_manifest(root: Path, manifest: dict, sources: dict, page_names, date_values=()) -> list:
    fails = []
    page_paths = [p['path'] for p in manifest['pages']]
    if page_paths != sorted(page_names):
        fails.append('契约1：pages 集合或字典序与装配出口不等：%s' % page_paths)
    for entry in manifest['pages'] + manifest['config']:
        name = entry['path']
        disk = source_path(root, name)
        if not disk.is_file():
            fails.append('契约1：%s 磁盘缺失' % name)
            continue
        measured = measure_file(disk)
        if measured != (entry['bytes'], entry['sha256']):
            fails.append('契约1：%s 清单承诺 %s/%s 与磁盘实测 %s/%s 不等'
                         % (name, entry['bytes'], entry['sha256'][:8], measured[0], measured[1][:8]))
        if name in sources and (sources[name]['bytes'], sources[name]['sha256']) != measured:
            fails.append('契约1：%s 的实测值在本次运行内不一致' % name)
    if [c['path'] for c in manifest['config']] != [HEADERS_NAME]:
        fails.append('契约2：config 必须恰为 _headers 一项，实为 %s' % [c['path'] for c in manifest['config']])
    leaked = sorted(set(FORBIDDEN_ZIP_NAMES) & set(page_paths))
    if leaked:
        fails.append('契约2：pages 不得包含部署期文件 %s' % leaked)
    for column in manifest['columns']:
        declared = [a['page'] for a in column['articles']]
        actual = list_page_order(root, column['list'])
        if actual != declared:
            fails.append('契约3：%s 的 articles 顺序与列表页实际条目不等（页面 %s，清单 %s）'
                         % (column['key'], actual, declared))
        for article, href in zip(column['articles'], actual):
            if article['slug'] not in href:
                fails.append('契约3：%s 的 slug 未编码进详情页文件名 %s' % (article['slug'], href))
    counts = manifest['counts']
    if counts['pages'] != len(manifest['pages']):
        fails.append('契约4：counts.pages=%d ≠ len(pages)=%d' % (counts['pages'], len(manifest['pages'])))
    html = len([p['path'] for p in manifest['pages'] if p['path'].endswith('.html')])
    if counts['html'] != html:
        fails.append('契约4：counts.html=%d ≠ .html 页数=%d' % (counts['html'], html))
    if counts['config'] != len(manifest['config']):
        fails.append('契约4：counts.config=%d ≠ len(config)=%d' % (counts['config'], len(manifest['config'])))
    if counts['pages'] != SHELL_FILES + counts['articles']:
        fails.append('契约4：counts.pages=%d ≠ 7 + N=%d（含线上专用 404.html）'
                     % (counts['pages'], SHELL_FILES + counts['articles']))
    if counts['html'] != counts['pages'] - 2:
        fails.append('契约4：counts.html 应比交付文件少 2（styles.css／script.js 不是页）')
    text = serialize_manifest(manifest).decode('utf-8')
    fails.extend(scan_leakage(text, 'manifest.json', date_values))
    for value in string_values(manifest):
        if DIGEST_RE.match(value):
            continue
        year = builder.YEAR_FORM_RE.search(value)
        if year:
            fails.append('契约5：manifest 字符串值含四位年份：%s' % value)
        if value.startswith('/') or '\\' in value:
            fails.append('契约5：manifest 字符串值含绝对路径或反斜杠：%s' % value)
    if [list(entry.keys()) for entry in manifest['pages']] and any(
            list(entry.keys()) != ['path', 'bytes', 'sha256'] for entry in manifest['pages'] + manifest['config']):
        fails.append('契约：pages/config 键名或键序不符')
    if list(manifest.keys()) != ['schema', 'columns', 'pages', 'config', 'counts']:
        fails.append('契约：顶层键序不符 %s' % list(manifest.keys()))
    return fails


def serialize_manifest(manifest: dict) -> bytes:
    return (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode('utf-8')


def date_time_from_mtime(path: Path) -> tuple:
    return time.localtime(path.stat().st_mtime)[:6]


def write_zip(zip_path: Path, root: Path, names, date_time=ZIP_DATE_TIME) -> None:
    """Pack bare-name entries at the archive root; date_time=None inherits source mtime (v1 defect)."""
    with zipfile.ZipFile(str(zip_path), 'w', ZIP_COMPRESS_TYPE, compresslevel=ZIP_COMPRESS_LEVEL) as archive:
        for name in sorted(names):
            path = source_path(root, name)
            info = zipfile.ZipInfo(filename=name,
                                   date_time=ZIP_DATE_TIME if date_time is None else date_time)
            if date_time is None:
                info.date_time = date_time_from_mtime(path)
            info.compress_type = ZIP_COMPRESS_TYPE
            info.create_system = ZIP_CREATE_SYSTEM
            info.external_attr = ZIP_EXTERNAL_ATTR
            info.extra = b''
            info.comment = b''
            archive.writestr(info, path.read_bytes())


def pack_hash(root: Path, names, date_time=ZIP_DATE_TIME) -> str:
    stage = Path(tempfile.mkdtemp(prefix='task17-repro-'))
    try:
        path = stage / 'site.zip'
        write_zip(path, root, names, date_time)
        return digest(path.read_bytes())
    finally:
        shutil.rmtree(str(stage), ignore_errors=True)


def check_reproducible(root: Path, names, zip_path: Path) -> list:
    fails = []
    first, second = pack_hash(root, names), pack_hash(root, names)
    if first != second:
        fails.append('合同5：同一输入连续打包两次哈希不等（%s ≠ %s）' % (first[:12], second[:12]))
    if zip_path.is_file() and digest(zip_path.read_bytes()) != first:
        fails.append('合同5：%s 与新建包哈希不等（%s ≠ %s）——时间戳可能仍在继承 mtime'
                     % (ZIP_REL, digest(zip_path.read_bytes())[:12], first[:12]))
    return fails


def declared_entry(manifest: dict, name: str):
    for entry in manifest['pages'] + manifest['config']:
        if entry['path'] == name:
            return entry
    return None


def unpack_compare(zip_path: Path, root: Path, manifest: dict, page_names=None) -> list:
    """Packaging contract 6 (a)-(e), reading the zip back from disk into a fresh temp dir."""
    fails = []
    try:
        archive = zipfile.ZipFile(str(zip_path))
    except (OSError, zipfile.BadZipFile) as error:
        return ['合同6：无法打开 zip：%s' % error]
    with archive:
        infos = archive.infolist()
        dir_entries = [i.filename for i in infos if i.is_dir() or i.filename.endswith('/')]
        file_entries = [i for i in infos if not (i.is_dir() or i.filename.endswith('/'))]
        names = [i.filename for i in file_entries]
        prefixed = sorted(n for n in names if '/' in n or '\\' in n)

        basis = page_names if page_names is not None else [p['path'] for p in manifest['pages']]
        expected = package_names(basis)
        if declared_entry(manifest, HEADERS_NAME) is None:
            expected = [n for n in expected if n != HEADERS_NAME]
        declared = len(manifest['pages']) + len(manifest['config'])

        if sorted(names) != expected:
            fails.append('合同6(a)：zip 文件条目集合与 pages∪config 不等（缺 %s，多 %s）'
                         % (sorted(set(expected) - set(names)), sorted(set(names) - set(expected))))
        if names != sorted(names):
            fails.append('合同3：条目顺序不是 sorted(名)：%s' % names)
        if len(names) != declared:
            fails.append('合同6(e)：文件条目数 %d ≠ len(pages)+len(config)=%d' % (len(names), declared))
        if len(names) != len(set(names)):
            fails.append('合同6(a)：zip 内存在重名条目')
        if dir_entries:
            fails.append('合同3：zip 含目录条目 %s' % dir_entries)
        if prefixed:
            fails.append('合同3：条目名含路径分隔符或目录前缀 %s' % prefixed)
        banned = sorted(n for n in names
                        if Path(n).name in FORBIDDEN_ZIP_NAMES or n.endswith('.txt') or '__pycache__' in n)
        if banned:
            fails.append('合同4：zip 含禁止条目 %s' % banned)
        for info in file_entries:
            if info.date_time != ZIP_DATE_TIME:
                fails.append('合同5：%s 条目时间戳 %s 未固定为 %s'
                             % (info.filename, info.date_time, ZIP_DATE_TIME))
            if info.compress_type != ZIP_COMPRESS_TYPE:
                fails.append('合同3：%s 压缩方式 %s 不是 ZIP_DEFLATED' % (info.filename, info.compress_type))
            if info.extra or info.comment:
                fails.append('合同5：%s 携带 extra 或 comment' % info.filename)
            if info.create_system != ZIP_CREATE_SYSTEM:
                fails.append('合同5：%s create_system=%s 未固定' % (info.filename, info.create_system))
        headers = declared_entry(manifest, HEADERS_NAME)
        if headers is not None and HEADERS_NAME not in names:
            fails.append('合同6(d)：_headers 不在包内')
        if headers is not None and measure_file(root / HEADERS_REL) != (headers['bytes'], headers['sha256']):
            fails.append('合同6(d)：_headers 哈希不等于基线')

        stage = Path(tempfile.mkdtemp(prefix='task17-verify-'))
        try:
            for info in file_entries:
                bare = Path(info.filename).name
                if bare != info.filename:
                    fails.append('合同3：%s 条目名带目录前缀，其内容按裸名核对' % info.filename)
                target = stage / bare
                with open(str(target), 'wb') as handle:
                    handle.write(archive.read(info))
                extracted = measure_file(target)
                source = source_path(root, bare)
                on_disk = measure_file(source) if source.is_file() else (None, None)
                entry = declared_entry(manifest, bare)
                if entry is None:
                    fails.append('合同6(b)：%s 不在清单内' % info.filename)
                    continue
                if extracted != (entry['bytes'], entry['sha256']):
                    fails.append('合同6(b)：%s 解包实测 %s/%s ≠ 清单承诺 %s/%s'
                                 % (info.filename, extracted[0], extracted[1][:8],
                                    entry['bytes'], entry['sha256'][:8]))
                if on_disk != extracted:
                    fails.append('合同6(b)：%s 解包实测与源文件磁盘实测不等（源 %s，包 %s）'
                                 % (info.filename, on_disk[0], extracted[0]))
        finally:
            shutil.rmtree(str(stage), ignore_errors=True)
    return fails


def render_upload(manifest: dict, zip_size: int, zip_sha: str) -> bytes:
    counts = manifest['counts']
    n = counts['articles']
    entries = counts['pages'] + counts['config']
    lines = [
        '# 上传核对单',
        '',
        '本单由 `build/pack.py` 随包生成，数字全部取自 `deploy/manifest.json` 的 `counts`，不要手改。',
        '',
        '## 三个数字（口径不同，不得混用"页"与"文件"）',
        '',
        '| 数字 | 含义 | 当前值 |',
        '| --- | --- | --- |',
        '| 交付文件数 `7 + N` | `Results/` 内要交付的文件（含线上专用 `404.html`），N 为详情页篇数 | %d |' % counts['pages'],
        '| zip 文件条目数 `8 + N` | `deploy/site.zip` 内的文件条目，含只进包不进 `Results/` 的 `_headers` | %d |'
        % entries,
        '| 站点 HTML 页面数 `5 + N` | 站点页面数（含线上专用 `404.html`）；Pages 后台的 "Pages" 计数只数 HTML | %d |' % counts['html'],
        '',
        '- N = %d（内容源文章数，即详情页张数）' % n,
        '- `deploy/site.zip`：%d 字节' % zip_size,
        '- `deploy/site.zip` SHA-256：`%s`' % zip_sha,
        '',
        '三个数不相等的原因：`_headers` 只进 zip、不进 `Results/`（zip 条目比交付文件多 1）；',
        '`styles.css` 与 `script.js` 是文件而非页面（HTML 页数比交付文件数少 2）。',
        '`404.html` 由构建器生成并参与部署与 HTML 页计数；它仅供线上 Pages 处理未知路径，不属于文章或栏目列表，也不得按本地文件页面验收。',
        '',
        '## 包内清单（按字典序，与 zip 内条目顺序逐行一致）',
        '',
        '| 条目 | 类别 | 字节 | SHA-256 前 16 位 |',
        '| --- | --- | --- | --- |',
    ]
    listing = sorted(manifest['pages'] + manifest['config'], key=lambda e: e['path'])
    for entry in listing:
        kind = '配置（只进包，不进 Results/）' if entry['path'] == HEADERS_NAME else (
            '页面' if entry['path'].endswith('.html') else '资源')
        lines.append('| `%s` | %s | %d | `%s` |'
                     % (entry['path'], kind, entry['bytes'], entry['sha256'][:16]))
    lines += [
        '',
        '栏目与详情页配对（列表页 → 条目顺序即页面上的实际条目顺序）：',
        '',
    ]
    for column in manifest['columns']:
        lines.append('- %s（`%s`）：%s' % (column['label'], column['list'],
                                        '、'.join('`%s`' % a['page'] for a in column['articles'])))
    lines += [
        '',
        '## 操作前提',
        '',
        '- Direct Upload 由用户本人手工执行；打包脚本不上传、不调用 Cloudflare API。',
        '- 保持 Auto-Minify 关闭：它会改写 `script.js`，而核对的是原文件哈希。',
        '- 保持 Rocket Loader 关闭：同上，脚本被改写后哈希必然失配。',
        '- 保持 Bot Fight Mode 关闭：易误伤大陆正常读者 UA。',
        '- `.pages.dev` 口令保护保持关闭。',
        '- 上传完成后，把 Pages 给出的"上传成功清单"与上表逐条核对，三个数字**分别**核对：',
        '  交付文件 %d、zip 文件条目 %d、Pages 后台 "Pages" 计数 %d。' % (counts['pages'], entries, counts['html']),
        '- 条目缺失或数量不符时当场中止发布并报告差异条目，不做补救式重传，也不重跑构建。',
        '- `manifest.json` 与 `UPLOAD.md` 都是部署期文件：只进 `deploy/`，绝不进 `Results/`，绝不进 zip。',
        '',
    ]
    return ('\n'.join(lines) + '\n').encode('utf-8')


def manifest_from_disk(root: Path) -> dict:
    path = root / MANIFEST_REL
    if not path.is_file():
        raise PackFail(EXIT_INPUT, '%s 不存在，请先运行 pack.py all' % MANIFEST_REL)
    return json.loads(path.read_text(encoding='utf-8'))


def check_upload(root: Path, manifest: dict, upload_text: str, date_values=()) -> list:
    counts = manifest['counts']
    fails = []
    size, sha = measure_file(root / ZIP_REL)
    must = [
        '| 交付文件数 `7 + N` | `Results/` 内要交付的文件（含线上专用 `404.html`），N 为详情页篇数 | %d |' % counts['pages'],
        '| zip 文件条目数 `8 + N` | `deploy/site.zip` 内的文件条目，含只进包不进 `Results/` 的 `_headers` | %d |'
        % (counts['pages'] + counts['config']),
        '| 站点 HTML 页面数 `5 + N` | 站点页面数（含线上专用 `404.html`）；Pages 后台的 "Pages" 计数只数 HTML | %d |' % counts['html'],
        '`%s`' % sha,
        '%d 字节' % size,
    ]
    lines = upload_text.split('\n')
    for needle in must:
        if not any(needle in line for line in lines):
            fails.append('UPLOAD.md：缺少由 counts／实测值生成的行：%s' % needle)
    for entry in sorted(manifest['pages'] + manifest['config'], key=lambda e: e['path']):
        kind = '配置（只进包，不进 Results/）' if entry['path'] == HEADERS_NAME else (
            '页面' if entry['path'].endswith('.html') else '资源')
        row = '| `%s` | %s | %d | `%s` |' % (entry['path'], kind, entry['bytes'], entry['sha256'][:16])
        if row not in lines:
            fails.append('UPLOAD.md：清单行缺失或不符 %s' % row)
    listed = [line for line in lines if line.startswith('| `')]
    if [line.split('`')[1] for line in listed] != zipfile.ZipFile(str(root / ZIP_REL)).namelist():
        fails.append('UPLOAD.md：清单顺序与 zip 内条目顺序不一致')
    if len(listed) != counts['pages'] + counts['config']:
        fails.append('UPLOAD.md：清单行数 %d ≠ zip 条目数 %d' % (len(listed), counts['pages'] + counts['config']))
    fails.extend(scan_leakage(upload_text, 'UPLOAD.md', date_values))
    return fails


def command_all(root: Path) -> int:
    result = run_preflight(root)
    sources = collect_sources(root, result['page_set']['names'])
    manifest = build_manifest(root, result, sources)
    date_values = content_date_values(result['page_set'])
    fails = check_manifest(root, manifest, sources, result['page_set']['names'], date_values)
    if fails:
        raise PackFail(EXIT_VERIFY, '清单契约失败，未写任何产物：' + '；'.join(fails))

    zip_path = root / ZIP_REL
    payload = serialize_manifest(manifest)
    written = []
    try:
        write_zip(zip_path, root, package_names(sources.keys()))
        written.append(zip_path)
        fails = unpack_compare(zip_path, root, manifest, result['page_set']['names']) + check_reproducible(
            root, package_names(sources.keys()), zip_path)
        if fails:
            raise PackFail(EXIT_VERIFY, '回验失败：' + '；'.join(fails))
        size, sha = measure_file(zip_path)
        (root / MANIFEST_REL).write_bytes(payload)
        written.append(root / MANIFEST_REL)
        (root / UPLOAD_REL).write_bytes(render_upload(manifest, size, sha))
        written.append(root / UPLOAD_REL)
        sys.stdout.write('已产出 %s：%d 文件条目、0 目录条目、%d 字节 %s\n'
                         % (ZIP_REL, len(sources), size, sha))
        sys.stdout.write('已产出 %s、%s：counts=%s\n' % (MANIFEST_REL, UPLOAD_REL, manifest['counts']))
        fails = unpack_compare(zip_path, root, manifest_from_disk(root), result['page_set']['names'])
        fails += check_upload(root, manifest, (root / UPLOAD_REL).read_text(encoding='utf-8'), date_values)
        if fails:
            raise PackFail(EXIT_VERIFY, '落盘后复验失败：' + '；'.join(fails))
        return EXIT_OK
    except PackFail:
        for path in written:
            path.unlink(missing_ok=True)
        raise


def content_date_values(page_set: dict) -> list:
    values = []
    for article in page_set['ordered']:
        values += [v for v in (article.date, article.display_date, article.end_date) if v]
    return values


def command_manifest(root: Path) -> int:
    result = run_preflight(root)
    sources = collect_sources(root, result['page_set']['names'])
    manifest = build_manifest(root, result, sources)
    date_values = content_date_values(result['page_set'])
    fails = check_manifest(root, manifest, sources, result['page_set']['names'], date_values)
    if fails:
        raise PackFail(EXIT_VERIFY, '；'.join(fails))
    zip_path = root / ZIP_REL
    if not zip_path.is_file():
        raise PackFail(EXIT_VERIFY, '%s 不存在：禁止只写清单（清单与包分裂），请运行 all' % ZIP_REL)
    fails = unpack_compare(zip_path, root, manifest)
    if fails:
        raise PackFail(EXIT_VERIFY, '清单未落盘，现有包与新清单不符：' + '；'.join(fails))
    size, sha = measure_file(zip_path)
    (root / MANIFEST_REL).write_bytes(serialize_manifest(manifest))
    (root / UPLOAD_REL).write_bytes(render_upload(manifest, size, sha))
    sys.stdout.write('已重写 %s 与 %s（现有 %s 回验通过）\n' % (MANIFEST_REL, UPLOAD_REL, ZIP_REL))
    return EXIT_OK


def command_zip(root: Path, date_time=ZIP_DATE_TIME) -> int:
    result = run_preflight(root)
    sources = collect_sources(root, result['page_set']['names'])
    manifest = build_manifest(root, result, sources)
    zip_path = root / ZIP_REL
    write_zip(zip_path, root, package_names(sources.keys()), date_time)
    fails = unpack_compare(zip_path, root, manifest, result['page_set']['names'])
    if fails:
        zip_path.unlink(missing_ok=True)
        raise PackFail(EXIT_VERIFY, '已删除半成品 site.zip：' + '；'.join(fails))
    sys.stdout.write('已产出 %s（manifest／UPLOAD.md 未改动，如需同步请用 all）\n' % ZIP_REL)
    return EXIT_OK


def command_verify(root: Path, zip_override: str = None) -> int:
    result = run_preflight(root)
    sources = collect_sources(root, result['page_set']['names'])
    manifest = manifest_from_disk(root)
    date_values = content_date_values(result['page_set'])
    zip_path = Path(zip_override) if zip_override else root / ZIP_REL
    fails = unpack_compare(zip_path, root, manifest, result['page_set']['names'])
    fails += check_manifest(root, manifest, sources, result['page_set']['names'], date_values)
    if not zip_override:
        fails += check_reproducible(root, package_names(sources.keys()), zip_path)
        upload_path = root / UPLOAD_REL
        if not upload_path.is_file():
            fails.append('UPLOAD.md 缺失')
        else:
            fails += check_upload(root, manifest, upload_path.read_text(encoding='utf-8'), date_values)
    if fails:
        raise PackFail(EXIT_VERIFY, '；'.join(fails))
    sys.stdout.write('回验全绿：%s（%d 文件条目、0 目录条目）\n'
                     % (zip_path.name, len(manifest['pages']) + len(manifest['config'])))
    return EXIT_OK


def main(argv=None, root=None) -> int:
    parser = argparse.ArgumentParser(prog='pack.py')
    parser.add_argument('command', nargs='?', default='all', choices=['manifest', 'zip', 'verify', 'all'])
    parser.add_argument('--root', default=None)
    parser.add_argument('--zip', dest='zip_path', default=None)
    args = parser.parse_args(argv)
    if args.root:
        base = Path(args.root).resolve()
    elif root is not None:
        base = Path(root)
    else:
        base = BUILD_DIR.parent
    try:
        if args.command == 'manifest':
            return command_manifest(base)
        if args.command == 'zip':
            return command_zip(base)
        if args.command == 'verify':
            return command_verify(base, args.zip_path)
        return command_all(base)
    except PackFail as failure:
        sys.stderr.write('pack.py：%s\n' % failure)
        return failure.code


if __name__ == '__main__':
    sys.exit(main())
