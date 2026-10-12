import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const planPath = path.resolve(here, '../../plan/Task20-自然选择号彩蛋终端与信号解码.md');
const source = fs.readFileSync(planPath, 'utf8');
const begin = '<!-- TASK20-CONTRACT-BEGIN -->';
const end = '<!-- TASK20-CONTRACT-END -->';

function fail(message) {
  throw new Error(`contract20: ${message}`);
}

if (source.split(begin).length !== 2 || source.split(end).length !== 2) {
  fail('合同标记必须各恰好出现一次');
}
const chunk = source.split(begin)[1].split(end)[0];
const fenced = [...chunk.matchAll(/~~~json\s*([\s\S]*?)\s*~~~/g)];
if (fenced.length !== 1) fail('标记之间必须有且仅有一个 JSON 代码块');
const contract = JSON.parse(fenced[0][1]);

const exactArrays = {
  'main.fixed_files': ['404.html', 'easteregg.css', 'easteregg.html', 'easteregg.js', 'index.html', 'news-commentary.html', 'news-feature.html', 'news-message.html', 'script.js', 'submission.html', 'styles.css'],
  'main.paper_fixed_html': ['index.html', 'news-message.html', 'news-feature.html', 'news-commentary.html', 'submission.html'],
  'main.resources': ['easteregg.css', 'easteregg.js', 'script.js', 'styles.css'],
  'preview.fixed_files': ['404.html', 'easteregg.css', 'easteregg.js', 'index.html'],
  'preview.resources': ['easteregg.css', 'easteregg.js'],
  'config_files': ['_headers'],
  'game.answers': ['前进四', '前进4'],
  'game.route_a': ['natural', 'blue', 'enterprise', 'deep', 'ultimate'],
  'game.route_b': ['quantum', 'bronze'],
  'game.route_initial_sequence': ['quantum', 'natural', 'ultimate', 'bronze', 'enterprise', 'blue', 'deep'],
  'game.signal_marker_indices': [1, 5, 2],
  'game.signal_solution': [3, -1, 2]
};
function at(object, dotted) {
  return dotted.split('.').reduce((value, key) => value?.[key], object);
}
for (const [key, expected] of Object.entries(exactArrays)) {
  if (JSON.stringify(at(contract, key)) !== JSON.stringify(expected)) fail(`${key} differs from R15`);
}
if (contract.revision !== 'R15') fail('revision 必须为 R15');
if (contract.main.files_base !== 11 || contract.main.zip_base !== 12 || contract.main.html_base !== 7) fail('main 数量基数无效');
if (contract.preview.files !== 4 || contract.preview.zip_entries !== 5 || contract.preview.html !== 2) fail('preview 固定数量无效');
if (contract.home.entry_text !== '鸽子衔枝之年' || contract.home.entry_href !== 'easteregg.html' || contract.home.entry_class !== 'home-easteregg-link') fail('首页入口合同无效');
if (contract.game.storage_key !== 'ns-bridge-v1' || contract.game.version !== 1 || contract.game.cipher_shift !== 3 || contract.game.signal_samples !== 9 || contract.game.signal_target_index !== 4) fail('游戏合同字段无效');
if (contract.preview.url !== 'https://easteregg.old-ns-news.pages.dev/' || contract.preview.branch !== 'easteregg' || contract.preview.return_href !== 'https://old-ns-news.pages.dev/') fail('预览域名/分支/返回地址无效');
for (const [section, list] of [['main', contract.main.fixed_files], ['preview', contract.preview.fixed_files]]) {
  if (new Set(list).size !== list.length || list.some((file) => path.basename(file) !== file)) fail(`${section}.fixed_files 必须唯一且为平铺文件名`);
}
if (contract.main.fixed_files.length !== contract.main.files_base || contract.main.resources.length !== 4 || contract.main.paper_fixed_html.length + 2 !== contract.main.html_base) fail('main 合同数量不自洽');
if (contract.preview.fixed_files.length !== contract.preview.files || contract.preview.resources.length !== 2 || contract.preview.html !== 2) fail('preview 合同数量不自洽');

export { contract };
export default contract;
