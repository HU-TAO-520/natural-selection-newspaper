(function (root) {
  'use strict';

  const STORAGE_KEY = 'ns-bridge-v1';
  const VERSION = 1;
  const ROUTE_A = ['natural', 'blue', 'enterprise', 'deep', 'ultimate'];
  const ROUTE_B = ['quantum', 'bronze'];
  const ROUTE_KEYS = [...ROUTE_A, ...ROUTE_B];
  const ROUTE_LABELS = {
    natural: '自然选择号', blue: '蓝色空间号', enterprise: '企业号', deep: '深空号',
    ultimate: '终极规律号', quantum: '量子号', bronze: '青铜时代号'
  };
  const EXPECTED_PLAIN = 'ZIRANXUANZE';
  const EXPECTED_CIPHER = 'CLUDQAXDQCH';
  const COMMAND_PLAIN = 'QIANJINSI';
  const COMMAND_CIPHER = 'TLDQMLQVL';
  const SIGNAL_MARKERS = [1, 5, 2];
  const SIGNAL_TARGET = 4;
  const SIGNAL_SOLUTION = [3, -1, 2];
  const ANSWERS = ['前进四', '前进4'];

  function decodeCaesar(text, shift) {
    if (typeof text !== 'string') return '';
    if (!Number.isInteger(shift) || shift < 0 || shift > 25) return text;
    return text.replace(/[A-Z]/g, (letter) => String.fromCharCode(65 + ((letter.charCodeAt(0) - 65 - shift + 26) % 26)));
  }

  function normaliseAnswer(answer) {
    if (typeof answer !== 'string') return '';
    return answer.normalize('NFKC').replace(/\s/gu, '');
  }

  function checkDeparture(state) {
    return !!state && state.shift === 3 && ANSWERS.includes(normaliseAnswer(state.answer));
  }

  function checkRoutes(routes) {
    if (!routes || typeof routes !== 'object' || Array.isArray(routes)) return false;
    const keys = Object.keys(routes).sort();
    if (keys.length !== ROUTE_KEYS.length || keys.some((key, index) => key !== [...ROUTE_KEYS].sort()[index])) return false;
    if (keys.some((key) => !['', 'A', 'B'].includes(routes[key]))) return false;
    return ROUTE_A.every((key) => routes[key] === 'A') && ROUTE_B.every((key) => routes[key] === 'B');
  }

  function checkSignals(offsets) {
    return Array.isArray(offsets) && offsets.length === 3 && offsets.every(Number.isInteger) &&
      offsets.every((offset, index) => offset >= -3 && offset <= 3 && SIGNAL_MARKERS[index] + offset === SIGNAL_TARGET);
  }

  function initialState() {
    return {
      version: VERSION,
      stage: 0,
      cleared: [false, false, false],
      shift: 0,
      answer: '',
      routes: { natural: '', blue: '', enterprise: '', deep: '', ultimate: '', quantum: '', bronze: '' },
      offsets: [0, 0, 0],
      hints: [0, 0, 0],
      assisted: [false, false, false]
    };
  }

  function copyState(state) {
    return {
      version: state.version,
      stage: state.stage,
      cleared: state.cleared.slice(),
      shift: state.shift,
      answer: state.answer,
      routes: { ...state.routes },
      offsets: state.offsets.slice(),
      hints: state.hints.slice(),
      assisted: state.assisted.slice()
    };
  }

  function sameKeys(value, expected) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const actual = Object.keys(value).sort();
    const wanted = expected.slice().sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
  }

  function validShape(state) {
    const fields = ['version', 'stage', 'cleared', 'shift', 'answer', 'routes', 'offsets', 'hints', 'assisted'];
    if (!sameKeys(state, fields) || state.version !== VERSION || !Number.isInteger(state.stage) || state.stage < 0 || state.stage > 4) return false;
    if (!Array.isArray(state.cleared) || state.cleared.length !== 3 || !state.cleared.every((v) => typeof v === 'boolean')) return false;
    if (!Number.isInteger(state.shift) || state.shift < 0 || state.shift > 25) return false;
    if (typeof state.answer !== 'string' || state.answer.length > 64) return false;
    if (!sameKeys(state.routes, ROUTE_KEYS) || Object.values(state.routes).some((v) => !['', 'A', 'B'].includes(v))) return false;
    if (!Array.isArray(state.offsets) || state.offsets.length !== 3 || !state.offsets.every((v) => Number.isInteger(v) && v >= -3 && v <= 3)) return false;
    if (!Array.isArray(state.hints) || state.hints.length !== 3 || !state.hints.every((v) => Number.isInteger(v) && v >= 0 && v <= 3)) return false;
    if (!Array.isArray(state.assisted) || state.assisted.length !== 3 || !state.assisted.every((v) => typeof v === 'boolean')) return false;
    const bits = state.cleared.map((v) => v ? '1' : '0').join('');
    const legal = {
      0: ['000'], 1: ['000', '100'], 2: ['100', '110'], 3: ['110'], 4: ['111']
    };
    if (!legal[state.stage].includes(bits)) return false;
    if (state.cleared[0] && !checkDeparture(state)) return false;
    if (state.cleared[1] && !checkRoutes(state.routes)) return false;
    if (state.cleared[2] && !checkSignals(state.offsets)) return false;
    return true;
  }

  function restore(raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!validShape(parsed)) return initialState();
      return copyState(parsed);
    } catch (_) {
      return initialState();
    }
  }

  function checkedSubmit(state) {
    if (state.stage === 1 && !state.cleared[0] && checkDeparture(state)) {
      const next = copyState(state);
      next.cleared[0] = true;
      return next;
    }
    if (state.stage === 2 && !state.cleared[1] && checkRoutes(state.routes)) {
      const next = copyState(state);
      next.cleared[1] = true;
      return next;
    }
    if (state.stage === 3 && !state.cleared[2] && checkSignals(state.offsets)) {
      const next = copyState(state);
      next.cleared[2] = true;
      next.stage = 4;
      return next;
    }
    return state;
  }

  function reduce(state, action) {
    if (!validShape(state) || !action || typeof action.type !== 'string') return state;
    const canEdit = state.stage >= 1 && state.stage <= 3 && !state.cleared[state.stage - 1];
    switch (action.type) {
      case 'START':
        if (state.stage !== 0) return state;
        return { ...copyState(state), stage: 1 };
      case 'SET_SHIFT':
        if (state.stage !== 1 || state.cleared[0] || !Number.isInteger(action.value) || action.value < 0 || action.value > 25) return state;
        return { ...copyState(state), shift: action.value };
      case 'SET_ANSWER':
        if (state.stage !== 1 || state.cleared[0] || typeof action.value !== 'string' || action.value.length > 64) return state;
        return { ...copyState(state), answer: action.value };
      case 'SET_ROUTE':
        if (state.stage !== 2 || state.cleared[1] || !ROUTE_KEYS.includes(action.key) || !['', 'A', 'B'].includes(action.value)) return state;
        return { ...copyState(state), routes: { ...state.routes, [action.key]: action.value } };
      case 'SET_OFFSET':
        if (state.stage !== 3 || state.cleared[2] || !Number.isInteger(action.index) || action.index < 0 || action.index > 2 || !Number.isInteger(action.value) || action.value < -3 || action.value > 3) return state;
        {
          const next = copyState(state);
          next.offsets[action.index] = action.value;
          return next;
        }
      case 'SUBMIT':
        if (!canEdit) return state;
        return checkedSubmit(state);
      case 'CONTINUE':
        if (state.stage === 1 && state.cleared[0]) return { ...copyState(state), stage: 2 };
        if (state.stage === 2 && state.cleared[1]) return { ...copyState(state), stage: 3 };
        return state;
      case 'HINT':
        if (!canEdit) return state;
        {
          const next = copyState(state);
          const index = state.stage - 1;
          next.hints[index] = Math.min(3, next.hints[index] + 1);
          return next;
        }
      case 'APPLY_HINT':
        if (!canEdit || state.hints[state.stage - 1] !== 3) return state;
        {
          const next = copyState(state);
          const index = state.stage - 1;
          next.assisted[index] = true;
          if (state.stage === 1) {
            next.shift = 3;
            next.answer = '前进四';
          } else if (state.stage === 2) {
            for (const key of ROUTE_A) next.routes[key] = 'A';
            for (const key of ROUTE_B) next.routes[key] = 'B';
          } else {
            next.offsets = SIGNAL_SOLUTION.slice();
          }
          return checkedSubmit(next);
        }
      case 'REPLAY':
        if (state.stage === 0) return state;
        return initialState();
      default:
        return state;
    }
  }

  const api = {
    STORAGE_KEY, VERSION, ROUTE_A: ROUTE_A.slice(), ROUTE_B: ROUTE_B.slice(),
    ROUTE_LABELS: { ...ROUTE_LABELS }, SIGNAL_MARKERS: SIGNAL_MARKERS.slice(),
    SIGNAL_TARGET, SIGNAL_SOLUTION: SIGNAL_SOLUTION.slice(), EXPECTED_CIPHER, COMMAND_CIPHER,
    decodeCaesar, normaliseAnswer, checkDeparture, checkRoutes, checkSignals,
    initialState, reduce, restore
  };
  root.NSBridgeCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
}(typeof globalThis === 'object' ? globalThis : this));
