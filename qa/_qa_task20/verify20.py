#!/usr/bin/env python3
"""Independent static verifier for Task20 artifacts, based on the written contract."""
from __future__ import annotations

import argparse
import hashlib
import html.parser
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / 'plan/Task20-自然选择号彩蛋终端与信号解码.md'
EGG = ROOT / 'build/easteregg'
REQUIRED_IDS = {
    'egg-start', 'egg-status', 'egg-stage-one', 'egg-stage-two', 'egg-stage-three',
    'egg-shift', 'egg-code', 'egg-answer', 'egg-departure-check', 'egg-routes-check',
    'egg-offset-telemetry', 'egg-offset-weapons', 'egg-offset-voice', 'egg-signals-check',
    'egg-ending', 'egg-replay', 'egg-return', 'egg-archive', 'egg-feedback',
}


class Document(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str | None], int]] = []
        self.stack: list[str] = []
        self.ids: dict[str, int] = {}
        self.labels: list[str] = []
        self.paragraphs: dict[str, str] = {}
        self._paragraph: str | None = None
        self._paragraph_depth = 0
        self._paragraph_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        self.tags.append((tag, values, len(self.stack)))
        ident = values.get('id')
        if ident:
            self.ids[ident] = self.ids.get(ident, 0) + 1
        if tag == 'label' and values.get('for'):
            self.labels.append(str(values['for']))
        if tag == 'p' and ident and ident.startswith('egg-p'):
            self._paragraph = ident
            self._paragraph_depth = len(self.stack) + 1
            self._paragraph_parts = []
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if self._paragraph and tag == 'p' and len(self.stack) == self._paragraph_depth:
            self.paragraphs[self._paragraph] = ''.join(self._paragraph_parts)
            self._paragraph = None
            self._paragraph_parts = []
        if tag in self.stack:
            index = len(self.stack) - 1 - self.stack[::-1].index(tag)
            del self.stack[index:]

    def handle_data(self, data: str) -> None:
        if self._paragraph:
            self._paragraph_parts.append(data)


def read(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def extract_story() -> dict[str, str]:
    source = read(PLAN)
    rows = re.findall(r'^\| (P\d{2}) \|[^|]*\| (.*?) \|\s*$', source, re.M)
    story = {key: text for key, text in rows}
    # There are 17 fixed paragraphs. Keep the count explicit to detect plan drift.
    if len(story) != 17 or set(story) != {f'P{x:02d}' for x in [0, 1, 2, 10, 11, 12, 13, 20, 21, 22, 23, 30, 31, 32, 33, 34, 35]}:
        raise ValueError(f'Task20 §5.3 paragraph IDs drifted: {sorted(story)}')
    return story


def verify_story() -> list[str]:
    terminal = read(EGG / 'terminal.html')
    missing = [name for name in ('terminal.html', 'not-found.html') if not (EGG / name).is_file()]
    if missing:
        raise ValueError('missing templates: ' + ', '.join(missing))
    parsed = Document()
    parsed.feed(terminal)
    story = extract_story()
    expected_ids = {'egg-' + key.lower() for key in story}
    actual_ids = set(parsed.paragraphs)
    if actual_ids != expected_ids:
        raise ValueError(f'story paragraph IDs differ: missing={sorted(expected_ids-actual_ids)} extra={sorted(actual_ids-expected_ids)}')
    mismatches = [key for key, text in story.items() if parsed.paragraphs['egg-' + key.lower()] != text]
    if mismatches:
        raise ValueError('story text mismatch: ' + ', '.join(mismatches))
    if any(count != 1 for count in parsed.ids.values()):
        raise ValueError('duplicate IDs: ' + ', '.join(key for key, count in parsed.ids.items() if count != 1))
    if not REQUIRED_IDS <= parsed.ids.keys():
        raise ValueError('required IDs missing: ' + ', '.join(sorted(REQUIRED_IDS - parsed.ids.keys())))
    if sum(1 for tag, _, _ in parsed.tags if tag == 'main') != 1 or sum(1 for tag, _, _ in parsed.tags if tag == 'h1') != 1:
        raise ValueError('terminal must contain one main and one h1')
    if '<html lang="zh-Hant" class="no-js">' not in terminal:
        raise ValueError('terminal root must retain no-js initial state')
    if terminal.count('{{RETURN_HREF}}') != 3 or terminal.count('{{CSS_HREF}}') != 1 or terminal.count('{{JS_SRC}}') != 1:
        raise ValueError('terminal must contain exactly the three declared URL slots in approved counts')
    if len(parsed.labels) < 12 or any(label not in parsed.ids for label in parsed.labels):
        raise ValueError('a visible label points to a missing control')
    for tag, attrs, _ in parsed.tags:
        if 'style' in attrs or any(name.lower().startswith('on') for name in attrs) or any(name.lower().startswith('data-') for name in attrs):
            raise ValueError(f'inline style/event/data attribute in <{tag}>')
        if tag == 'script' and (attrs.get('src') != '{{JS_SRC}}' or 'defer' not in attrs):
            raise ValueError('only the deferred external JS_SRC script is allowed')
    if re.search(r'<script\b(?![^>]*\bsrc=)', terminal, re.I):
        raise ValueError('inline script is forbidden')
    for ident in REQUIRED_IDS:
        if not ident.startswith('egg-'):
            raise ValueError('unregistered non-egg ID ' + ident)
    if not all(f'id="{ident}"' in terminal for ident in ('egg-start-controls', 'egg-departure-controls', 'egg-routes-controls', 'egg-signals-controls')):
        raise ValueError('all JS-only interaction groups must be present')
    for group in ('egg-start-controls', 'egg-departure-controls', 'egg-routes-controls', 'egg-signals-controls'):
        if not re.search(r'<div\b(?=[^>]*\bid="' + group + r'")(?=[^>]*\bhidden\b)[^>]*>', terminal):
            raise ValueError(group + ' must start hidden')
    if 'id="egg-feedback" role="status" aria-live="polite"' not in terminal:
        raise ValueError('feedback must be an aria-live status region')
    if not re.search(r'id="egg-p32" class="egg-quote">没关系的，都一样。</p>\s*<p class="egg-attribution">章北海，《三体II·黑暗森林》</p>', terminal):
        raise ValueError('P32 attribution must be adjacent and outside the quote')

    not_found = read(EGG / 'not-found.html')
    parsed404 = Document()
    parsed404.feed(not_found)
    for literal in ('<title>档案不存在｜自然选择号</title>', '<h1 class="egg-title">档案不存在</h1>', '这份档案不存在，或已经被移走。', 'href="/">返回终端', 'href="https://old-ns-news.pages.dev/">返回报社', 'href="/easteregg.css"'):
        if literal not in not_found:
            raise ValueError('preview not-found contract missing: ' + literal)
    if sum(1 for tag, _, _ in parsed404.tags if tag == 'main') != 1 or sum(1 for tag, _, _ in parsed404.tags if tag == 'h1') != 1:
        raise ValueError('preview not-found page must contain one main and one h1')
    if 'easteregg.js' in not_found or '{{' in not_found or '}}' in not_found:
        raise ValueError('preview not-found template must have no game JS or unresolved URL slot')
    return [f'{key}: exact' for key in story] + ['terminal structure: valid', 'preview 404: valid']


def verify_binding() -> list[str]:
    terminal = read(EGG / 'terminal.html')
    ui = read(EGG / 'ui.js')
    core = read(EGG / 'core.js')
    parsed = Document()
    parsed.feed(terminal)
    selectors = set(re.findall(r"BY_ID\('([^']+)'\)", ui))
    missing = selectors - parsed.ids.keys()
    if missing:
        raise ValueError('ui.js selectors do not exist in template: ' + ', '.join(sorted(missing)))
    for key in ['natural', 'blue', 'enterprise', 'deep', 'ultimate', 'quantum', 'bronze']:
        ident = 'egg-route-' + key
        if parsed.ids.get(ident) != 1 or f'for="{ident}"' not in terminal:
            raise ValueError(ident + ' must have a unique visible label')
    for ident in ['egg-shift', 'egg-answer', 'egg-offset-telemetry', 'egg-offset-weapons', 'egg-offset-voice']:
        if parsed.ids.get(ident) != 1 or f'for="{ident}"' not in terminal:
            raise ValueError(ident + ' must have a unique visible label')
    for ident in ['egg-departure-form', 'egg-departure-check', 'egg-routes-check', 'egg-signals-check', 'egg-start', 'egg-replay', 'egg-return', 'egg-archive']:
        if parsed.ids.get(ident) != 1:
            raise ValueError(ident + ' must exist exactly once')
    for event_name in ['click', 'input', 'change', 'submit']:
        if len(re.findall(r"document\.addEventListener\('" + event_name + r"'", ui)) != 1:
            raise ValueError('document ' + event_name + ' delegation must be bound exactly once')
    if "event.preventDefault()" not in ui or "event.target.id !== 'egg-departure-form'" not in ui:
        raise ValueError('departure form submit must be handled once and prevent navigation')
    if 'innerHTML' in ui or re.search(r'\b(?:eval|Function)\s*\(', ui) or any(token in ui for token in ['fetch(', 'XMLHttpRequest', 'WebSocket', 'import(']):
        raise ValueError('ui.js contains an unsafe or network-based interaction path')
    if re.search(r'\b(?:style\s*\.|setAttribute\s*\(\s*["\']style|dataset\b|data-[\w-]+)', ui + terminal, re.I):
        raise ValueError('runtime or template uses inline style/data attributes')
    if 'sessionStorage' not in ui or 'try {' not in ui or 'storage = null' not in ui:
        raise ValueError('session storage access must have a memory fallback')
    if 'NSBridgeCore.reduce' not in ui or 'NSBridgeCore.restore' not in ui:
        raise ValueError('DOM layer must route state through the core contract')
    if 'no-js' not in ui or 'js' not in ui or 'function fallback()' not in ui:
        raise ValueError('initialization failure must preserve the no-JS archive')
    if 'function fallback()' not in ui or 'setHidden(BY_ID(id), false)' not in ui:
        raise ValueError('failure fallback must restore the full static archive')
    if 'innerHTML' in core or any(token in core for token in ['fetch(', 'XMLHttpRequest', 'WebSocket', 'eval(', 'new Function']):
        raise ValueError('core.js must remain offline and free of dynamic code execution')
    return ['ui selectors resolve', 'labels/control map', 'single delegated bindings', 'storage fallback', 'static failure fallback', 'no inline/network/dynamic code']


def contrast(foreground: str, background: str) -> float:
    def channel(value: int) -> float:
        n = value / 255
        return n / 12.92 if n <= 0.04045 else ((n + 0.055) / 1.055) ** 2.4
    fg = [channel(int(foreground[i:i + 2], 16)) for i in (1, 3, 5)]
    bg = [channel(int(background[i:i + 2], 16)) for i in (1, 3, 5)]
    lf = sum(weight * value for weight, value in zip((.2126, .7152, .0722), fg))
    lb = sum(weight * value for weight, value in zip((.2126, .7152, .0722), bg))
    return (max(lf, lb) + .05) / (min(lf, lb) + .05)


def verify_style() -> list[str]:
    egg_css = read(EGG / 'styles.css')
    paper_css = (ROOT / 'Results/styles.css').read_bytes()
    original = (ROOT / 'qa/_qa_task20/baseline/sources/Results/styles.css').read_bytes()
    if not paper_css.startswith(original):
        raise ValueError('Results/styles.css existing bytes changed; R14 must append only')
    suffix = paper_css[len(original):].decode('utf-8')
    if not suffix.startswith('\n/* Task20 home entry */') or suffix.count('.home-easteregg-link') != 3:
        raise ValueError('paper CSS must append one marked home-easteregg-link section')
    if re.sub(r'/\*[\s\S]*?\*/', '', suffix).strip() != '.home-easteregg-link {\n  display: inline-flex;\n  min-block-size: 44px;\n  align-items: center;\n  vertical-align: middle;\n  color: inherit;\n  text-decoration: none;\n}\n\n.home-easteregg-link:hover,\n.home-easteregg-link:focus-visible {\n  text-decoration: underline;\n}':
        raise ValueError('paper CSS added rules outside the registered link selector')
    if re.search(r'@import|@font-face|url\s*\(|https?:|data:', egg_css, re.I):
        raise ValueError('easteregg CSS must not load external assets')
    classes = set(re.findall(r'\.([a-zA-Z_][\w-]*)', re.sub(r'/\*[\s\S]*?\*/', '', egg_css)))
    if any(not name.startswith('egg-') for name in classes):
        raise ValueError('unregistered non-egg CSS class: ' + ', '.join(sorted(name for name in classes if not name.startswith('egg-'))))
    used_classes = set(re.findall(r'class\s*=\s*"([^"]+)"', read(EGG / 'terminal.html') + read(EGG / 'not-found.html')))
    used_classes = {item for group in used_classes for item in group.split()}
    used_classes |= set(re.findall(r"['\"](egg-[a-zA-Z0-9_-]+)['\"]", read(EGG / 'ui.js')))
    orphaned = classes - used_classes
    if orphaned:
        raise ValueError('orphan CSS classes: ' + ', '.join(sorted(orphaned)))
    required = {
        'ink': '#dce9e6', 'muted': '#9aacaf', 'signal': '#71c5b5',
        'warning': '#d8b77a', 'fault': '#e8a39b'
    }
    backgrounds = ['#0b1117', '#131e26']
    for name, color in required.items():
        if min(contrast(color, bg) for bg in backgrounds) < 4.5:
            raise ValueError(f'{name} text contrast below 4.5:1')
    if not re.search(r'@media\s*\(min-width:\s*769px\)', egg_css) or 'grid-template-columns: minmax(0, 1fr);' not in egg_css:
        raise ValueError('mobile single-column and 769px desktop breakpoint must be present')
    if not re.search(r'@media\s*\(prefers-reduced-motion:\s*reduce\)', egg_css):
        raise ValueError('reduced-motion override missing')
    return ['paper CSS byte prefix preserved', 'home selector isolated', 'egg CSS local and registered', 'text contrast >= 4.5:1', 'responsive/reduced-motion rules']


def verify_main_candidate(output: Path) -> list[str]:
    expected_articles = list((ROOT / 'content/articles').glob('*.md'))
    files = sorted(item.name for item in output.iterdir() if item.is_file())
    expected_count = 10 + len(expected_articles)
    if len(files) != expected_count:
        raise ValueError(f'main candidate file count {len(files)} != 10+N ({expected_count})')
    html_files = [name for name in files if name.endswith('.html')]
    if len(html_files) != 6 + len(expected_articles):
        raise ValueError('main candidate HTML count differs from 6+N')
    baseline = ROOT / 'qa/_qa_task20/baseline/Results'
    stable = [name for name in files if name.endswith('.html') and name not in {'index.html', 'easteregg.html'}]
    changed = [name for name in stable if (baseline / name).read_bytes() != (output / name).read_bytes()]
    if changed:
        raise ValueError('existing non-home HTML changed: ' + ', '.join(changed))
    if (baseline / 'script.js').read_bytes() != (output / 'script.js').read_bytes():
        raise ValueError('shared navigation script changed')
    old_css = (ROOT / 'qa/_qa_task20/baseline/Results/styles.css').read_bytes()
    if not (output / 'styles.css').read_bytes().startswith(old_css):
        raise ValueError('shared paper CSS prefix changed')
    index_html = (output / 'index.html').read_text(encoding='utf-8')
    wrapper = '<p class="home-section__text">报社成立于“<a class="home-easteregg-link" href="easteregg.html">鸽子衔枝之年</a>”。</p>'
    if index_html.count(wrapper) != 1 or index_html.count('href="easteregg.html"') != 1:
        raise ValueError('home entry must be the single exact approved link wrapper')
    game = (output / 'easteregg.html').read_text(encoding='utf-8')
    if '<link rel="stylesheet" href="easteregg.css">' not in game or '<script src="easteregg.js" defer></script>' not in game:
        raise ValueError('main game is missing its local generated assets')
    if '<title>自然选择号：最后的回波</title>' not in game:
        raise ValueError('main game identity missing')
    if not (output / 'easteregg.css').is_file() or not (output / 'easteregg.js').is_file():
        raise ValueError('main generated assets missing')
    if len(set(files)) != len(files):
        raise ValueError('duplicate output names')
    return [f'files={len(files)} (10+N)', f'html={len(html_files)} (6+N)', f'unchanged existing HTML={len(stable)}', 'shared script unchanged', 'home wrapper unique', 'game local assets present']


def verify_dual_target(main_root: Path, preview_root: Path) -> list[str]:
    from hashlib import sha256
    contract = json.loads(re.search(r'<!-- TASK20-CONTRACT-BEGIN -->\s*~~~json\s*([\s\S]*?)\s*~~~\s*<!-- TASK20-CONTRACT-END -->', read(PLAN)).group(1))
    preview_files = sorted(path.name for path in preview_root.iterdir() if path.is_file())
    if preview_files != sorted(contract['preview']['fixed_files']):
        raise ValueError(f'preview files differ from R14: {preview_files}')
    main_html = (main_root / contract['main']['egg_html']).read_text(encoding='utf-8')
    preview_html = (preview_root / 'index.html').read_text(encoding='utf-8')
    main_css = next(value for value in contract['main']['resources'] if value.startswith('easteregg') and value.endswith('.css'))
    main_js = next(value for value in contract['main']['resources'] if value.startswith('easteregg') and value.endswith('.js'))
    main_patterns = [
        (f'href="{contract["main"]["return_href"]}"', 'href="__RETURN_HREF__"', 3),
        (f'href="{main_css}"', 'href="__CSS_HREF__"', 1),
        (f'src="{main_js}"', 'src="__JS_SRC__"', 1),
    ]
    preview_patterns = [
        (f'href="{contract["preview"]["return_href"]}"', 'href="__RETURN_HREF__"', 3),
        (f'href="/{main_css}"', 'href="__CSS_HREF__"', 1),
        (f'src="/{main_js}"', 'src="__JS_SRC__"', 1),
    ]
    for text, patterns, label in [(main_html, main_patterns, 'main'), (preview_html, preview_patterns, 'preview')]:
        for source, replacement, count in patterns:
            if text.count(source) != count:
                raise ValueError(f'{label} terminal URL count {source}: expected {count}, got {text.count(source)}')
    for original, replacement, _ in main_patterns:
        main_html = main_html.replace(original, replacement)
    for original, replacement, _ in preview_patterns:
        preview_html = preview_html.replace(original, replacement)
    if main_html != preview_html:
        raise ValueError('main/preview terminal differs outside the three approved URL slots')
    for name in (main_css, main_js):
        main_asset = (main_root / name).read_bytes()
        preview_asset = (preview_root / name).read_bytes()
        if main_asset != preview_asset:
            raise ValueError(f'{name} differs between main and preview')
    error_page = (preview_root / '404.html').read_text(encoding='utf-8')
    if 'href="/easteregg.css"' not in error_page or 'src=' in error_page or 'easteregg.js' in error_page:
        raise ValueError('preview 404 must use root-relative CSS and no game script')
    return [f'preview files={len(preview_files)}', 'terminal differs only in three URL slots', 'CSS and JS hashes identical', 'preview 404 root CSS / no game JS']


def verify_static() -> list[str]:
    source = read(PLAN)
    anchor = re.search(r'<!-- TASK20-CONTRACT-BEGIN -->\s*~~~json\s*([\s\S]*?)\s*~~~\s*<!-- TASK20-CONTRACT-END -->', source)
    if not anchor or source.count('<!-- TASK20-CONTRACT-BEGIN -->') != 1 or source.count('<!-- TASK20-CONTRACT-END -->') != 1:
        raise ValueError('R14 contract anchor is absent or duplicated')
    contract = json.loads(anchor.group(1))
    if contract.get('revision') != 'R15':
        raise ValueError('contract revision is not R15')
    main_spec, preview_spec = contract['main'], contract['preview']
    main_root, preview_root = ROOT / 'Results', ROOT / 'deploy/easteregg'
    manifest = json.loads((ROOT / 'deploy/manifest.json').read_text(encoding='utf-8'))
    preview_manifest = json.loads((ROOT / 'deploy/easteregg-manifest.json').read_text(encoding='utf-8'))
    article_names = sorted('article-' + path.stem + '.html' for path in (ROOT / 'content/articles').glob('*.md'))
    expected_main = sorted(main_spec['fixed_files'] + article_names)
    expected_preview = sorted(preview_spec['fixed_files'])
    checks = []

    def require(case: str, condition: bool, expected: object, actual: object, source_name: str) -> None:
        if not condition:
            raise ValueError(f'{case}: expected {expected!r}, got {actual!r} ({source_name})')
        checks.append(case)

    disk_main = sorted(item.name for item in main_root.iterdir() if item.is_file())
    disk_preview = sorted(item.name for item in preview_root.iterdir() if item.is_file())
    require('main-file-set', disk_main == expected_main, expected_main, disk_main, 'R14 fixed files + content article stems')
    require('preview-file-set', disk_preview == expected_preview, expected_preview, disk_preview, 'R14 preview fixed files')
    main_dirs = [item.name for item in main_root.iterdir() if item.is_dir()]
    preview_dirs = [item.name for item in preview_root.iterdir() if item.is_dir()]
    require('main-no-directories', not main_dirs, [], main_dirs, 'Results directory')
    require('preview-no-directories', not preview_dirs, [], preview_dirs, 'preview directory')

    html_names = sorted(name for name in disk_main if name.lower().endswith('.html'))
    paper = sorted(main_spec['paper_fixed_html'] + article_names)
    roles = paper + [main_spec['egg_html'], main_spec['error_html']]
    require('role-partition', sorted(roles) == html_names and len(set(roles)) == len(roles),
            html_names, {'paper': paper, 'egg': [main_spec['egg_html']], 'error': [main_spec['error_html']]}, 'R14 page-role sets')
    require('main-manifest-set', sorted(row['path'] for row in manifest['pages']) == expected_main,
            expected_main, sorted(row['path'] for row in manifest['pages']), 'deploy/manifest.json')
    n = len(article_names)
    expected_counts = {'pages': main_spec['files_base'] + n, 'html': main_spec['html_base'] + n, 'config': 1, 'articles': n}
    require('main-counts', manifest['counts'] == expected_counts, expected_counts, manifest['counts'], 'R15 contract bases + independent article source count')
    require('preview-manifest-set', sorted(row['path'] for row in preview_manifest['pages']) == expected_preview,
            expected_preview, sorted(row['path'] for row in preview_manifest['pages']), 'deploy/easteregg-manifest.json')
    expected_preview_counts = {'pages': 4, 'html': 2, 'config': 1, 'articles': 0}
    require('preview-counts', preview_manifest['counts'] == expected_preview_counts and preview_manifest['columns'] == [],
            {'counts': expected_preview_counts, 'columns': []},
            {'counts': preview_manifest['counts'], 'columns': preview_manifest['columns']}, 'R14 preview profile')

    old_index = (ROOT / 'qa/_qa_task20/baseline/Results/index.html').read_text(encoding='utf-8')
    new_index = (main_root / 'index.html').read_text(encoding='utf-8')
    wrapper = '<p class="home-section__text">报社成立于“<a class="home-easteregg-link" href="easteregg.html">鸽子衔枝之年</a>”。</p>'
    require('home-wrapper-unique', new_index.count(wrapper) == 1 and new_index.count('href="easteregg.html"') == 1,
            'single exact wrapper', new_index.count(wrapper), 'Results/index.html')
    restored = new_index.replace(wrapper, '<p class="home-section__text">报社成立于“鸽子衔枝之年”。</p>')
    main_open = '  <main class="main-content" id="main-content" tabindex="-1">'
    def interior(value):
        cut = value.index(main_open) + len(main_open)
        return value[cut:value.index('  </main>')]
    # R15：开工快照钉的是首页正文；导航在公共壳里，五项导航属合法变化，不进这条腿。
    restored, old_index = interior(restored), interior(old_index)
    require('home-index-byte-restoration', restored == old_index, 'R15 home <main> interior identical to kickoff snapshot',
            {'restored_chars': len(restored), 'old_chars': len(old_index)}, 'Task20 baseline index')
    main_tag = re.search(r'<main\b[^>]*>([\s\S]*?)</main>', new_index)
    require('home-main-found', main_tag is not None, 'one main element', 'missing', 'Results/index.html')
    home_counts = {tag: (1 if tag == 'main' else len(re.findall(r'<%s\b' % tag, main_tag.group(1), re.I))) for tag in contract['home']['tags']}
    require('home-tag-counts-r14', home_counts == contract['home']['tags'], contract['home']['tags'], home_counts, 'R14 home tags including a=4')
    game_in_columns = any(article['page'] == main_spec['egg_html'] for column in manifest['columns'] for article in column['articles'])
    require('game-excluded-from-article-index', not game_in_columns, 'game absent from article lists', game_in_columns, 'manifest column maps')

    main_game = (main_root / main_spec['egg_html']).read_text(encoding='utf-8')
    preview_game = (preview_root / 'index.html').read_text(encoding='utf-8')
    game_title = contract['game']['title']
    require('game-identity-main', '<title>' + game_title + '</title>' in main_game and '<h1 class="egg-title">' + game_title + '</h1>' in main_game,
            game_title, 'title and h1 inspected', 'main easteregg.html')
    require('main-game-assets', '<link rel="stylesheet" href="easteregg.css">' in main_game and '<script src="easteregg.js" defer></script>' in main_game,
            'easteregg.css + deferred easteregg.js', 'asset references inspected', 'main game HTML')
    require('preview-root-assets', '<link rel="stylesheet" href="/easteregg.css">' in preview_game and '<script src="/easteregg.js" defer></script>' in preview_game,
            '/easteregg.css + deferred /easteregg.js', 'asset references inspected', 'preview index.html')
    css_main = (main_root / 'easteregg.css').read_bytes()
    css_preview = (preview_root / 'easteregg.css').read_bytes()
    js_main = (main_root / 'easteregg.js').read_bytes()
    js_preview = (preview_root / 'easteregg.js').read_bytes()
    require('same-game-css-bytes', css_main == css_preview, hashlib.sha256(css_main).hexdigest(), hashlib.sha256(css_preview).hexdigest(), 'main/preview CSS')
    require('same-game-js-bytes', js_main == js_preview, hashlib.sha256(js_main).hexdigest(), hashlib.sha256(js_preview).hexdigest(), 'main/preview JS')
    main_404 = (main_root / '404.html').read_text(encoding='utf-8')
    preview_404 = (preview_root / '404.html').read_text(encoding='utf-8')
    require('main-404-shell', '<link rel="stylesheet" href="/styles.css">' in main_404 and 'easteregg.js' not in main_404,
            'main CSS and no game JS', '404 bytes inspected', 'main 404.html')
    require('preview-404-shell', '<link rel="stylesheet" href="/easteregg.css">' in preview_404 and 'easteregg.js' not in preview_404,
            'preview root CSS and no game JS', '404 bytes inspected', 'preview 404.html')
    all_game = main_game + preview_game + css_main.decode('utf-8') + js_main.decode('utf-8')
    require('no-unresolved-slots', '{{' not in all_game and '}}' not in all_game, '0 template delimiters', all_game.count('{{') + all_game.count('}}'), 'built game assets')
    require('no-inline-code', not re.search(r'<script\b(?![^>]*\bsrc=)|\sstyle\s*=|\son[a-z]+\s*=|\bdata-[\w-]+\s*=', all_game, re.I),
            'no inline script/style/event/data attrs', 'scanner found no matches', 'main and preview game outputs')
    preview_without_return = preview_game.replace(preview_spec['return_href'], '')
    require('preview-approved-return-count', preview_game.count(preview_spec['return_href']) == 3,
            3, preview_game.count(preview_spec['return_href']), 'R14 preview return URL slots')
    require('no-game-network-api', not re.search(r'\bfetch\s*\(|XMLHttpRequest|WebSocket|\bimport\s*\(|\brequire\s*\(|https?://|url\s*\(',
            main_game + preview_without_return + css_main.decode('utf-8') + js_main.decode('utf-8'), re.I),
            'no network/dynamic loader references outside the three fixed preview return links', 'scanner found no matches', 'game HTML/CSS/JS')
    require('game-script-separate-from-paper-shell', 'script.js' not in main_game, 'no paper script on independent game page',
            'paper script absent', 'main game HTML')
    return checks


def structured_report(path: Path, phase: str, results: list[str], status: str) -> None:
    files = []
    for target, root in [('main', ROOT / 'Results'), ('preview', ROOT / 'deploy/easteregg')]:
        if root.is_dir():
            for item in sorted(root.iterdir()):
                if item.is_file():
                    blob = item.read_bytes()
                    files.append({'target': target, 'file': item.name, 'bytes': len(blob), 'sha256': hashlib.sha256(blob).hexdigest()})
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({'schema': 1, 'phase': phase, 'status': status, 'results': results,
                                'files': files, 'verifier_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                                'contract_sha256': hashlib.sha256(PLAN.read_bytes()).hexdigest()},
                               ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', choices=['story', 'binding', 'style', 'main-candidate', 'dual-target', 'static'], required=True)
    parser.add_argument('--root', type=Path)
    parser.add_argument('--preview-root', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    try:
        if args.phase == 'main-candidate':
            results = verify_main_candidate(args.root or (ROOT / 'qa/_qa_task20/stage-main'))
        elif args.phase == 'dual-target':
            results = verify_dual_target(args.root or (ROOT / 'Results'), args.preview_root or (ROOT / 'deploy/easteregg'))
        elif args.phase == 'static':
            results = verify_static()
        else:
            results = {'story': verify_story, 'binding': verify_binding, 'style': verify_style}[args.phase]()
    except Exception as exc:  # QA tool reports a concise contract failure.
        print(f'FAIL {args.phase}: {exc}')
        if args.report:
            structured_report(args.report, args.phase, [str(exc)], 'FAIL')
        return 1
    print(f'PASS {args.phase}: {len(results)} checks')
    for result in results:
        print('  ' + result)
    if args.report:
        structured_report(args.report, args.phase, results, 'PASS')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
