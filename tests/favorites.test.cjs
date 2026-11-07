const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const root = resolve(__dirname, '..');
const assetPath = (file) => file.endsWith('.html') ? ['public', file] : file.endsWith('.css') ? ['public', 'assets', 'css', file] : ['public', 'assets', 'js', file];

// Minimal DOM for exercising the real page scripts and delegated click handlers.
function element() {
  return {
    dataset: {}, attributes: {}, classes: new Set(), listeners: {}, value: '', disabled: false,
    classList: { add() {}, toggle() {} },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    getAttribute(name) { return this.attributes[name]; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    closest(selector) {
      return (selector === '[data-favorite-id]' && this.dataset.favoriteId)
        || (selector === '[data-category]' && this.dataset.category) ? this : null;
    },
    querySelectorAll() { return this.buttons || []; },
    set innerHTML(html) {
      this.html = html;
      this.buttons = [...html.matchAll(/<button class="favorite-toggle([^"]*)"[^>]*data-favorite-id="([^"]+)"[^>]*aria-pressed="([^"]+)"[^>]*aria-label="([^"]+)"[^>]*>([^<]+)<\/button>/g)]
        .map(([, classes, id, pressed, label, text]) => {
          const button = element();
          button.dataset.favoriteId = id;
          button.classes = new Set(classes.trim().split(/\s+/).filter(Boolean));
          button.classList.toggle = (name, enabled) => enabled ? button.classes.add(name) : button.classes.delete(name);
          button.attributes = { 'aria-pressed': pressed, 'aria-label': label };
          button.textContent = text;
          return button;
        });
    },
    get innerHTML() { return this.html; }
  };
}

function page({ home = true, saved = [], status = 200, failSave = false, initialResponse, responsePlan = [], timers = { setTimeout, clearTimeout } } = {}) {
  const grid = element();
  const nodes = { [home ? 'featured-grid' : 'menu-grid']: grid, 'favorite-status': element(), 'favorite-retry': element() };
  if (!home) for (const id of ['category-tabs', 'menu-search', 'result-count', 'empty-state']) nodes[id] = element();
  const calls = [], alerts = [];
  const window = {
    COMPOSE_MENU: [{ id: '123', name: '라떼', category: '커피', image: 'latte.jpg' }],
    location: { pathname: home ? '/' : '/menu.html', search: '', href: '' },
    alert: (message) => alerts.push(message)
  };
  const document = {
    addEventListener() {},
    getElementById: (id) => nodes[id] || null,
    createElement: () => ({ set innerHTML(value) { this.value = value; } }),
    querySelectorAll: (selector) => selector === '#menu-grid, #featured-grid, #menu-detail' ? [grid]
      : selector === '[data-favorite-id]' ? grid.buttons : []
  };
  const fetch = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (!options.method) {
      if (initialResponse) await initialResponse;
      const planned = responsePlan.length ? responsePlan.shift() : status;
      if (planned instanceof Error) throw planned;
      const code = typeof planned === 'number' ? planned : 200;
      if (planned === 'invalid-json') return { status: 200, ok: true, json: async () => { throw new SyntaxError('bad JSON'); } };
      return { status: code, ok: code === 200, json: async () => ({ favorites: saved.map((menu_id) => ({ menu_id })) }) };
    }
    return { status: failSave ? 500 : 200, ok: !failSave, json: async () => failSave
      ? { error: '저장 실패' } : { isFavorite: options.method === 'POST' } };
  };
  const context = vm.createContext({ window, document, fetch, AbortController, ...timers, URLSearchParams });
  for (const file of ['app.js', 'favorites.js']) vm.runInContext(readFileSync(resolve(root, ...assetPath(file)), 'utf8'), context);
  return {
    window, grid, nodes, calls, alerts,
    click: (button = grid.buttons[0]) => grid.listeners.click({ target: button, preventDefault() {}, stopPropagation() {} })
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
function expectSelected(button, selected) {
  assert.equal(button.classes.has('is-favorite'), selected);
  assert.equal(button.attributes['aria-pressed'], String(selected));
  assert.equal(button.textContent, selected ? '♥' : '♡');
  assert.match(button.attributes['aria-label'], selected ? /해제$/ : /등록$/);
}

test('homepage loads favorite handler after card renderer and keeps pink selected styling', () => {
  const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');
  assert.match(html, /app\.js[\s\S]*favorites\.js/);
  assert.match(readFileSync(resolve(root, 'public/assets/css/styles.css'), 'utf8'), /\.favorite-toggle\.is-favorite\{background:#e83e75/);
});
test('recommended menu loads saved IDs, removes and adds via API without reshuffling cards', async () => {
  const p = page({ saved: [123] });
  await settle();
  const button = p.grid.buttons[0];
  expectSelected(button, true);
  await p.click();
  expectSelected(button, false);
  assert.equal(p.calls.at(-1).method, 'DELETE');
  assert.equal(p.calls.at(-1).url, '/api/my/favorites?menuId=123');
  await p.click();
  expectSelected(button, true);
  assert.equal(p.calls.at(-1).method, 'POST');
  assert.deepEqual(JSON.parse(p.calls.at(-1).body), { menuId: '123' });
  assert.equal(p.grid.buttons[0], button);
  const reloaded = page({ saved: [...p.window.COMPOSE_FAVORITE_IDS] });
  await settle();
  expectSelected(reloaded.grid.buttons[0], true);
});
test('homepage recommended cards toggle the pink favorite heart and persist across reload', async () => {
  const p = page({ home: true, saved: [] });
  await settle();
  const heart = p.grid.buttons[0];
  expectSelected(heart, false);

  await p.click(heart);
  expectSelected(heart, true);
  assert.equal(p.calls.at(-1).method, 'POST');
  assert.deepEqual(JSON.parse(p.calls.at(-1).body), { menuId: '123' });

  const reloadedHome = page({ home: true, saved: [...p.window.COMPOSE_FAVORITE_IDS] });
  await settle();
  expectSelected(reloadedHome.grid.buttons[0], true);

  await reloadedHome.click(reloadedHome.grid.buttons[0]);
  expectSelected(reloadedHome.grid.buttons[0], false);
  assert.equal(reloadedHome.calls.at(-1).method, 'DELETE');
});
test('click during initial fetch waits and duplicate clicks produce one save', async () => {
  let release;
  const p = page({ initialResponse: new Promise((resolve) => { release = resolve; }) });
  const first = p.click(), second = p.click();
  assert.equal(p.calls.length, 1);
  release();
  await Promise.all([first, second]);
  assert.equal(p.calls.filter((call) => call.method).length, 1);
  assert.equal(p.alerts.length, 0);
  expectSelected(p.grid.buttons[0], true);
});
test('logged-out heart preserves selected menu in login destination', async () => {
  const p = page({ status: 401 });
  await p.click();
  assert.equal(new URLSearchParams(p.window.location.href.split('?')[1]).get('next'), '/menu-detail.html?id=123&saveFavorite=1');
  assert.equal(p.calls.length, 1);
  expectSelected(p.grid.buttons[0], false);
});
test('failed save preserves heart state and enables retry', async () => {
  const p = page({ failSave: true });
  await p.click();
  expectSelected(p.grid.buttons[0], false);
  assert.equal(p.grid.buttons[0].disabled, false);
  assert.match(p.nodes['favorite-status'].textContent, /저장 결과를 확인하지 못했습니다/);
  assert.equal(p.nodes['favorite-retry'].hidden, false);
  assert.equal(p.window.location.href, '');
});
test('menu list still renders saved hearts and filters by favorites after toggling', async () => {
  const p = page({ home: false, saved: [123] });
  await settle();
  expectSelected(p.grid.buttons[0], true);
  const tab = element();
  tab.dataset.category = '내 선호 메뉴';
  p.nodes['category-tabs'].listeners.click({ target: tab });
  assert.equal(p.grid.buttons.length, 1);
  await p.click();
  assert.equal(p.grid.buttons.length, 0);
  assert.equal(p.nodes['empty-state'].hidden, false);
  assert.equal(p.nodes['result-count'].textContent, '0개 메뉴');
});

for (const failure of [500, new Error('offline'), 'invalid-json']) {
  test(`favorite load failure ${String(failure)} stays on page and retries`, async () => {
    const p = page({ responsePlan: [failure, failure, 200] });
    await settle();
    assert.equal(p.nodes['favorite-retry'].hidden, false);
    await p.click();
    assert.equal(p.window.location.href, '');
    assert.equal(p.alerts.length, 0);
    expectSelected(p.grid.buttons[0], false);
    p.nodes['favorite-retry'].listeners.click();
    await settle();
    assert.equal(p.nodes['favorite-retry'].hidden, true);
    await p.click();
    expectSelected(p.grid.buttons[0], true);
  });
}
test('pending load immediately disables clicked heart and timeout permits retry', async () => {
  const timeouts = [];
  const p = page({ initialResponse: new Promise(() => {}), timers: {
    setTimeout(fn) { timeouts.push(fn); return timeouts.length; }, clearTimeout() {}
  } });
  const click = p.click();
  assert.equal(p.grid.buttons[0].disabled, true);
  assert.equal(p.grid.buttons[0].attributes['aria-busy'], 'true');
  assert.equal(p.grid.buttons[0].textContent, '…');
  timeouts[0]();
  await click;
  assert.equal(p.grid.buttons[0].disabled, false);
  assert.equal(p.nodes['favorite-retry'].hidden, false);
  assert.equal(p.window.location.href, '');
});
