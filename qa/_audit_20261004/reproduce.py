"""Read-only review of production files; reproduction writes stay in this directory."""
import contextlib
import hashlib
import io
import json
import shutil
import sys
import tempfile
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / 'build'))
import build as builder
import pack as packer

tempfile.tempdir = str(HERE / 'temp')
(HERE / 'temp').mkdir(exist_ok=True)
observations = []


def fingerprint():
    return {
        str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for directory in ('content', 'build', 'Results', 'deploy')
        for p in (ROOT / directory).rglob('*') if p.is_file()
    }


def copy_case(name):
    target = HERE / 'cases' / name
    if target.exists():
        raise RuntimeError('Use a fresh case directory: ' + str(target))
    target.mkdir(parents=True)
    for directory in ('content', 'build', 'Results', 'deploy'):
        shutil.copytree(ROOT / directory, target / directory)
    shutil.copytree(ROOT / 'qa/_qa_task13', target / 'qa/_qa_task13')
    return target


def mutate_article(target, old, new):
    p = target / 'content/articles/school-course-selection-results.md'
    data = p.read_bytes()
    old_bytes = old.encode('utf-8')
    if old_bytes not in data:
        raise RuntimeError('Reproduction source changed')
    p.write_bytes(data.replace(old_bytes, new.encode('utf-8')))


def build_result(target):
    try:
        code = builder.run(target, target / 'Results', False)
        return {'exit_code': code, 'detail': 'build succeeded'}
    except builder.Fail as failure:
        return {'exit_code': failure.code, 'detail': failure.rendered}
    except Exception as failure:
        return {'exception': type(failure).__name__, 'detail': str(failure)}


before = fingerprint()
for name, old, new in (
    ('invalid-calendar-date', 'date: 2026-09-29', 'date: 2027-02-31'),
    ('invalid-visible-date', '9月29日', '99月99日'),
    ('title-with-space', 'title: 我校校本课程选择结果公布', 'title: Windows 10 使用记录'),
    ('ampersand-in-body', '祝愿没有进入', '我们讨论 R&D，然后祝愿没有进入'),
    ('optional-display-date', 'display_date: 9月29日\n', ''),
):
    target = copy_case(name)
    mutate_article(target, old, new)
    observations.append({'case': name, **build_result(target)})

target = copy_case('pack-failed-verification')
old_zip = hashlib.sha256((target / 'deploy/site.zip').read_bytes()).hexdigest()
try:
    with mock.patch.object(packer, 'unpack_compare', return_value=['injected verification failure']):
        packer.command_all(target)
except packer.PackFail as failure:
    observations.append({
        'case': 'pack-failed-verification', 'detail': str(failure),
        'old_zip_sha256': old_zip,
        'zip_exists_after_failure': (target / 'deploy/site.zip').exists(),
        'manifest_exists_after_failure': (target / 'deploy/manifest.json').exists(),
        'upload_exists_after_failure': (target / 'deploy/UPLOAD.md').exists(),
    })

target = copy_case('build-write-failure')
names = sorted(builder.build_pages(target)['pages'])
old_contents = {name: (target / 'Results' / name).read_bytes() for name in names}
# Both article HTML and the later index need to change for this new title.
mutate_article(target, 'title: 我校校本课程选择结果公布', 'title: 校本课程分班结果更新')
original_write = Path.write_bytes


def fail_index_write(path, data):
    if path == target / 'Results/index.html':
        raise OSError('injected disk write failure')
    return original_write(path, data)


with mock.patch.object(Path, 'write_bytes', fail_index_write):
    result = build_result(target)
observations.append({
    'case': 'build-write-failure', **result,
    'changed_pages_after_failure': [
        name for name in names if (target / 'Results' / name).read_bytes() != old_contents[name]
    ],
    'index_preserved': (target / 'Results/index.html').read_bytes() == old_contents['index.html'],
})

# Test the HTTP review's current title identity check against a changed article body.
source = (ROOT / 'Results/article-school-course-selection-results.html').read_text(encoding='utf-8')
changed = source.replace('我校校本课程于今日下午正式公布', '这里是另一个版本的正文')
title = '<title>我校校本课程选择结果公布｜自然选择号</title>'
observations.append({
    'case': 'online-title-check-blind-spot',
    'changed_html_passes_current_title_identity_check': title in changed,
    'body_actually_changed': source != changed,
    'paragraph_count_unchanged': source.count('<p>') == changed.count('<p>'),
})

result = {'production_files_unchanged': before == fingerprint(), 'observations': observations}
(HERE / 'reproduction_results.json').write_text(
    json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n'
)
print(json.dumps(result, ensure_ascii=False, indent=2))
