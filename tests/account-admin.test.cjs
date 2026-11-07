const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const assetPath = (file) => file.endsWith('.html') ? ['public', file] : file.endsWith('.css') ? ['public', 'assets', 'css', file] : ['public', 'assets', 'js', file];
const source = (file) => readFileSync(resolve(__dirname, '..', ...assetPath(file)), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));
function element() {
  return {
    dataset: {}, attrs: {}, listeners: {}, value: '', hidden: false, innerHTML: '',
    textContent: '', reset() { this.wasReset = true; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name]; },
    removeAttribute(name) { delete this.attrs[name]; },
    querySelectorAll() { return []; }
  };
}
function auth({ withLogin = false, failLogout = false, signedOut = false, header = false } = {}) {
  const logout = element(), account = element(), login = element(), signup = element(), status = element();
  const nav = { classList: { add() {} }, querySelector(selector) {
    if (selector === 'a[href="login.html"]') return withLogin ? login : null;
    if (selector === '#nav-logout-link') return header ? null : logout;
    if (selector === 'a[href="signup.html"]') return signup;
    if (selector === '#nav-account-link' || selector === 'a[href="account.html"]') return account;
    return null;
  } };
  const calls = [], redirects = [], alerts = [];
  vm.runInNewContext(source('site-auth.js'), {
    document: { querySelector: () => nav, querySelectorAll: () => [], getElementById: (id) => id === 'account-header-logout' ? (header ? logout : null) : id === 'account-status' ? status : null },
    window: { location: { replace: (url) => redirects.push(url) }, alert: (message) => alerts.push(message) },
    fetch: async (url, options = {}) => {
      calls.push({ url, ...options });
      return { ok: !signedOut && !(failLogout && options.method === 'DELETE'), json: async () => ({ user: { nickname: '테스트' } }) };
    }
  });
  return { logout, account, login, signup, status, calls, redirects, alerts };
}
test('existing account header logs out without a login link or duplicate account link', async () => {
  const p = auth();
  await settle();
  await p.logout.listeners.click({ preventDefault() {} });
  assert.equal(p.calls.filter((call) => call.method === 'DELETE').length, 1);
  assert.equal(p.calls.at(-1).credentials, 'same-origin');
  assert.deepEqual(p.redirects, ['login.html']);
  assert.equal(p.account.attrs['aria-label'], '테스트님 회원 정보');
});
test('other pages still bind logout and hide login link', async () => {
  const p = auth({ withLogin: true });
  await settle();
  assert.equal(p.login.hidden, true);
  await p.logout.listeners.click({ preventDefault() {} });
  assert.deepEqual(p.redirects, ['login.html']);
});
test('logout failure restores header control without redirecting', async () => {
  const p = auth({ failLogout: true });
  await settle();
  await p.logout.listeners.click({ preventDefault() {} });
  assert.equal(p.logout.textContent, '로그아웃');
  assert.equal(p.logout.attrs['aria-disabled'], undefined);
  assert.equal(p.alerts.length, 0);
  assert.match(p.status.textContent, /로그아웃하지 못했습니다/);
  assert.equal(p.redirects.length, 0);
});
test('account page has only the header logout and account script has no removed button dependency', () => {
  assert.equal((source('account.html').match(/>로그아웃</g) || []).length, 1);
  assert.doesNotMatch(source('account.html') + source('account.js'), /account-logout/);
});
function admin(items) {
  const nodes = new Map();
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); };
  vm.runInNewContext(source('admin.js'), {
    document: { getElementById: get, querySelector: () => element() },
    window: { alert() {} },
    fetch: async () => ({ ok: true, json: async () => ({ inquiries: items }) })
  });
  return get;
}
const inquiry = (id, topic) => ({ id, topic, subject: `문의 ${id}`, email: 'test@example.invalid', name: '테스트', message: '문의 내용', created_at: '2026-11-01T00:00:00Z' });
test('admin groups inquiries by topic with counts and filters without losing the choice on refresh', async () => {
  const get = admin([inquiry('1', '메뉴 문의'), inquiry('2', '일반 문의'), inquiry('3', '메뉴 문의')]);
  await settle();
  const list = get('admin-inquiry-list'), filter = get('admin-topic-filter');
  assert.equal((list.innerHTML.match(/class="admin-inquiry-group"/g) || []).length, 2);
  assert.match(list.innerHTML, /메뉴 문의 <span>2건/);
  filter.value = '메뉴 문의';
  filter.listeners.change();
  assert.match(list.innerHTML, /data-inquiry-id="1"/);
  assert.doesNotMatch(list.innerHTML, /data-inquiry-id="2"/);
  assert.match(get('admin-list-status').textContent, /2건의 문의 · 전체 3건/);
  await get('refresh-inquiries').listeners.click();
  assert.equal(filter.value, '메뉴 문의');
  // Switching categories clears details for a hidden inquiry.
  list.listeners.click({ target: { closest: () => ({ dataset: { inquiryId: '1' } }) } });
  assert.equal(get('admin-reply-panel').hidden, false);
  filter.value = '일반 문의';
  filter.listeners.change();
  assert.equal(get('admin-reply-panel').hidden, true);
});
test('admin handles empty and missing topics and escapes category text', async () => {
  const empty = admin([]);
  await settle();
  assert.equal(empty('admin-inquiry-list').innerHTML, '');
  assert.equal(empty('admin-list-status').textContent, '등록된 문의가 없습니다.');
  const get = admin([inquiry('1', ''), inquiry('2', '<img src=x>')]);
  await settle();
  const html = get('admin-inquiry-list').innerHTML;
  assert.match(html, /기타 <span>1건/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.doesNotMatch(html, /<img/);
});

test('signed-out account navigation hides member controls and keeps login/signup visible', async () => {
  const p = auth({ withLogin: true, signedOut: true, header: true });
  await settle();
  assert.equal(p.logout.hidden, true);
  assert.equal(p.account.hidden, true);
  assert.notEqual(p.login.hidden, true);
  assert.notEqual(p.signup.hidden, true);
});
test('authenticated account header provides one-step logout outside the mobile menu', async () => {
  const p = auth({ withLogin: true, header: true });
  await settle();
  assert.equal(p.logout.hidden, false);
  assert.equal(p.signup.hidden, true);
  await p.logout.listeners.click({ preventDefault() {} });
  assert.deepEqual(p.redirects, ['login.html']);
});

test('admin inquiry list escapes markup and detail preserves raw content as plain text', async () => {
  const item={...inquiry('x','일반 문의'),subject:'<img src=x onerror=alert(1)>',name:'<svg onload=alert(1)>',message:'<script>alert(1)</script>',email:'test@example.invalid'};
  const get=admin([item]);await settle();
  assert.doesNotMatch(get('admin-inquiry-list').innerHTML,/<img/);
  assert.match(get('admin-inquiry-list').innerHTML,/&lt;img/);
  get('admin-inquiry-list').listeners.click({target:{closest:()=>({dataset:{inquiryId:'x'}})}});
  assert.equal(get('selected-subject').textContent,item.subject);
  assert.equal(get('selected-message').textContent,item.message);
});
