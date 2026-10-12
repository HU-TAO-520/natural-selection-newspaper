#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task 15 QA 共用工具：哈希、字节切片、DOM 解析。"""
import hashlib
import os
import sys

sys.dont_write_bytecode = True
from html.parser import HTMLParser

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.abspath(os.environ.get('QODER_RESULTS_DIR') or os.path.join(ROOT, 'Results'))
QA = os.path.join(ROOT, '_qa_task15')
SNAP = os.path.join(QA, 'before')
OUT14 = os.path.join(ROOT, '_qa_task14', 'out')
SLICES = os.path.join(ROOT, '_qa_task13', 'main_slices')

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
        'param', 'source', 'track', 'wbr'}

MAIN_OPEN = '<main class="main-content" id="main-content" tabindex="-1">'
MAIN_CLOSE = '</main>'


def sha256(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def read(path):
    with open(path, 'rb') as handle:
        return handle.read()


def read_text(path):
    data = read(path)
    assert not data.startswith(b'\xef\xbb\xbf'), f'{path} 含 BOM'
    return data.decode('utf-8')


def main_span(html):
    """返回 (open_start, interior_start, close_start) 的字符偏移。"""
    o = html.index(MAIN_OPEN)
    istart = o + len(MAIN_OPEN)
    c = html.index(MAIN_CLOSE, istart)
    return o, istart, c


def main_interior(html):
    _, istart, c = main_span(html)
    return html[istart:c]


def outside_main(html):
    o, istart, c = main_span(html)
    return html[:o], html[c:]


class Node(object):
    def __init__(self, tag, attrs, parent):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []

    @property
    def classes(self):
        return self.attrs.get('class', '').split()

    def get(self, name, default=None):
        return self.attrs.get(name, default)

    def elems(self):
        return [c for c in self.children if isinstance(c, Node)]

    def text(self):
        out = []
        for child in self.children:
            out.append(child if isinstance(child, str) else child.text())
        return ''.join(out)

    def walk(self):
        for child in self.children:
            if isinstance(child, Node):
                yield child
                for deeper in child.walk():
                    yield deeper

    def find(self, tag=None, cls=None):
        for node in self.walk():
            if tag is not None and node.tag != tag:
                continue
            if cls is not None and cls not in node.classes:
                continue
            yield node

    def first(self, tag=None, cls=None):
        for node in self.find(tag, cls):
            return node
        return None

    def describe(self):
        return '<%s %s>' % (self.tag, ' '.join('%s="%s"' % kv for kv in self.attrs.items()))

    def path(self):
        """自根元素起的标签路径，用于报告嵌套层级。"""
        parts = []
        node = self
        while node is not None and node.tag != '#document':
            parts.append(node.tag + ('.' + '.'.join(node.classes) if node.classes else ''))
            node = node.parent
        return ' > '.join(reversed(parts))


class Parser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self, convert_charrefs=True)
        self.root = Node('#document', [], None)
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs, self.stack[-1]))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def parse_file(path):
    parser = Parser()
    parser.feed(read_text(path))
    return parser.root


def parse_string(html):
    parser = Parser()
    parser.feed(html)
    return parser.root


def body_main(root):
    body = root.first('body')
    return body.first('main') if body is not None else None


def direct_element_children_text(node):
    """直接元素子节点（忽略纯空白文本节点），返回 [(tag, classes, id)]。"""
    out = []
    for child in node.children:
        if isinstance(child, str):
            if child.strip() == '':
                continue
            out.append(('#text', [], child[:40]))
            continue
        out.append((child.tag, child.classes, child.get('id', '')))
    return out


def diff_lines(a, b, label_a, label_b):
    """逐行 diff，输出 (行号, a 内容, b 内容)。"""
    la = a.split('\n')
    lb = b.split('\n')
    diffs = []
    for i in range(max(len(la), len(lb))):
        x = la[i] if i < len(la) else '<缺行>'
        y = lb[i] if i < len(lb) else '<缺行>'
        if x != y:
            diffs.append((i + 1, x, y))
    return diffs
