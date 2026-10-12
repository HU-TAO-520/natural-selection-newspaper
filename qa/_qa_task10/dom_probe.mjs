/* Task 10 路径 A：采集真实浏览器只读 DOM 快照 → dom_facts.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './probe_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = process.env.QODER_RESULTS_DIR ? path.resolve(process.env.QODER_RESULTS_DIR) : path.join(path.dirname(HERE), 'Results');
const OUT = process.env.QODER_FACTS_OUT || path.join(HERE, 'dom_facts.json');
const br = await openBrowser(Number(process.env.QODER_CDP_PORT || 9341));
const facts = await br.snapshot(RESULTS);
fs.writeFileSync(OUT, JSON.stringify(facts, null, 1), 'utf8');
process.stderr.write('written ' + OUT + '\n');
br.close();
process.exit(0);
