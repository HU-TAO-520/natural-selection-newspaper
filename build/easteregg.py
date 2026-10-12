"""Deterministic renderer for the single-source Task20 game and preview target."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path


CONTRACT_BEGIN = '<!-- TASK20-CONTRACT-BEGIN -->'
CONTRACT_END = '<!-- TASK20-CONTRACT-END -->'
SLOT_PATTERN = re.compile(r'\{\{([A-Z_]+)\}\}')
HOME_ENTRY_PARAGRAPH = '<p class="home-section__text">报社成立于“<a class="home-easteregg-link" href="easteregg.html">鸽子衔枝之年</a>”。</p>'
HOME_ORIGINAL_PARAGRAPH = '<p class="home-section__text">报社成立于“鸽子衔枝之年”。</p>'


def load_contract(root: Path) -> dict:
    path = root / 'plan/Task20-自然选择号彩蛋终端与信号解码.md'
    source = path.read_text(encoding='utf-8')
    if source.count(CONTRACT_BEGIN) != 1 or source.count(CONTRACT_END) != 1:
        raise ValueError('Task20 contract markers must each occur once')
    section = source.split(CONTRACT_BEGIN, 1)[1].split(CONTRACT_END, 1)[0]
    blocks = re.findall(r'~~~json\s*([\s\S]*?)\s*~~~', section)
    if len(blocks) != 1:
        raise ValueError('Task20 marked contract must contain one JSON block')
    contract = json.loads(blocks[0])
    if contract.get('revision') != 'R15':
        raise ValueError('unsupported Task20 contract revision')
    return contract


def _read_utf8(path: Path) -> str:
    raw = path.read_bytes()
    if raw.startswith(b'\xef\xbb\xbf'):
        raise ValueError(f'BOM is forbidden: {path.name}')
    return raw.decode('utf-8').replace('\r\n', '\n').replace('\r', '\n')


def _finish(text: str) -> bytes:
    return (text.rstrip('\n') + '\n').encode('utf-8')


def _fill_slots(template: str, values: dict[str, str]) -> str:
    seen = SLOT_PATTERN.findall(template)
    allowed = {'RETURN_HREF', 'CSS_HREF', 'JS_SRC'}
    if set(seen) - allowed or set(seen) != set(values):
        raise ValueError(f'unsupported or missing URL slots: {seen}')
    rendered = SLOT_PATTERN.sub(lambda match: html.escape(values[match.group(1)], quote=True), template)
    if SLOT_PATTERN.search(rendered) or '{{' in rendered or '}}' in rendered:
        raise ValueError('unresolved template slot')
    return rendered


def render_target(root: Path, target: str) -> dict[str, bytes]:
    if target not in {'main', 'easteregg'}:
        raise ValueError('target must be main or easteregg')
    contract = load_contract(root)
    main_contract = contract['main']
    preview_contract = contract['preview']
    game_title = contract['game']['title']
    main_css = next(name for name in main_contract['resources'] if name.endswith('.css') and name.startswith('easteregg'))
    main_js = next(name for name in main_contract['resources'] if name.endswith('.js') and name.startswith('easteregg'))
    preview_root = next(name for name in preview_contract['fixed_files'] if name == 'index.html')
    preview_error = next(name for name in preview_contract['fixed_files'] if name == '404.html')
    source = root / 'build/easteregg'
    template = _read_utf8(source / 'terminal.html')
    not_found = _read_utf8(source / 'not-found.html')
    css = _read_utf8(source / 'styles.css')
    core = _read_utf8(source / 'core.js')
    ui = _read_utf8(source / 'ui.js')
    script = core.rstrip('\n') + '\n' + ui
    if target == 'main':
        terminal = _fill_slots(template, {
            'RETURN_HREF': main_contract['return_href'], 'CSS_HREF': main_css, 'JS_SRC': main_js
        })
        return {
            main_contract['egg_html']: _finish(terminal),
            main_css: _finish(css),
            main_js: _finish(script),
        }
    terminal = _fill_slots(template, {
        'RETURN_HREF': preview_contract['return_href'],
        'CSS_HREF': '/' + main_css,
        'JS_SRC': '/' + main_js,
    })
    if SLOT_PATTERN.search(not_found):
        raise ValueError('preview 404 must not contain unresolved URL slots')
    if preview_contract['return_href'] not in not_found or not preview_contract['url'].startswith('https://'):
        raise ValueError('preview 404/URL contract mismatch')
    return {
        preview_root: _finish(terminal),
        preview_error: _finish(not_found),
        main_css: _finish(css),
        main_js: _finish(script),
    }
