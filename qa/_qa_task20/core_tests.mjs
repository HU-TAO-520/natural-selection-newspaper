import assert from 'node:assert/strict';
import { contract } from './contract20.mjs';
const bundleMode = process.argv.includes('--bundle');
let core;
if (bundleMode) {
  await import('../../Results/easteregg.js');
  core = globalThis.NSBridgeCore;
} else {
  ({ default: core } = await import('../../build/easteregg/core.js'));
}
assert.ok(core, bundleMode ? 'production Results/easteregg.js exposes the core API' : 'source core API loads');

const g = contract.game;
const expectedAnswers = contract.game.answers;
const empty = core.initialState();
const answers = (shift, answer) => ({ ...core.initialState(), shift, answer });
const blankRoutes = () => Object.fromEntries([...g.route_a, ...g.route_b].map((key) => [key, '']));
const correctRoutes = () => Object.fromEntries([...g.route_a.map((key) => [key, 'A']), ...g.route_b.map((key) => [key, 'B'])]);
const ok = (condition, message) => assert.equal(condition, true, message);
const no = (condition, message) => assert.equal(condition, false, message);

// C01: independent expected plaintext comes from Task20 §4.2.
assert.equal(core.decodeCaesar(g.known_cipher, g.cipher_shift), g.known_plain);
assert.equal(core.decodeCaesar(g.command_cipher, g.cipher_shift), g.command_plain);
assert.equal(core.decodeCaesar('ABZ', 3), 'XYW');

// C02/C03: exact calibrated command and NFKC + whitespace-only normalization.
for (const shift of [0, 2, 4]) no(core.checkDeparture(answers(shift, expectedAnswers[0])), `shift ${shift} must fail`);
ok(core.checkDeparture(answers(3, '前 进　４')), 'full-width 4 and whitespace normalize');
ok(core.checkDeparture(answers(3, expectedAnswers[0])), 'front-four Chinese answer');
ok(core.checkDeparture(answers(3, expectedAnswers[1])), 'ASCII digit answer');
for (const answer of ['', '前进四号', 'QIANJINSI', '章北海']) no(core.checkDeparture(answers(3, answer)), `answer ${answer} must fail`);
assert.equal(core.normaliseAnswer(' 前\t进　４ '), '前进4');

// C04/C05: exact seven-ship membership, not merely a 5/2 count.
const expectedRouteMap = correctRoutes();
ok(core.checkRoutes(expectedRouteMap), 'full route map passes');
const swapped = { ...expectedRouteMap, natural: 'B', quantum: 'A' };
assert.equal(Object.values(swapped).filter((value) => value === 'A').length, 5);
assert.equal(Object.values(swapped).filter((value) => value === 'B').length, 2);
no(core.checkRoutes(swapped), 'same counts with a cross-route swap fail');
no(core.checkRoutes({ ...expectedRouteMap, deep: '' }), 'missing route fails');
no(core.checkRoutes({ ...expectedRouteMap, unknown: 'A' }), 'unknown route key fails');
no(core.checkRoutes({ ...expectedRouteMap, blue: 'C' }), 'unknown route value fails');

// C06/C07: each actual center must land on the fixed target.
ok(core.checkSignals(g.signal_solution), 'fixed solution passes');
no(core.checkSignals([2, -2, 1]), 'three markers coincident away from target fail');
no(core.checkSignals([3, -1]), 'short offset list fails');
no(core.checkSignals([3, -1, 8]), 'out-of-range offset fails');

// C08/C10/C12: no cross-stage entry, immutable reducers, and idempotent progress.
no(core.reduce(empty, { type: 'SUBMIT' }).cleared[2], 'opening cannot submit to final stage');
assert.strictEqual(core.reduce(empty, { type: 'CONTINUE' }), empty, 'opening cannot continue');
const started = core.reduce(empty, { type: 'START' });
assert.deepEqual(empty.cleared, [false, false, false], 'START must preserve old state');
assert.strictEqual(core.reduce(started, { type: 'SET_ROUTE', key: 'natural', value: 'A' }), started, 'stage 1 cannot write routes');
assert.strictEqual(core.reduce(started, { type: 'SET_OFFSET', index: 2, value: 2 }), started, 'stage 1 cannot write future offsets');
let state = core.reduce(started, { type: 'SET_SHIFT', value: 3 });
state = core.reduce(state, { type: 'SET_ANSWER', value: '前进四' });
const snapshot = JSON.stringify(state);
const stateBeforeSubmit = state;
state = core.reduce(state, { type: 'SUBMIT' });
assert.equal(JSON.stringify(stateBeforeSubmit), snapshot, 'input state must remain unchanged by SUBMIT');
ok(state.cleared[0], 'stage 1 cleared');
const clearedOnce = state;
assert.strictEqual(core.reduce(state, { type: 'SUBMIT' }), state, 'repeated submit is idempotent');
state = core.reduce(state, { type: 'CONTINUE' });
const stageTwo = state;
assert.strictEqual(core.reduce(state, { type: 'CONTINUE' }), state, 'repeated continue does not skip a stage');
state = core.reduce(state, { type: 'SET_ROUTE', key: 'natural', value: 'A' });
assert.equal(stageTwo.routes.natural, '', 'SET_ROUTE must not mutate previous route object');
for (const [key, value] of Object.entries(expectedRouteMap)) state = core.reduce(state, { type: 'SET_ROUTE', key, value });
state = core.reduce(state, { type: 'SUBMIT' });
ok(state.cleared[1], 'stage 2 cleared');
state = core.reduce(state, { type: 'CONTINUE' });
const beforeInvalid = state;
assert.strictEqual(core.reduce(state, { type: 'SET_OFFSET', index: 9, value: 2 }), beforeInvalid, 'invalid index is ignored');
assert.deepEqual(beforeInvalid.offsets, [0, 0, 0], 'invalid action does not write future draft');

// C09: hints never solve in first two levels; level three applies through normal solution validation.
let hinted = core.reduce(started, { type: 'HINT' });
hinted = core.reduce(hinted, { type: 'HINT' });
no(hinted.cleared[0], 'first two hints are not a solve');
assert.strictEqual(core.reduce(hinted, { type: 'APPLY_HINT' }), hinted, 'cannot apply before hint 3');
hinted = core.reduce(hinted, { type: 'HINT' });
hinted = core.reduce(hinted, { type: 'APPLY_HINT' });
ok(hinted.cleared[0] && hinted.assisted[0], 'third hint uses normal solve and records assistance');

// C11: valid drafts/completed sessions restore, corrupt caches reset atomically.
const validMid = core.restore(JSON.stringify(state));
assert.equal(validMid.stage, 3, 'middle stage restores');
assert.deepEqual(validMid.offsets, [0, 0, 0]);
const completed = core.reduce(state, { type: 'SET_OFFSET', index: 0, value: g.signal_solution[0] });
let completedProgress = completed;
completedProgress = core.reduce(completedProgress, { type: 'SET_OFFSET', index: 1, value: g.signal_solution[1] });
completedProgress = core.reduce(completedProgress, { type: 'SET_OFFSET', index: 2, value: g.signal_solution[2] });
completedProgress = core.reduce(completedProgress, { type: 'SUBMIT' });
assert.equal(completedProgress.stage, 4);
assert.equal(core.restore(JSON.stringify(completedProgress)).stage, 4, 'valid ending restores');
const invalids = [
  '{not json',
  JSON.stringify({ ...empty, version: 0 }),
  JSON.stringify({ ...empty, cleared: [true, true, true] }),
  JSON.stringify({ ...empty, shift: 26 }),
  JSON.stringify(Object.fromEntries(Object.entries(empty).filter(([key]) => key !== 'routes'))),
  JSON.stringify({ ...empty, routes: { ...empty.routes, unknown: 'A' } }),
  JSON.stringify({ ...empty, stage: 0, cleared: [false, true, false] })
];
for (const invalid of invalids) assert.deepEqual(core.restore(invalid), core.initialState(), 'invalid cache returns clean opening state');

// Replay only resets this game's state and creates a fresh initial object.
const replayed = core.reduce(completedProgress, { type: 'REPLAY' });
assert.deepEqual(replayed, core.initialState());
assert.notStrictEqual(replayed, completedProgress);
assert.deepEqual(core.restore(JSON.stringify(clearedOnce)).cleared, [true, false, false]);

console.log(`PASS ${bundleMode ? 'production bundle' : 'source'} core rules: T20-C01–C12`);
