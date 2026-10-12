/* Task 9: 共享导航行为 —— 渐进增强、菜单状态与 ARIA 同步 */
(function () {
  'use strict';

  var root = document.documentElement;

  /* 1. 脚本执行的第一件实质工作：no-js -> js */
  root.classList.remove('no-js');
  root.classList.add('js');

  var toggle = document.getElementById('nav-toggle');
  var navigation = document.getElementById('site-navigation');

  /* 接口缺失：完成 no-js->js 后安全退出，不抛错、不污染控制台 */
  if (!toggle || !navigation) {
    return;
  }

  function isOpen() {
    return navigation.classList.contains('is-open');
  }

  /* 唯一的状态写入点：is-open 与 aria-expanded 原子同步 */
  function setOpen(open) {
    navigation.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeMenu() {
    setOpen(false);
  }

  /* 2. 启动归一化为关闭态（源码本不应带 is-open） */
  closeMenu();

  /* 3. 按钮点击切换；原生 button 已处理 Enter/Space，不重复绑定 keydown */
  toggle.addEventListener('click', function () {
    setOpen(!isOpen());
  });

  /* 4. Esc 关闭并把焦点返回按钮（仅在打开时） */
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      if (isOpen()) {
        closeMenu();
        toggle.focus();
      }
    }
  });

  /* 5. 点击导航链接后关闭菜单；按类名委托，不依赖中文文本 */
  navigation.addEventListener('click', function (event) {
    var target = event.target;
    if (target && typeof target.closest === 'function' &&
        target.closest('.site-navigation__link') && isOpen()) {
      closeMenu();
    }
  });

  /* 6. 跨到桌面断点（>=769px）时重置为关闭态 */
  var media = window.matchMedia('(min-width: 769px)');
  function handleBreakpoint(event) {
    if (event.matches) {
      closeMenu();
    }
  }
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleBreakpoint);
  } else if (typeof media.addListener === 'function') {
    media.addListener(handleBreakpoint); /* 旧版 Safari 兼容 */
  }
})();
