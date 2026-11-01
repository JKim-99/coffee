const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const root = resolve(__dirname, '..');

// Minimal DOM for exercising the real page scripts and delegated click handlers.
function element() {
  return {
    dataset: {}, attributes: {}, classes: new Set(), listeners: {}, value: '', disabled: false,
    classList: { add() {}, toggle() {} },
    setAttribute(name, value) { this.attributes[name] = value; },
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

function page({ home = true, saved = [], status = 200, failSave = false, initialResponse } = {}) {
  const grid = element();
  const nodes = { [home ? 'featured-grid' : 'menu-grid']: grid };
  if (!home) for (const id of ['category-tabs', 'menu-search', 'result-count', 'empty-state']) nodes[id] = element();
  const calls = [], alerts = [];
  const window = {
    COMPOSE_MENU: [{ id: '123', name: '라떼', category: '커피', image: 'latte.jpg' }],
    location: { pathname: home ? '/' : '/menu.html', search: '', href: '' },
    alert: (message) => alerts.push(message)
  };
  const document = {
    getElementById: (id) => nodes[id] || null,
    createElement: () => ({ set innerHTML(value) { this.value = value; } }),
    querySelectorAll: (selector) => selector === '#menu-grid, #featured-grid' ? [grid]
      : selector === '[data-favorite-id]' ? grid.buttons : []
  };
  const fetch = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (!options.method) {
      if (initialResponse) await initialResponse;
      return { status, ok: status === 200, json: async () => ({ favorites: saved.map((menu_id) => ({ menu_id })) }) };
    }
    return { status: failSave ? 500 : 200, ok: !failSave, json: async () => failSave
      ? { error: '저장 실패' } : { isFavorite: options.method === 'POST' } };
  };
  const context = vm.createContext({ window, document, fetch });
  for (const file of ['app.js', 'favorites.js']) vm.runInContext(readFileSync(resolve(root, file), 'utf8'), context);
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
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  assert.match(html, /app\.js[\s\S]*favorites\.js/);
  assert.match(readFileSync(resolve(root, 'styles.css'), 'utf8'), /\.favorite-toggle\.is-favorite\{background:#e83e75/);
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
test('logged-out homepage sends user back to current page after login', async () => {
  const p = page({ status: 401 });
  await p.click();
  assert.equal(p.window.location.href, 'login.html?next=%2F');
  assert.equal(p.calls.length, 1);
  expectSelected(p.grid.buttons[0], false);
});
test('failed save preserves heart state and enables retry', async () => {
  const p = page({ failSave: true });
  await p.click();
  expectSelected(p.grid.buttons[0], false);
  assert.equal(p.grid.buttons[0].disabled, false);
  assert.deepEqual(p.alerts, ['저장 실패']);
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
