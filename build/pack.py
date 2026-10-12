#!/usr/bin/env python3
"""Create and verify the R14 main and easteregg Cloudflare Pages packages."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent
if str(BUILD_DIR) not in sys.path:
    sys.path.insert(0, str(BUILD_DIR))
try:
    from . import build as builder
except ImportError:
    import build as builder

EXIT_OK = 0
EXIT_INPUT = 2
EXIT_VERIFY = 3
EXIT_STRAY = 4
SCHEMA = 1
HEADERS_NAME = '_headers'
HEADERS_REL = 'deploy/_headers'
HEADERS_BASELINE = (518, 'b0273f2ff60c2c95d24899b8bd8a72ae050d233bc38e8b9903a28421d6f9ba7a')
ZIP_DATE_TIME = (1980, 1, 1, 0, 0, 0)
ZIP_CREATE_SYSTEM = 0
ZIP_EXTERNAL_ATTR = 0o644 << 16
ZIP_COMPRESS_TYPE = zipfile.ZIP_DEFLATED
ZIP_COMPRESS_LEVEL = 9
FORBIDDEN_PAGE_NAMES = {'manifest.json', 'UPLOAD.md', 'EASTEREGG-UPLOAD.md', 'site.zip', 'easteregg.zip'}
sys.dont_write_bytecode = True


@dataclass(frozen=True)
class Profile:
    target: str
    results_dir: str
    manifest_rel: str
    zip_rel: str
    upload_rel: str
    fixed_files: tuple[str, ...]
    resources: tuple[str, ...]
    files_base: int
    zip_base: int
    html_base: int
    preview_url: str = ''
    branch: str = ''


class PackFail(Exception):
    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code
        self.message = message

    def __str__(self) -> str:
        return self.message


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def measure_bytes(data: bytes) -> tuple[int, str]:
    return len(data), digest(data)


def measure_file(path: Path) -> tuple[int, str]:
    return measure_bytes(path.read_bytes())


def profile_for(root: Path, target: str) -> Profile:
    try:
        contract = builder.egg_renderer.load_contract(root)
        if target == 'main':
            item = contract['main']
            return Profile(target, 'Results', 'deploy/manifest.json', 'deploy/site.zip', 'deploy/UPLOAD.md',
                           tuple(item['fixed_files']), tuple(item['resources']),
                           item['files_base'], item['zip_base'], item['html_base'])
        if target == 'easteregg':
            item = contract['preview']
            return Profile(target, 'deploy/easteregg', 'deploy/easteregg-manifest.json',
                           'deploy/easteregg.zip', 'deploy/EASTEREGG-UPLOAD.md',
                           tuple(item['fixed_files']), tuple(item['resources']),
                           item['files'], item['zip_entries'], item['html'],
                           item['url'], item['branch'])
    except (OSError, KeyError, ValueError, json.JSONDecodeError) as error:
        raise PackFail(EXIT_INPUT, 'R14 profile load failed: %s' % error)
    raise PackFail(EXIT_INPUT, 'target must be main or easteregg')


def source_path(root: Path, name: str, profile: Profile) -> Path:
    if name == HEADERS_NAME:
        return root / HEADERS_REL
    return root / profile.results_dir / name


def derive_page_set(root: Path, profile: Profile) -> dict:
    try:
        if profile.target == 'main':
            built = builder.build_pages(root)
            generated = {**built['pages'], **built['assets']}
            static = sorted(builder.FOREIGN_ALLOWED)
            registry, ordered = built['registry'], built['ordered']
        else:
            generated = builder.egg_renderer.render_target(root, 'easteregg')
            static = []
            registry, ordered = [], []
    except builder.Fail as failure:
        raise PackFail(failure.code, 'page set derivation failed: %s' % failure.rendered)
    except (OSError, KeyError, ValueError, json.JSONDecodeError) as error:
        raise PackFail(EXIT_INPUT, 'page set derivation failed: %s' % error)
    generated_names = sorted(generated)
    if set(generated_names) & set(static):
        raise PackFail(EXIT_VERIFY, 'generated/static name collision: %s' % sorted(set(generated_names) & set(static)))
    names = sorted(set(generated_names) | set(static))
    if any(not name or name != Path(name).name for name in names):
        raise PackFail(EXIT_VERIFY, 'page set contains a non-bare name')
    if not set(profile.fixed_files) <= set(names):
        raise PackFail(EXIT_VERIFY, 'R14 fixed files missing from builder export: %s' % sorted(set(profile.fixed_files) - set(names)))
    return {'target': profile.target, 'names': names, 'generated': generated_names, 'static': static,
            'files': generated, 'registry': registry, 'ordered': ordered}


def package_names(page_names) -> list[str]:
    return sorted(set(page_names) | {HEADERS_NAME})


def scan_target(root: Path, profile: Profile):
    base = root / profile.results_dir
    if not base.is_dir():
        raise PackFail(EXIT_INPUT, '%s target directory is missing' % profile.results_dir)
    entries = sorted(base.iterdir(), key=lambda item: item.name)
    return ([item.name for item in entries if item.is_file()],
            [item.name for item in entries if item.is_dir()])


def preflight(root: Path, profile: Profile) -> dict:
    page_set = derive_page_set(root, profile)
    files, directories = scan_target(root, profile)
    present, expected = set(files), set(page_set['names'])
    missing, extra = sorted(expected - present), sorted(present - expected)
    if directories:
        raise PackFail(EXIT_STRAY, '%s contains unregistered directories: %s' % (profile.results_dir, directories))
    if extra:
        raise PackFail(EXIT_STRAY, '%s contains files outside R14: %s' % (profile.results_dir, extra))
    if missing:
        raise PackFail(EXIT_VERIFY, '%s is missing R14 files: %s' % (profile.results_dir, missing))
    drift = [name for name in page_set['generated']
             if (root / profile.results_dir / name).read_bytes() != page_set['files'][name]]
    if drift:
        raise PackFail(EXIT_INPUT, '%s differs from builder output: %s' % (profile.results_dir, drift))
    return {'page_set': page_set, 'files': files}


def collect_sources(root: Path, page_set: dict, profile: Profile) -> dict:
    sources = {}
    for name in page_set['names']:
        path = source_path(root, name, profile)
        if not path.is_file():
            raise PackFail(EXIT_INPUT, 'source missing: %s' % path)
        size, sha = measure_file(path)
        sources[name] = {'path': (Path(profile.results_dir) / name).as_posix(), 'bytes': size, 'sha256': sha}
    headers = root / HEADERS_REL
    if not headers.is_file():
        raise PackFail(EXIT_INPUT, 'deploy/_headers is required in the package')
    size, sha = measure_file(headers)
    if (size, sha) != HEADERS_BASELINE:
        raise PackFail(EXIT_INPUT, 'deploy/_headers differs from protected baseline (%d/%s)' % (size, sha[:12]))
    sources[HEADERS_NAME] = {'path': HEADERS_REL, 'bytes': size, 'sha256': sha}
    return sources


def build_columns(page_set: dict) -> list:
    result = []
    for row in page_set['registry']:
        result.append({
            'key': row.key,
            'label': row.label,
            'list': row.list_page,
            'articles': [{'slug': article.slug, 'page': article.output_name, 'title': article.title}
                         for article in page_set['ordered'] if article.column == row.key]
        })
    return result


def build_manifest(page_set: dict, sources: dict, profile: Profile) -> dict:
    pages = [{'path': name, 'bytes': sources[name]['bytes'], 'sha256': sources[name]['sha256']}
             for name in sorted(page_set['names'])]
    config = [{'path': HEADERS_NAME, 'bytes': sources[HEADERS_NAME]['bytes'], 'sha256': sources[HEADERS_NAME]['sha256']}]
    columns = build_columns(page_set) if profile.target == 'main' else []
    return {
        'schema': SCHEMA,
        'columns': columns,
        'pages': pages,
        'config': config,
        'counts': {
            'pages': len(pages),
            'html': sum(1 for page in pages if page['path'].endswith('.html')),
            'config': len(config),
            'articles': sum(len(column['articles']) for column in columns),
        },
    }


def list_page_order(root: Path, list_page: str) -> list[str]:
    text = (root / 'Results' / list_page).read_text(encoding='utf-8')
    return re.findall(r'class="entry-list__link" href="([^"]+)"', text)


def scan_leakage(text: str, label: str) -> list[str]:
    failures = []
    scrubbed = re.sub(r'[0-9a-fA-F]{8,}', '', text)
    scrubbed = re.sub(r'"bytes"\s*:\s*\d+', '"bytes": ', scrubbed)
    scrubbed = re.sub(r'\|\s*\d{4,}\s*\|', '| |', scrubbed)
    scrubbed = re.sub(r'\b\d+\s*(?:字节|bytes)\b', '', scrubbed, flags=re.I)
    if re.search(r'\d{4}-\d{2}-\d{2}', scrubbed):
        failures.append('%s contains ISO date form' % label)
    year_match = builder.YEAR_FORM_RE.search(scrubbed)
    if year_match:
        context = scrubbed[max(0, year_match.start() - 24):year_match.end() + 24].replace('\n', ' ')
        failures.append('%s contains a year-shaped number: %s' % (label, context))
    if re.search(r'(?<![A-Za-z])[A-Za-z]:[\\/]|\\', scrubbed):
        failures.append('%s contains an absolute/local path' % label)
    if '{{' in scrubbed or '}}' in scrubbed:
        failures.append('%s contains an unresolved template marker' % label)
    return failures


def check_manifest(root: Path, manifest: dict, sources: dict, page_set: dict, profile: Profile) -> list[str]:
    failures = []
    expected_page_names = page_set['names']
    page_entries = manifest.get('pages', [])
    page_paths = [item.get('path') for item in page_entries]
    if page_paths != expected_page_names:
        failures.append('pages names differ from target builder export')
    if list(manifest.keys()) != ['schema', 'columns', 'pages', 'config', 'counts'] or manifest.get('schema') != SCHEMA:
        failures.append('manifest schema or top-level key order differs')
    for item in page_entries + manifest.get('config', []):
        if list(item.keys()) != ['path', 'bytes', 'sha256']:
            failures.append('manifest entry key shape differs: %s' % item.get('path'))
            continue
        name = item['path']
        disk = source_path(root, name, profile)
        if not disk.is_file():
            failures.append('manifest source missing: %s' % name)
            continue
        actual = measure_file(disk)
        if actual != (item['bytes'], item['sha256']):
            failures.append('manifest hash/size differs from disk: %s' % name)
        if name in sources and actual != (sources[name]['bytes'], sources[name]['sha256']):
            failures.append('source measurement changed during run: %s' % name)
    if [item.get('path') for item in manifest.get('config', [])] != [HEADERS_NAME]:
        failures.append('config must contain only _headers')
    if not isinstance(manifest.get('columns'), list):
        failures.append('columns must be an array')
    elif manifest['columns'] != (build_columns(page_set) if profile.target == 'main' else []):
        failures.append('columns differ from the main article ordering or preview must be empty')
    counts = manifest.get('counts', {})
    if list(counts.keys()) != ['pages', 'html', 'config', 'articles']:
        failures.append('counts must have the R14 four-key order')
        counts = {}
    html_count = sum(1 for name in page_paths if isinstance(name, str) and name.endswith('.html'))
    articles = sum(len(column['articles']) for column in manifest.get('columns', []))
    if counts.get('pages') != len(page_entries) or counts.get('html') != html_count or counts.get('config') != 1 or counts.get('articles') != articles:
        failures.append('manifest counts differ from actual page/config/column sets')
    if len(page_entries) != profile.files_base + articles:
        failures.append('R14 files formula mismatch: expected %d + %d' % (profile.files_base, articles))
    if html_count != profile.html_base + (articles if profile.target == 'main' else 0):
        failures.append('R14 HTML formula mismatch: base=%d articles=%d actual=%d' % (profile.html_base, articles, html_count))
    if html_count != len(page_entries) - len(profile.resources):
        failures.append('HTML count does not equal file count minus the target resource count')
    if len(page_entries) + 1 != profile.zip_base + articles:
        failures.append('R14 ZIP entry formula mismatch')
    if any(Path(name).name != name or name in FORBIDDEN_PAGE_NAMES for name in page_paths):
        failures.append('pages contains a non-bare or deployment-only filename')
    for column in manifest.get('columns', []):
        actual_order = list_page_order(root, column['list'])
        declared = [article['page'] for article in column['articles']]
        if actual_order != declared:
            failures.append('column %s article order differs from rendered list' % column['key'])
        for article in column['articles']:
            if article['slug'] not in article['page']:
                failures.append('article slug missing from output filename: %s' % article['slug'])
    failures.extend(scan_leakage(serialize_manifest(manifest).decode('utf-8'), 'manifest'))
    return failures


def serialize_manifest(manifest: dict) -> bytes:
    return (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode('utf-8')


def build_zip_bytes(root: Path, names, profile: Profile) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', ZIP_COMPRESS_TYPE, compresslevel=ZIP_COMPRESS_LEVEL) as archive:
        for name in sorted(names):
            path = source_path(root, name, profile)
            info = zipfile.ZipInfo(filename=name, date_time=ZIP_DATE_TIME)
            info.compress_type = ZIP_COMPRESS_TYPE
            info.create_system = ZIP_CREATE_SYSTEM
            info.external_attr = ZIP_EXTERNAL_ATTR
            info.extra = b''
            info.comment = b''
            archive.writestr(info, path.read_bytes())
    return buffer.getvalue()


def declared_entry(manifest: dict, name: str):
    for entry in manifest.get('pages', []) + manifest.get('config', []):
        if entry.get('path') == name:
            return entry
    return None


def unpack_compare(zip_bytes: bytes, root: Path, manifest: dict, page_set: dict, profile: Profile) -> list[str]:
    """Check ZIP entries and contents in memory; no temporary extraction directory is used."""
    failures = []
    try:
        archive = zipfile.ZipFile(io.BytesIO(zip_bytes), 'r')
    except (OSError, zipfile.BadZipFile) as error:
        return ['cannot open ZIP: %s' % error]
    with archive:
        infos = archive.infolist()
        directories = [info.filename for info in infos if info.is_dir() or info.filename.endswith('/')]
        files = [info for info in infos if not (info.is_dir() or info.filename.endswith('/'))]
        names = [info.filename for info in files]
        expected = sorted(page_set['names'] + [HEADERS_NAME])
        if names != expected:
            failures.append('ZIP entries differ from pages∪config (missing=%s extra=%s)' %
                            (sorted(set(expected) - set(names)), sorted(set(names) - set(expected))))
        if names != sorted(names):
            failures.append('ZIP entry names are not in dictionary order')
        if directories:
            failures.append('ZIP contains directory entries: %s' % directories)
        if any('/' in name or '\\' in name for name in names):
            failures.append('ZIP contains a path-prefixed entry')
        if len(names) != len(set(names)) or len(names) != len(manifest.get('pages', [])) + len(manifest.get('config', [])):
            failures.append('ZIP file entry count or uniqueness differs from manifest')
        for info in files:
            if (info.date_time != ZIP_DATE_TIME or info.compress_type != ZIP_COMPRESS_TYPE or
                    info.create_system != ZIP_CREATE_SYSTEM or info.extra or info.comment):
                failures.append('ZIP metadata differs from the fixed R14 profile: %s' % info.filename)
            entry = declared_entry(manifest, info.filename)
            if entry is None:
                failures.append('ZIP entry is absent from manifest: %s' % info.filename)
                continue
            content = archive.read(info)
            if measure_bytes(content) != (entry['bytes'], entry['sha256']):
                failures.append('ZIP content differs from manifest: %s' % info.filename)
            source = source_path(root, info.filename, profile)
            if not source.is_file() or source.read_bytes() != content:
                failures.append('ZIP content differs from disk source: %s' % info.filename)
        header = declared_entry(manifest, HEADERS_NAME)
        if header is None or not (root / HEADERS_REL).is_file() or measure_file(root / HEADERS_REL) != (header['bytes'], header['sha256']):
            failures.append('_headers missing or differs from manifest/protected input')
    return failures


def upload_rows(manifest: dict, profile: Profile, zip_size: int, zip_sha: str) -> bytes:
    counts = manifest['counts']
    entries = counts['pages'] + counts['config']
    main = profile.target == 'main'
    title = '上传核对单' if main else '彩蛋预览上传核对单'
    files_formula = '11 + N' if main else '4'
    zip_formula = '12 + N' if main else '5'
    html_formula = '7 + N' if main else '2'
    target_desc = ('Production 部署：上传到 old-ns-news 项目主站 https://old-ns-news.pages.dev/。'
                   if main else
                   'Preview 部署：分支填 easteregg，根域名应为 ' + profile.preview_url)
    lines = [
        '# ' + title, '',
        '本单由 `build/pack.py` 随包生成，三个计数分别表示文件、ZIP 条目和 HTML 页面。', '',
        '## 数量核对', '',
        '| 数字 | 含义 | 当前值 |', '| --- | --- | --- |',
        '| 交付文件数 `' + files_formula + '` | 目标目录的文件数 | %d |' % counts['pages'],
        '| ZIP 文件条目数 `' + zip_formula + '` | ZIP 内文件条目，含仅进 ZIP 的 `_headers` | %d |' % entries,
        '| HTML 页面数 `' + html_formula + '` | 目标内 HTML 页面数 | %d |' % counts['html'],
        '', '- 文章数 N = %d' % counts['articles'],
        '- `%s`：%d 字节，SHA-256 `%s`' % (profile.zip_rel, zip_size, zip_sha),
        '', target_desc, '',
        '## 包内文件（字典序）', '',
        '| 文件 | 类别 | 字节 | SHA-256 前 16 位 |', '| --- | --- | ---: | --- |',
    ]
    all_entries = sorted(manifest['pages'] + manifest['config'], key=lambda item: item['path'])
    for entry in all_entries:
        kind = '只进 ZIP' if entry['path'] == HEADERS_NAME else ('HTML' if entry['path'].endswith('.html') else '资源')
        lines.append('| `%s` | %s | %d | `%s` |' % (entry['path'], kind, entry['bytes'], entry['sha256'][:16]))
    if manifest['columns']:
        lines += ['', '栏目及文章顺序（以页面实际条目顺序为准）：', '']
        for column in manifest['columns']:
            ordered = '、'.join('`%s`' % article['page'] for article in column['articles'])
            lines.append('- %s（`%s`）：%s' % (column['label'], column['list'], ordered))
    lines += [
        '', '## 上传步骤', '',
        '- 使用 Cloudflare Pages Direct Upload；本工具不执行上传或修改账户设置。',
        '- ' + target_desc,
        '- 上传 `%s`；核对 ZIP 中恰有 %d 个文件、0 个目录项、%d 张 HTML。' % (profile.zip_rel, entries, counts['html']),
        '- 核对 Cloudflare 部署后的页面身份与资源 SHA-256；只看 HTTP 200 不算通过。',
        '- Auto-Minify 与 Rocket Loader 保持关闭，以保留所列资源哈希。',
        '- `manifest.json`、上传说明和 ZIP 本身不在目标文件目录或 ZIP 内容中。',
        '',
    ]
    return ('\n'.join(lines) + '\n').encode('utf-8')


def manifest_from_disk(root: Path, profile: Profile) -> dict:
    path = root / profile.manifest_rel
    if not path.is_file():
        raise PackFail(EXIT_INPUT, '%s is missing; run pack.py all first' % profile.manifest_rel)
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise PackFail(EXIT_VERIFY, 'cannot read %s: %s' % (profile.manifest_rel, error))


def check_upload(root: Path, manifest: dict, text: str, profile: Profile, zip_bytes: bytes) -> list[str]:
    failures = scan_leakage(text, profile.upload_rel)
    zip_size, zip_sha = measure_bytes(zip_bytes)
    counts = manifest['counts']
    entries = counts['pages'] + counts['config']
    required_rows = [
        '| 交付文件数 `' + ('11 + N' if profile.target == 'main' else '4') + '` | 目标目录的文件数 | %d |' % counts['pages'],
        '| ZIP 文件条目数 `' + ('12 + N' if profile.target == 'main' else '5') + '` | ZIP 内文件条目，含仅进 ZIP 的 `_headers` | %d |' % entries,
        '| HTML 页面数 `' + ('7 + N' if profile.target == 'main' else '2') + '` | 目标内 HTML 页面数 | %d |' % counts['html'],
    ]
    for row in required_rows:
        if row not in text.splitlines():
            failures.append('upload instructions missing exact count/hash row: %s' % row)
    if zip_sha not in text or '%d 字节' % zip_size not in text:
        failures.append('upload instructions missing current ZIP size or SHA-256')
    rows = [line for line in text.splitlines() if line.startswith('| `')]
    expected_entries = sorted(manifest['pages'] + manifest['config'], key=lambda item: item['path'])
    if len(rows) != len(expected_entries):
        failures.append('upload file table row count differs from manifest')
    for entry in expected_entries:
        kind = '只进 ZIP' if entry['path'] == HEADERS_NAME else ('HTML' if entry['path'].endswith('.html') else '资源')
        row = '| `%s` | %s | %d | `%s` |' % (entry['path'], kind, entry['bytes'], entry['sha256'][:16])
        if row not in rows:
            failures.append('upload file table row differs: %s' % entry['path'])
    return failures


def prepare(root: Path, profile: Profile) -> tuple[dict, dict, dict, list[str]]:
    result = preflight(root, profile)
    page_set = result['page_set']
    sources = collect_sources(root, page_set, profile)
    manifest = build_manifest(page_set, sources, profile)
    failures = check_manifest(root, manifest, sources, page_set, profile)
    return result, sources, manifest, failures


def command_all(root: Path, profile: Profile) -> int:
    result, sources, manifest, failures = prepare(root, profile)
    if failures:
        raise PackFail(EXIT_VERIFY, 'manifest contract failed: ' + '; '.join(failures))
    page_set = result['page_set']
    names = package_names(page_set['names'])
    first = build_zip_bytes(root, names, profile)
    second = build_zip_bytes(root, names, profile)
    if first != second:
        raise PackFail(EXIT_VERIFY, 'two in-memory ZIP builds are not reproducible')
    failures = unpack_compare(first, root, manifest, page_set, profile)
    if failures:
        raise PackFail(EXIT_VERIFY, 'ZIP check failed: ' + '; '.join(failures))
    zip_sha = digest(first)
    upload = upload_rows(manifest, profile, len(first), zip_sha)
    failures = check_upload(root, manifest, upload.decode('utf-8'), profile, first)
    if failures:
        raise PackFail(EXIT_VERIFY, 'upload instructions failed: ' + '; '.join(failures))
    (root / profile.zip_rel).write_bytes(first)
    (root / profile.manifest_rel).write_bytes(serialize_manifest(manifest))
    (root / profile.upload_rel).write_bytes(upload)
    sys.stdout.write('%s: files=%d html=%d zip_entries=%d sha256=%s\n' %
                     (profile.target, manifest['counts']['pages'], manifest['counts']['html'],
                      manifest['counts']['pages'] + manifest['counts']['config'], zip_sha))
    return EXIT_OK


def command_manifest(root: Path, profile: Profile) -> int:
    result, sources, manifest, failures = prepare(root, profile)
    if failures:
        raise PackFail(EXIT_VERIFY, '; '.join(failures))
    zip_path = root / profile.zip_rel
    if not zip_path.is_file():
        raise PackFail(EXIT_VERIFY, '%s is missing; run all' % profile.zip_rel)
    zip_bytes = zip_path.read_bytes()
    failures = unpack_compare(zip_bytes, root, manifest, result['page_set'], profile)
    if failures:
        raise PackFail(EXIT_VERIFY, 'current ZIP differs from generated manifest: ' + '; '.join(failures))
    upload = upload_rows(manifest, profile, len(zip_bytes), digest(zip_bytes))
    (root / profile.manifest_rel).write_bytes(serialize_manifest(manifest))
    (root / profile.upload_rel).write_bytes(upload)
    return EXIT_OK


def command_zip(root: Path, profile: Profile) -> int:
    result, sources, manifest, failures = prepare(root, profile)
    if failures:
        raise PackFail(EXIT_VERIFY, '; '.join(failures))
    zip_bytes = build_zip_bytes(root, package_names(result['page_set']['names']), profile)
    failures = unpack_compare(zip_bytes, root, manifest, result['page_set'], profile)
    if failures:
        raise PackFail(EXIT_VERIFY, '; '.join(failures))
    (root / profile.zip_rel).write_bytes(zip_bytes)
    return EXIT_OK


def command_verify(root: Path, profile: Profile, zip_override: str | None = None) -> int:
    result = preflight(root, profile)
    page_set = result['page_set']
    sources = collect_sources(root, page_set, profile)
    manifest = manifest_from_disk(root, profile)
    zip_path = Path(zip_override) if zip_override else root / profile.zip_rel
    if not zip_path.is_absolute():
        zip_path = root / zip_path
    if not zip_path.is_file():
        raise PackFail(EXIT_VERIFY, '%s is missing' % zip_path)
    zip_bytes = zip_path.read_bytes()
    failures = check_manifest(root, manifest, sources, page_set, profile)
    failures += unpack_compare(zip_bytes, root, manifest, page_set, profile)
    if not zip_override:
        rebuilt1 = build_zip_bytes(root, package_names(page_set['names']), profile)
        rebuilt2 = build_zip_bytes(root, package_names(page_set['names']), profile)
        if rebuilt1 != rebuilt2 or zip_bytes != rebuilt1:
            failures.append('ZIP is not reproducible from current sources')
        upload_path = root / profile.upload_rel
        if not upload_path.is_file():
            failures.append('%s is missing' % profile.upload_rel)
        else:
            failures += check_upload(root, manifest, upload_path.read_text(encoding='utf-8'), profile, zip_bytes)
    if failures:
        raise PackFail(EXIT_VERIFY, '; '.join(failures))
    sys.stdout.write('%s package accepted: %d files, %d HTML, %d ZIP entries\n' %
                     (profile.target, manifest['counts']['pages'], manifest['counts']['html'],
                      manifest['counts']['pages'] + manifest['counts']['config']))
    return EXIT_OK


def main(argv=None, root=None) -> int:
    parser = argparse.ArgumentParser(prog='pack.py')
    parser.add_argument('command', nargs='?', default='all', choices=['manifest', 'zip', 'verify', 'all'])
    parser.add_argument('--root', default=None)
    parser.add_argument('--zip', dest='zip_path', default=None)
    parser.add_argument('--target', choices=['main', 'easteregg'], default='main')
    args = parser.parse_args(argv)
    if args.root:
        base = Path(args.root).resolve()
    elif root is not None:
        base = Path(root)
    else:
        base = BUILD_DIR.parent
    try:
        profile = profile_for(base, args.target)
        if args.command == 'manifest':
            return command_manifest(base, profile)
        if args.command == 'zip':
            return command_zip(base, profile)
        if args.command == 'verify':
            return command_verify(base, profile, args.zip_path)
        return command_all(base, profile)
    except PackFail as failure:
        sys.stderr.write('pack.py: %s\n' % failure)
        return failure.code


if __name__ == '__main__':
    sys.exit(main())
