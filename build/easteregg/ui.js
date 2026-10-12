(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  const HINTS = [
    [
      '以舰名拼音为已知明文观察统一位移。',
      '字母编码向前移了三位，再回想对应的推进指令。',
      '校准值是 3，推进指令是“前进四”。'
    ],
    [
      '两组在太阳系两端，各自经历不同的脱离过程。',
      '“量子”号是从水滴毁灭后的战场离开的，回忆与它同行的战舰。',
      '航迹 A：自然选择号、蓝色空间号、企业号、深空号、终极规律号；航迹 B：量子号、青铜时代号。'
    ],
    [
      '识别三路相同的三连峰。',
      '标记需落在同一目标线上，第二路先向左移一格。',
      '偏移顺序为 [3,-1,2]。'
    ]
  ];
  const OFFSET_IDS = ['egg-offset-telemetry', 'egg-offset-weapons', 'egg-offset-voice'];
  const SAMPLE_IDS = ['egg-samples-telemetry', 'egg-samples-weapons', 'egg-samples-voice'];
  const SIGNAL_NAMES = ['舰体遥测', '武器记录', '末尾录音'];
  const ROUTE_SEQUENCE = ['quantum', 'natural', 'ultimate', 'bronze', 'enterprise', 'blue', 'deep'];
  const BY_ID = (id) => document.getElementById(id);
  let storage = null;
  let state = null;
  let started = false;

  function setHidden(element, hidden) {
    if (element) element.hidden = !!hidden;
  }

  function setText(id, text) {
    const element = BY_ID(id);
    if (element) element.textContent = text;
  }

  function focusId(id) {
    const element = BY_ID(id);
    if (!element) return;
    try {
      element.focus({ preventScroll: false });
    } catch (_) {
      try { element.focus(); } catch (_) { /* static content remains available */ }
    }
  }

  function persist(next) {
    state = next;
    if (!storage) return;
    try {
      storage.setItem(window.NSBridgeCore.STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      storage = null;
    }
  }

  function showFeedback(message) {
    setText('egg-feedback', message);
  }

  function dispatch(action, message, focus) {
    const next = window.NSBridgeCore.reduce(state, action);
    if (next !== state) persist(next);
    render();
    if (message) showFeedback(message);
    if (focus) focusId(focus);
    return next !== state;
  }

  function makeSamples() {
    SAMPLE_IDS.forEach((id, row) => {
      const list = BY_ID(id);
      if (!list) throw new Error('missing signal sample list');
      const cells = [];
      for (let index = 0; index < 9; index += 1) {
        const item = document.createElement('li');
        item.className = 'egg-sample__cell';
        const pulse = document.createElement('span');
        pulse.className = 'egg-sample__pulse';
        pulse.setAttribute('aria-hidden', 'true');
        const number = document.createElement('span');
        number.className = 'egg-sample__number';
        number.textContent = String(index + 1);
        item.append(pulse, number);
        cells.push(item);
      }
      list.replaceChildren(...cells);
    });
  }

  function renderRoutes() {
    const routeA = BY_ID('egg-route-a-list');
    const routeB = BY_ID('egg-route-b-list');
    if (!routeA || !routeB) return;
    const groups = { A: [], B: [] };
    for (const key of ROUTE_SEQUENCE) {
      const route = state.routes[key];
      if (groups[route]) groups[route].push(window.NSBridgeCore.ROUTE_LABELS[key]);
      const select = BY_ID('egg-route-' + key);
      if (select && select.value !== route) select.value = route;
    }
    routeA.replaceChildren(...groups.A.map((label) => {
      const item = document.createElement('li');
      item.textContent = label;
      return item;
    }));
    routeB.replaceChildren(...groups.B.map((label) => {
      const item = document.createElement('li');
      item.textContent = label;
      return item;
    }));
    setText('egg-route-a-count', String(groups.A.length));
    setText('egg-route-b-count', String(groups.B.length));
  }

  function renderSignals() {
    state.offsets.forEach((offset, row) => {
      const center = window.NSBridgeCore.SIGNAL_MARKERS[row] + offset;
      const list = BY_ID(SAMPLE_IDS[row]);
      const input = BY_ID(OFFSET_IDS[row]);
      if (!list || !input) return;
      if (input.value !== String(offset)) input.value = String(offset);
      setText(OFFSET_IDS[row] + '-value', String(offset));
      let clipped = false;
      [...list.children].forEach((cell, index) => {
        const amplitude = index === center ? 3 : (index === center - 1 || index === center + 1 ? 1 : 0);
        const pulse = cell.firstElementChild;
        cell.classList.toggle('egg-sample__cell--target', index === window.NSBridgeCore.SIGNAL_TARGET);
        pulse.className = 'egg-sample__pulse';
        pulse.classList.toggle('egg-sample__pulse--low', amplitude === 1);
        pulse.classList.toggle('egg-sample__pulse--high', amplitude === 3);
        cell.setAttribute('aria-label', `第 ${index + 1} 格${index === window.NSBridgeCore.SIGNAL_TARGET ? '，同步线' : ''}${amplitude === 3 ? '，同步脉冲峰值' : amplitude === 1 ? '，同步脉冲' : ''}`);
        if (amplitude && (center < 1 || center > 7)) clipped = true;
      });
      const status = center < 0 || center > 8
        ? '标记在视窗外。'
        : clipped
          ? `部分标记在视窗外；中心位于第 ${center + 1} 格。`
          : `标记中心位于第 ${center + 1} 格。`;
      setText('egg-signal-' + ['telemetry', 'weapons', 'voice'][row] + '-state', `${SIGNAL_NAMES[row]}：${status}`);
    });
  }

  function render() {
    if (!started || !state) return;
    setHidden(BY_ID('egg-static-note'), true);
    setHidden(BY_ID('egg-start-controls'), state.stage !== 0);
    setHidden(BY_ID('egg-stage-one'), state.stage < 1 || state.stage > 4);
    setHidden(BY_ID('egg-stage-two'), state.stage < 2 || state.stage > 4);
    setHidden(BY_ID('egg-stage-three'), state.stage < 3 || state.stage > 4);
    setHidden(BY_ID('egg-recovered-one'), !state.cleared[0]);
    setHidden(BY_ID('egg-recovered-two'), !state.cleared[1]);
    setHidden(BY_ID('egg-recovered-three'), !state.cleared[2]);
    setHidden(BY_ID('egg-departure-controls'), state.stage !== 1 || state.cleared[0]);
    setHidden(BY_ID('egg-routes-controls'), state.stage !== 2 || state.cleared[1]);
    setHidden(BY_ID('egg-signals-controls'), state.stage !== 3 || state.cleared[2]);
    setHidden(BY_ID('egg-continue-one'), !(state.stage === 1 && state.cleared[0]));
    setHidden(BY_ID('egg-continue-two'), !(state.stage === 2 && state.cleared[1]));
    setHidden(BY_ID('egg-ending'), state.stage !== 4);
    setText('egg-status', ['档案回放待命。', '第一段记录等待校准。', '第二段航迹等待归档。', '第三段信号等待对齐。', '档案复原完成。'][state.stage]);

    const shift = BY_ID('egg-shift');
    if (shift && shift.value !== String(state.shift)) shift.value = String(state.shift);
    setText('egg-shift-value', String(state.shift));
    setText('egg-code', window.NSBridgeCore.decodeCaesar(window.NSBridgeCore.EXPECTED_CIPHER, state.shift) || '待校准');
    setText('egg-command', window.NSBridgeCore.decodeCaesar(window.NSBridgeCore.COMMAND_CIPHER, state.shift) || '待校准');
    const answer = BY_ID('egg-answer');
    if (answer && answer.value !== state.answer) answer.value = state.answer;

    renderRoutes();
    renderSignals();
    state.hints.forEach((count, index) => {
      const textId = `egg-hint-text-${['one', 'two', 'three'][index]}`;
      const applyId = `egg-apply-hint-${['one', 'two', 'three'][index]}`;
      setText(textId, count > 0 ? HINTS[index][count - 1] : '');
      setHidden(BY_ID(applyId), count < 3 || state.cleared[index]);
    });
    setHidden(BY_ID('egg-hint-one'), state.stage !== 1 || state.cleared[0] || state.hints[0] === 3);
    setHidden(BY_ID('egg-hint-two'), state.stage !== 2 || state.cleared[1] || state.hints[1] === 3);
    setHidden(BY_ID('egg-hint-three'), state.stage !== 3 || state.cleared[2] || state.hints[2] === 3);
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');
  }

  function stageOneError() {
    if (state.shift !== 3) return '载波尚未校准，先核对固定呼号。';
    if (!window.NSBridgeCore.normaliseAnswer(state.answer)) return '请输入恢复出的推进指令。';
    return '拼音已恢复，指令与记录不符。';
  }

  function submitCurrentStage() {
    const before = state;
    const next = window.NSBridgeCore.reduce(state, { type: 'SUBMIT' });
    if (next === state) {
      if (state.stage === 1) showFeedback(stageOneError());
      else if (state.stage === 2) {
        const missing = Object.values(state.routes).filter((route) => route === '').length;
        showFeedback(missing ? `还有 ${missing} 艘未归档。` : '归属仍有冲突，核对两组舰队的起点。');
      } else if (state.stage === 3) showFeedback('记录仍未同步，核对三个标记与同步线的位置。');
      return;
    }
    persist(next);
    render();
    if (before.stage === 1) {
      showFeedback('推进指令已复原。第一段航行记录已恢复。');
      focusId('egg-recovered-one-title');
    } else if (before.stage === 2) {
      showFeedback('航迹归档完成。第二段记录已恢复。');
      focusId('egg-recovered-two-title');
    } else {
      showFeedback('同步完成。最后一段记录已恢复。');
      focusId('egg-ending-title');
    }
  }

  function fallback() {
    document.documentElement.classList.remove('js');
    document.documentElement.classList.add('no-js');
    for (const id of ['egg-stage-one', 'egg-stage-two', 'egg-stage-three', 'egg-recovered-one', 'egg-recovered-two', 'egg-recovered-three', 'egg-ending']) setHidden(BY_ID(id), false);
    for (const id of ['egg-start-controls', 'egg-departure-controls', 'egg-routes-controls', 'egg-signals-controls']) setHidden(BY_ID(id), true);
    for (const id of ['egg-continue-one', 'egg-continue-two', 'egg-apply-hint-one', 'egg-apply-hint-two', 'egg-apply-hint-three']) setHidden(BY_ID(id), true);
    setHidden(BY_ID('egg-static-note'), false);
    started = false;
  }

  function guarded(callback) {
    try { callback(); } catch (_) { fallback(); }
  }

  function onClick(event) {
    const button = event.target.closest && event.target.closest('button[id]');
    if (!button) return;
    switch (button.id) {
      case 'egg-start':
        dispatch({ type: 'START' }, '第一段航行记录已开放。', 'egg-stage-one-title');
        break;
      case 'egg-routes-check':
      case 'egg-signals-check':
        submitCurrentStage();
        break;
      case 'egg-continue-one':
        dispatch({ type: 'CONTINUE' }, '第二段远航记录已开放。', 'egg-stage-two-title');
        break;
      case 'egg-continue-two':
        dispatch({ type: 'CONTINUE' }, '第三段沉默记录已开放。', 'egg-stage-three-title');
        break;
      case 'egg-hint-one': case 'egg-hint-two': case 'egg-hint-three': {
        const index = ['egg-hint-one', 'egg-hint-two', 'egg-hint-three'].indexOf(button.id);
        const currentCount = state.hints[index];
        const nextCount = Math.min(3, currentCount + 1);
        dispatch({ type: 'HINT' }, HINTS[index][nextCount - 1]);
        break;
      }
      case 'egg-apply-hint-one': case 'egg-apply-hint-two': case 'egg-apply-hint-three':
        {
          const before = state;
          const next = window.NSBridgeCore.reduce(state, { type: 'APPLY_HINT' });
          if (next === state) return;
          persist(next);
          render();
          showFeedback('提示已用于复原本段记录。');
          focusId(before.stage === 1 ? 'egg-recovered-one-title' : before.stage === 2 ? 'egg-recovered-two-title' : 'egg-ending-title');
          break;
        }
      case 'egg-replay':
        {
          const next = window.NSBridgeCore.reduce(state, { type: 'REPLAY' });
          try { if (storage) storage.removeItem(window.NSBridgeCore.STORAGE_KEY); } catch (_) { storage = null; }
          state = next;
          render();
          showFeedback('档案已回到开场。');
          focusId('egg-start');
          break;
        }
      case 'egg-archive':
        focusId('egg-p00');
        break;
      default:
        break;
    }
  }

  function onInput(event) {
    const control = event.target;
    if (!control || !control.id) return;
    if (control.id === 'egg-shift') dispatch({ type: 'SET_SHIFT', value: Number(control.value) });
    else if (control.id === 'egg-answer') dispatch({ type: 'SET_ANSWER', value: control.value });
    else {
      const index = OFFSET_IDS.indexOf(control.id);
      if (index !== -1) dispatch({ type: 'SET_OFFSET', index, value: Number(control.value) });
    }
  }

  function onChange(event) {
    const control = event.target;
    if (!control || !control.id || !control.id.startsWith('egg-route-')) return;
    const key = control.id.slice('egg-route-'.length);
    dispatch({ type: 'SET_ROUTE', key, value: control.value });
  }

  function onSubmit(event) {
    if (!event.target || event.target.id !== 'egg-departure-form') return;
    event.preventDefault();
    const shift = Number(BY_ID('egg-shift').value);
    const answer = BY_ID('egg-answer').value;
    dispatch({ type: 'SET_SHIFT', value: shift });
    dispatch({ type: 'SET_ANSWER', value: answer });
    submitCurrentStage();
  }

  function initialize() {
    if (!window.NSBridgeCore || typeof window.NSBridgeCore.restore !== 'function') throw new Error('game core unavailable');
    try {
      storage = window.sessionStorage;
      state = window.NSBridgeCore.restore(storage.getItem(window.NSBridgeCore.STORAGE_KEY));
    } catch (_) {
      storage = null;
      state = window.NSBridgeCore.initialState();
    }
    makeSamples();
    document.addEventListener('click', (event) => guarded(() => onClick(event)));
    document.addEventListener('input', (event) => guarded(() => onInput(event)));
    document.addEventListener('change', (event) => guarded(() => onChange(event)));
    document.addEventListener('submit', (event) => guarded(() => onSubmit(event)));
    started = true;
    render();
  }

  try {
    initialize();
  } catch (_) {
    fallback();
  }
}());
