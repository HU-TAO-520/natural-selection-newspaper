/* Task 19 — 列表容量压力样本生成器（R-L 与变异 1 的共用台架）
 *
 * 铁律：真实 Results/ 一个字节都不改。本文件只在 _qa_task19/mutants/ 的**副本目录**里
 * 生成 N 条假文章的列表页；假文章只用作几何样本，其 href 全部指向副本里真实存在的
 * 详情页，避免把"链接打不开"混进几何判据。
 *
 * 文本用词性质：标题里刻意混入中英混排与长串（Windows 10 / AI / 4K / volunteer-activity），
 * 让 overflow-wrap 与 nowrap 两条链在 30 条密度下仍然可判。
 */
import fs from 'node:fs';
import path from 'node:path';

const LONG_TAIL = '并附长期观察记录与课堂反馈整理稿 supplementary note';
export function fakeTitle(i) {
  const heads = ['课堂观察', '社团巡礼', '期中学习方法访谈', '实验室开放日', '早读安排调整', '校本课程选课指导', '晚自习纪律说明', '体育测试安排', '图书馆新到书目', '值周班交接'];
  const h = heads[i % heads.length];
  const tail = i % 7 === 0 ? LONG_TAIL : i % 5 === 0 ? '含 Windows 10 与 4K 混排长标题 volunteer-activity-club' : i % 3 === 0 ? '含 AI 工具使用边界的讨论' : '';
  return h + '（第 ' + (i + 1) + ' 期）' + (tail ? '：' + tail : '');
}

/* 保持真实页面的壳与入口结构，只把 .entry-list 换成 N 条 */
export function buildPressureListPage(realHtml, { n, articles, columnLabel }) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const art = articles[i % articles.length];
    items.push(
      '      <li class="entry-list__item">\n' +
      '        <a class="entry-list__link" href="' + art.page + '">' +
      '<span class="entry-list__title">' + fakeTitle(i) + '</span>' +
      '<span class="entry-list__date">9月' + ((i % 28) + 1) + '日</span></a>\n' +
      '      </li>'
    );
  }
  const list = '    <ul class="entry-list">\n' + items.join('\n') + '\n    </ul>';
  const m = realHtml.match(/[ \t]*<ul class="entry-list">[\s\S]*?<\/ul>/);
  if (!m) throw new Error('副本列表页里找不到 .entry-list：无法注入压力条目');
  const out = realHtml.replace(m[0], list);
  if (!new RegExp('<title>' + columnLabel + '｜').test(out)) {
    /* 标题主体必须仍是栏目名，否则压力页会污染 K5 的期望 */
  }
  return out;
}

/* 在 mutants/<name>/ 里做一份完整副本（含 styles.css / script.js，避免"相对路径解析不到样式"） */
export function makeMutantCopy(srcDir, dstDir, filter) {
  fs.rmSync(dstDir, { recursive: true, force: true });
  fs.mkdirSync(dstDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    const s = path.join(srcDir, f);
    if (!fs.statSync(s).isFile()) continue;
    fs.writeFileSync(path.join(dstDir, f), filter && filter[f] ? filter[f](fs.readFileSync(s, 'utf8')) : fs.readFileSync(s));
  }
  return dstDir;
}

export function makePressureDir({ srcDir, dstDir, n, manifest }) {
  const lists = manifest.columns.map((c) => c.list);
  const firstList = lists[0];
  const arts = manifest.columns.flatMap((c) => c.articles);
  fs.rmSync(dstDir, { recursive: true, force: true });
  fs.mkdirSync(dstDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    const s = path.join(srcDir, f);
    if (!fs.statSync(s).isFile()) continue;
    let text = fs.readFileSync(s, 'utf8');
    if (f === firstList) text = buildPressureListPage(text, { n, articles: arts, columnLabel: manifest.columns[0].label });
    fs.writeFileSync(path.join(dstDir, f), text);
  }
  return { dir: dstDir, pressurePage: firstList, articles: arts };
}
