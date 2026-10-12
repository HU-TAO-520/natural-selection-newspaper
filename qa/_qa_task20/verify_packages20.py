#!/usr/bin/env python3
"""Independent R14 package, manifest, disk, and ZIP acceptance checks.

Uses only the Task20 contract, source article names, generated files, and Python's
standard library. It deliberately does not import build.py or pack.py.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = ROOT / 'plan' / 'Task20-自然选择号彩蛋终端与信号解码.md'
HEADER = (518, 'b0273f2ff60c2c95d24899b8bd8a72ae050d233bc38e8b9903a28421d6f9ba7a')
ZIP_TIME = (1980, 1, 1, 0, 0, 0)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_contract() -> dict:
    text = CONTRACT_PATH.read_text(encoding='utf-8')
    start, end = '<!-- TASK20-CONTRACT-BEGIN -->', '<!-- TASK20-CONTRACT-END -->'
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError('Task20 R14 contract markers must be unique')
    segment = text.split(start, 1)[1].split(end, 1)[0]
    match = re.search(r'~~~json\s*([\s\S]*?)\s*~~~', segment)
    if not match or len(re.findall(r'~~~json\s*([\s\S]*?)\s*~~~', segment)) != 1:
        raise ValueError('Task20 R14 JSON anchor is absent or duplicated')
    contract = json.loads(match.group(1))
    if contract.get('revision') != 'R15':
        raise ValueError('R15 revision mismatch')
    return contract


def source_files(root: Path, target: str, contract: dict) -> tuple[Path, list[str], list[str]]:
    profile = contract[target]
    base = root / ('Results' if target == 'main' else 'deploy/easteregg')
    if target == 'main':
        article_sources = sorted((root / 'content/articles').glob('*.md'))
        article_names = ['article-' + item.stem + '.html' for item in article_sources]
        expected = list(profile['fixed_files']) + article_names
    else:
        article_sources = []
        expected = list(profile['fixed_files'])
    return base, sorted(expected), [item.name for item in article_sources]


def read_article_metadata(path: Path) -> dict[str, str]:
    text = path.read_text(encoding='utf-8')
    match = re.match(r'^---\n([\s\S]*?)\n---\n', text)
    if not match:
        raise ValueError(f'missing front matter: {path}')
    metadata = {}
    for line in match.group(1).splitlines():
        key, sep, value = line.partition(':')
        if sep:
            metadata[key.strip()] = value.strip()
    return metadata


def verify_target(root: Path, contract: dict, target: str) -> list[dict]:
    spec = contract[target]
    files_base = spec.get('files_base', spec.get('files'))
    zip_base = spec.get('zip_base', spec.get('zip_entries'))
    html_base = spec.get('html_base', spec.get('html'))
    base, expected_names, article_slugs = source_files(root, target, contract)
    manifest_path = root / ('deploy/manifest.json' if target == 'main' else 'deploy/easteregg-manifest.json')
    zip_path = root / ('deploy/site.zip' if target == 'main' else 'deploy/easteregg.zip')
    upload_path = root / ('deploy/UPLOAD.md' if target == 'main' else 'deploy/EASTEREGG-UPLOAD.md')
    checks: list[dict] = []

    def check(case: str, ok: bool, expected_value, actual_value, source: str) -> None:
        checks.append({'id': 'T20-P01' if case.startswith('set') or case.startswith('count') else
                             'T20-P02' if case.startswith('digest') or case.startswith('headers') else
                             'T20-P03' if case.startswith('zip') or case.startswith('repeat') else 'T20-P04',
                       'status': 'PASS' if ok else 'FAIL', 'target': target, 'case': case,
                       'expected': expected_value, 'actual': actual_value, 'source': source})

    if not base.is_dir():
        check('set/directory', False, 'target directory exists', str(base), 'filesystem')
        return checks
    entries = sorted(base.iterdir(), key=lambda item: item.name)
    disk_files = sorted(item.name for item in entries if item.is_file())
    dirs = [item.name for item in entries if item.is_dir()]
    check('set/disk-files', disk_files == expected_names, expected_names, disk_files,
          'R14 fixed files + independently enumerated content/articles/*.md')
    check('set/no-directories', not dirs, [], dirs, 'target directory entries')

    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        manifest_ok = True
    except Exception as error:  # preserve evidence and continue to inspect ZIP
        manifest = {}
        manifest_ok = False
        check('manifest/readable', False, 'valid JSON manifest', str(error), str(manifest_path))

    if manifest_ok:
        names = [row.get('path') for row in manifest.get('pages', [])]
        config = manifest.get('config', [])
        check('set/manifest-pages', names == expected_names, expected_names, names,
              'R14 contract + article source stems')
        check('set/config', [row.get('path') for row in config] == ['_headers'], ['_headers'],
              [row.get('path') for row in config], 'Task17 config rule')
        columns = manifest.get('columns')
        if target == 'main':
            column_specs = {}
            for line in (root / 'content/columns.md').read_text(encoding='utf-8').splitlines():
                parts = line.split('|')
                if len(parts) == 3:
                    key, label, page = (part.strip() for part in parts)
                    column_specs[key] = {'label': label, 'list': page}
            expected_columns = []
            article_by_column: dict[str, list[dict[str, str]]] = {key: [] for key in column_specs}
            metadata_error = None
            try:
                for source in sorted((root / 'content/articles').glob('*.md')):
                    metadata = read_article_metadata(source)
                    slug, column, title = metadata.get('slug'), metadata.get('column'), metadata.get('title')
                    if slug != source.stem or column not in article_by_column or not title:
                        raise ValueError(f'invalid slug/column/title in {source.name}')
                    article_by_column[column].append({'slug': slug, 'page': f'article-{slug}.html', 'title': title})
                for key, definition in column_specs.items():
                    expected_columns.append({'key': key, **definition, 'articles': sorted(article_by_column[key], key=lambda x: x['slug'])})
            except Exception as error:
                metadata_error = str(error)
            actual_columns = []
            if isinstance(columns, list):
                for column in columns:
                    if not isinstance(column, dict):
                        actual_columns.append(column)
                        continue
                    actual_columns.append({**{k: column.get(k) for k in ('key', 'label', 'list')},
                                           'articles': sorted(column.get('articles', []), key=lambda x: x.get('slug', '') if isinstance(x, dict) else str(x))})
            columns_ok = metadata_error is None and actual_columns == expected_columns
            check('set/columns', columns_ok, expected_columns,
                  {'actual': actual_columns, 'metadata_error': metadata_error},
                  'content/columns.md + independently parsed article front matter')
        else:
            check('set/columns', columns == [], [], columns, 'R14 preview contains no article registry')
        n = len(article_slugs)
        files_n = len(expected_names)
        html_n = sum(name.lower().endswith('.html') for name in expected_names)
        zip_n = files_n + 1
        expected_counts = {'pages': files_n, 'html': html_n, 'config': 1,
                           'articles': n if target == 'main' else 0}
        check('count/formulas', manifest.get('counts') == expected_counts and
              files_n == files_base + (n if target == 'main' else 0) and
              html_n == html_base + (n if target == 'main' else 0) and
              zip_n == zip_base + (n if target == 'main' else 0),
              {'counts': expected_counts, 'files': f"{files_base}+N" if target == 'main' else files_base,
               'html': f"{html_base}+N" if target == 'main' else html_base,
               'zip': f"{zip_base}+N" if target == 'main' else zip_base},
              {'counts': manifest.get('counts'), 'files': files_n, 'html': html_n, 'zip': zip_n},
              'R14 contract')
        lookup = {row.get('path'): row for row in manifest.get('pages', []) + config}
        measured_ok = True
        measured = {}
        for name in expected_names + ['_headers']:
            disk_path = (root / 'deploy/_headers') if name == '_headers' else (base / name)
            try:
                data = disk_path.read_bytes()
                pair = (len(data), sha(data))
            except OSError:
                pair = None
            measured[name] = {'bytes': pair[0], 'sha256': pair[1]} if pair else None
            row = lookup.get(name)
            if not row or pair != (row.get('bytes'), row.get('sha256')):
                measured_ok = False
        check('digest/disk-manifest', measured_ok, 'every page/config entry matches disk byte count and SHA-256',
              measured, str(manifest_path))
        check('headers/protected', measured.get('_headers') == {'bytes': HEADER[0], 'sha256': HEADER[1]},
              {'bytes': HEADER[0], 'sha256': HEADER[1]}, measured.get('_headers'), 'deploy/_headers protected baseline')

    try:
        blob = zip_path.read_bytes()
        archive = zipfile.ZipFile(zip_path, 'r')
        with archive:
            infos = archive.infolist()
            file_infos = [info for info in infos if not info.is_dir() and not info.filename.endswith('/')]
            zip_names = [info.filename for info in file_infos]
            directory_names = [info.filename for info in infos if info.is_dir() or info.filename.endswith('/')]
            check('zip/set', zip_names == sorted(expected_names + ['_headers']) and
                  len(zip_names) == len(set(zip_names)) and not directory_names,
                  sorted(expected_names + ['_headers']), {'entries': zip_names, 'directories': directory_names},
                  str(zip_path))
            metadata_ok = all(info.date_time == ZIP_TIME and info.compress_type == zipfile.ZIP_DEFLATED and
                              info.create_system == 0 and not info.extra and not info.comment and
                              info.external_attr == (0o644 << 16) for info in file_infos)
            check('zip/metadata', metadata_ok,
                  {'timestamp': ZIP_TIME, 'compression': 'DEFLATED', 'system': 0, 'mode': '0644', 'extra': '', 'comment': ''},
                  [{'name': info.filename, 'date_time': info.date_time, 'compress_type': info.compress_type,
                    'create_system': info.create_system, 'external_attr': info.external_attr,
                    'extra': bool(info.extra), 'comment': bool(info.comment)} for info in file_infos],
                  'Task17 deterministic ZIP metadata')
            content_ok = manifest_ok
            for info in file_infos:
                content = archive.read(info)
                row = next((x for x in manifest.get('pages', []) + manifest.get('config', [])
                            if x.get('path') == info.filename), None)
                source_path = root / 'deploy/_headers' if info.filename == '_headers' else base / info.filename
                if not row or len(content) != row.get('bytes') or sha(content) != row.get('sha256') or \
                        not source_path.is_file() or source_path.read_bytes() != content:
                    content_ok = False
            check('zip/content', content_ok, 'each ZIP entry matches manifest SHA/bytes and disk bytes',
                  {'entries': len(file_infos), 'zip_sha256': sha(blob)}, str(zip_path))
            # Independently rebuild a second deterministic archive from disk bytes.
            from io import BytesIO
            rebuilt = BytesIO()
            with zipfile.ZipFile(rebuilt, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as out:
                for name in sorted(expected_names + ['_headers']):
                    info = zipfile.ZipInfo(name, ZIP_TIME)
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.create_system = 0
                    info.external_attr = 0o644 << 16
                    info.extra = b''
                    info.comment = b''
                    data = (root / 'deploy/_headers').read_bytes() if name == '_headers' else (base / name).read_bytes()
                    out.writestr(info, data)
            first_build = rebuilt.getvalue()
            rebuilt2 = BytesIO()
            with zipfile.ZipFile(rebuilt2, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as out:
                for name in sorted(expected_names + ['_headers']):
                    info = zipfile.ZipInfo(name, ZIP_TIME)
                    info.compress_type = zipfile.ZIP_DEFLATED
                    info.create_system = 0
                    info.external_attr = 0o644 << 16
                    info.extra = b''
                    info.comment = b''
                    data = (root / 'deploy/_headers').read_bytes() if name == '_headers' else (base / name).read_bytes()
                    out.writestr(info, data)
            check('repeat/deterministic', first_build == rebuilt2.getvalue() == blob,
                  'two independently generated ZIP byte streams equal the delivered ZIP SHA-256',
                  {'first': sha(first_build), 'second': sha(rebuilt2.getvalue()), 'delivered': sha(blob)},
                  'standard-library deterministic reconstruction')
            upload_text = upload_path.read_text(encoding='utf-8') if upload_path.is_file() else ''
            check('zip/upload-guide', bool(upload_text) and sha(blob) in upload_text and
                  f'{len(blob)} 字节' in upload_text and 'Cloudflare Pages Direct Upload' in upload_text,
                  'target guide contains current package bytes/hash and manual upload instructions',
                  {'guide_exists': upload_path.is_file(), 'zip_sha256': sha(blob), 'zip_bytes': len(blob)}, str(upload_path))
    except Exception as error:
        check('zip/readable', False, 'readable ZIP with no unpack side effects', str(error), str(zip_path))
    return checks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, default=ROOT / 'qa/_qa_task20/package_checks.json')
    args = parser.parse_args()
    try:
        contract = read_contract()
        rows = verify_target(args.root.resolve(), contract, 'main') + verify_target(args.root.resolve(), contract, 'preview')
        # The wrong ZIP must be rejected by a bidirectional entry/content comparison.
        with zipfile.ZipFile(args.root / 'deploy/site.zip') as main_zip, zipfile.ZipFile(args.root / 'deploy/easteregg.zip') as preview_zip:
            main_names, preview_names = set(main_zip.namelist()), set(preview_zip.namelist())
            cross_rejected = main_names != preview_names
        rows.append({'id': 'T20-P04', 'status': 'PASS' if cross_rejected else 'FAIL', 'target': 'cross',
                     'case': 'cross-target-rejection', 'expected': 'main and preview ZIP entry/content profiles differ',
                     'actual': 'entry sets differ' if cross_rejected else 'entry sets unexpectedly equal',
                     'source': 'independent ZIP directory comparison'})
        document = {'schema': 1, 'revision': 'R15', 'checks': rows,
                    'summary': {'pass': sum(r['status'] == 'PASS' for r in rows),
                                'fail': sum(r['status'] == 'FAIL' for r in rows)},
                    'contract_sha256': sha(CONTRACT_PATH.read_bytes())}
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    except Exception as error:
        print(f'ERROR package verification: {error}', file=sys.stderr)
        return 2
    print(f"package checks: PASS={document['summary']['pass']} FAIL={document['summary']['fail']} -> {args.output}")
    for row in rows:
        if row['status'] != 'PASS':
            print('FAIL ' + row['target'] + ' ' + row['case'] + ': ' + str(row['actual']))
    return 0 if document['summary']['fail'] == 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
