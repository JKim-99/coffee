const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const assetPath = (file) => file.endsWith('.html') ? ['public', file] : file.endsWith('.css') ? ['public', 'assets', 'css', file] : ['public', 'assets', 'js', file];
const source = (name) => readFileSync(resolve(__dirname, '..', ...assetPath(name)), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));
function element() {
  const classes = new Set();
  return {
    attrs: {}, dataset: {}, handlers: {}, classes, value: '', innerHTML: '',
    classList: { add: (name) => classes.add(name), toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
    setAttribute(name, value) { this.attrs[name] = value; }, getAttribute(name) { return this.attrs[name]; },
    removeAttribute(name) { delete this.attrs[name]; },
    addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    after(node) { this.fallback = node; }
  };
}
function navigation(status = 401, withNav = true) {
  const nav = element(), toggle = element(), links = [element(), element(), element()];
  toggle.attrs = { 'aria-expanded': 'false', 'aria-controls': 'primary-nav' };
  links.forEach((link) => { link.href = '/contact.html'; });
  const errors = {}, alerts = [], calls = [];
  const document = {
    querySelector: () => withNav ? nav : null,
    querySelectorAll: (selector) => selector === '.nav-toggle' ? (withNav ? [toggle] : [])
      : selector.startsWith('a[href=') ? links : [],
    getElementById: (id) => id === 'primary-nav' ? nav : null,
    addEventListener: (name, handler) => { errors[name] = handler; },
    createElement: () => element()
  };
  const window = { COMPOSE_MENU: [], location: { href: '' }, alert: (message) => alerts.push(message) };
  const context = vm.createContext({ document, window, AbortController, setTimeout, clearTimeout,
    fetch: async (url) => {
      calls.push(url);
      if (status instanceof Error) throw status;
      return { status, ok: status === 200, json: async () => ({ user: { nickname: 'QA' } }) };
    }
  });
  for (const file of ['app.js', 'contact.js', 'site-auth.js']) vm.runInContext(source(file), context);
  return { nav, toggle, links, alerts, window, errors };
}
test('app, contact and auth scripts together bind exactly one native menu click handler', () => {
  const p = navigation();
  assert.equal(p.toggle.handlers.click.length, 1);
  p.toggle.handlers.click[0]();
  assert.equal(p.toggle.attrs['aria-expanded'], 'true');
  assert.equal(p.nav.classes.has('is-open'), true);
  p.toggle.handlers.click[0]();
  assert.equal(p.toggle.attrs['aria-expanded'], 'false');
  assert.equal(p.nav.classes.has('is-open'), false);
});
for (const status of [401, 200, 500, new Error('offline')]) {
  test(`all header, body and footer inquiry links follow same policy: ${status}`, async () => {
    const p = navigation(status);
    for (const link of p.links) {
      p.window.location.href = '';
      await link.handlers.click[0]({ preventDefault() {} });
      assert.equal(p.window.location.href, status === 401 ? 'login.html?next=%2Fcontact.html' : status === 200 ? '/contact.html' : '');
      assert.equal(link.attrs['aria-busy'], undefined);
    }
  });
}
test('captured image errors provide named fallback for hero and dynamically created cards', () => {
  const p = navigation();
  for (const name of ['히어로 라떼', '추천 아메리카노']) {
    const image = element();
    image.tagName = 'IMG'; image.alt = name;
    p.errors.error({ target: image });
    assert.equal(image.hidden, true);
    assert.match(image.fallback.textContent, new RegExp(name));
    assert.equal(image.fallback.className, 'image-fallback');
    const first = image.fallback;
    p.errors.error({ target: image });
    assert.equal(image.fallback, first);
  }
});
async function login(next) {
  const status = element(), form = element(), field = element(), submit = element();
  form.reportValidity = () => true;
  form.querySelector = (selector) => selector === '[type="submit"]' ? submit : field;
  const location = { origin: 'http://localhost:8788', href: `http://localhost:8788/login.html?next=${encodeURIComponent(next)}`, search: `?next=${encodeURIComponent(next)}` };
  vm.runInNewContext(source('auth.js'), {
    document: { querySelectorAll: () => [], getElementById: (id) => id === 'login-form' ? form : id === 'auth-status' ? status : null },
    window: { location, localStorage: { getItem() {}, removeItem() {} }, setTimeout(fn) { fn(); } },
    FormData: class { get(name) { return name === 'email' ? 'qa@example.invalid' : 'test-password'; } },
    location, URL, URLSearchParams,
    fetch: async (url, options = {}) => ({ ok: !!options.method, json: async () => ({ user: { email: 'qa@example.invalid', nickname: 'QA' } }) })
  });
  await form.handlers.submit[0]({ preventDefault() {} });
  return location.href;
}
test('actual login handler returns to selected menu confirmation without auto-saving', async () => {
  assert.equal(await login('/menu-detail.html?id=123&saveFavorite=1'), '/menu-detail.html?id=123&saveFavorite=1');
  assert.equal(await login('/contact.html'), '/contact.html');
});
for (const next of ['https://evil.invalid/', '//evil.invalid/', '\\evil.invalid', 'javascript:alert(1)', '/api/auth/me', '/login.html']) {
  test(`login rejects unsafe or unsupported destination ${next}`, async () => {
    assert.equal(await login(next), 'index.html');
  });
}
test('selected detail page includes explicit heart confirmation and known caffeine data on cards', () => {
  const detail = element(), grid = element();
  const menu = [{ id: '123', name: '라떼', category: '커피', image: 'latte.jpg', nutrition: '카페인 100 mg; 칼로리 50 kcal', detailUrl: 'https://example.invalid/' }];
  const nodes = { 'menu-detail': detail, 'featured-grid': grid };
  vm.runInNewContext(source('app.js'), {
    window: { COMPOSE_MENU: menu, location: { search: '?id=123&saveFavorite=1' } },
    document: { getElementById: (id) => nodes[id] || null, querySelectorAll: () => [], addEventListener() {},
      createElement: () => ({ set innerHTML(value) { this.value = value; } }) },
    URLSearchParams
  });
  assert.match(detail.innerHTML, /data-favorite-id="123"/);
  assert.match(detail.innerHTML, /자동 저장되지 않습니다/);
  assert.match(grid.innerHTML, /카페인 100 mg/);
  assert.match(detail.innerHTML, /가격·알레르기 정보는 이 시안에서 제공하지 않습니다/);
});

test('inquiry links on login and signup pages work without primary navigation', async () => {
  const p = navigation(401, false);
  await p.links[0].handlers.click[0]({ preventDefault() {} });
  assert.equal(p.window.location.href, 'login.html?next=%2Fcontact.html');
});
for (const authStatus of [401, 500, 200]) {
  test(`direct contact submission checks session before writing: ${authStatus}`, async () => {
    const nodes = new Map();
    const get = (id) => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
    const form = get('contact-form'), submit = element(), calls = [];
    form.reportValidity = () => true; form.reset = () => {};
    form.querySelector = () => submit;
    const location = { href: '' };
    vm.runInNewContext(source('contact.js'), {
      document: { getElementById: get },
      window: { location }, AbortController, setTimeout, clearTimeout,
      FormData: class { get(name) { return ({name:'QA', email:'qa@example.invalid', topic:'일반 문의', subject:'제목', message:'내용'})[name]; } },
      fetch: async (url, options = {}) => {
        calls.push({ url, ...options });
        const status = url === '/api/auth/me' ? authStatus : options.method === 'POST' ? 201 : 401;
        return { status, ok: status < 400, json: async () => ({ user: { nickname: 'QA' } }) };
      }
    });
    await form.handlers.submit[0]({ preventDefault() {} });
    assert.equal(calls.filter((call) => call.method === 'POST').length, authStatus === 200 ? 1 : 0);
    assert.equal(submit.disabled, false);
    assert.equal(location.href, authStatus === 401 ? 'login.html?next=%2Fcontact.html' : '');
    if (authStatus === 500) assert.match(get('form-status').textContent, /로그인 상태를 확인하지 못했습니다/);
  });
}
