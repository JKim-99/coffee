(function () {
  'use strict';

  const grids = document.querySelectorAll('#menu-grid, #featured-grid, #menu-detail');
  if (!grids.length) return;
  const status = document.getElementById('favorite-status');
  const retry = document.getElementById('favorite-retry');
  let favoriteMenuIds = new Set((window.COMPOSE_FAVORITE_IDS || []).map(String));
  let state = 'loading';
  let loginTrigger;
  const loginActions = document.getElementById('favorite-login-actions');
  const loginLink = document.getElementById('favorite-login-link');
  const stay = document.getElementById('favorite-stay');

  function setState(value) {
    state = value;
    window.COMPOSE_FAVORITE_STATE = value;
    window.setFavoriteState?.(value);
  }
  const pending = new Set();

  function announce(message, failed = false) {
    if (status) status.textContent = message;
    if (retry) retry.hidden = !failed;
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetch(url, {
            credentials: 'same-origin', ...options, signal: controller.signal
          });
          if (response.status === 401) return { signedOut: true };
          if (!response.ok) throw new Error('request failed');
          return response.json();
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, 10000);
        })
      ]);
    } finally { clearTimeout(timer); }
  }

  function sync() {
    window.COMPOSE_FAVORITE_IDS = [...favoriteMenuIds];
    window.setFavoriteMenuIds?.([...favoriteMenuIds]);
  }

  async function loadFavorites() {
    setState('loading');
    announce('선호 메뉴를 확인하고 있습니다.');
    try {
      const data = await request('/api/my/favorites', { headers: { accept: 'application/json' } });
      if (data.signedOut) {
        setState('signed-out');
        announce('선호 메뉴는 로그인 후 이용할 수 있습니다. 메뉴는 계속 둘러보실 수 있습니다.');
        return;
      }
      if (!Array.isArray(data.favorites)) throw new Error('invalid favorites');
      favoriteMenuIds = new Set(data.favorites.map((item) => String(item.menu_id)));
      setState('ready');
      sync();
      announce('하트를 눌러 선호 메뉴를 등록하거나 해제할 수 있습니다.');
    } catch (error) {
      setState('error');
      announce('선호 메뉴를 확인하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.', true);
    }
  }

  let loadPromise = loadFavorites();
  retry?.addEventListener('click', () => {
    if (state !== 'loading') loadPromise = loadFavorites();
  });

  function loginForMenu(menuId, button) {
    const destination = `/menu-detail.html?id=${encodeURIComponent(menuId)}&saveFavorite=1`;
    if (loginLink) loginLink.href = `login.html?next=${encodeURIComponent(destination)}`;
    if (loginActions) loginActions.hidden = false;
    loginTrigger = button;
    announce('로그인이 필요한 기능입니다. 로그인하러 가거나 현재 화면에서 계속 둘러보실 수 있습니다.');
    loginLink?.focus();
  }
  stay?.addEventListener('click', () => {
    if (loginActions) loginActions.hidden = true;
    announce('메뉴를 계속 둘러보실 수 있습니다. 선호 메뉴 저장은 로그인 후 이용해 주세요.');
    loginTrigger?.focus();
  });
  window.reloadFavoriteMenus = () => { if (state !== 'loading') loadPromise = loadFavorites(); };

  grids.forEach((grid) => grid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-favorite-id]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const menuId = button.dataset.favoriteId;
    if (pending.has(menuId)) return;
    pending.add(menuId);
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = '…';
    announce('선호 메뉴를 확인하고 있습니다.');
    try {
      if (state === 'error') loadPromise = loadFavorites();
      await loadPromise;
      if (state === 'error') return;
      if (state === 'signed-out') { loginForMenu(menuId, button); return; }
      const wasFavorite = favoriteMenuIds.has(menuId);
      announce('선호 메뉴를 저장하고 있습니다.');
      const data = await request(wasFavorite
        ? `/api/my/favorites?menuId=${encodeURIComponent(menuId)}` : '/api/my/favorites', {
        method: wasFavorite ? 'DELETE' : 'POST',
        headers: { accept: 'application/json', ...(wasFavorite ? {} : { 'content-type': 'application/json' }) },
        body: wasFavorite ? undefined : JSON.stringify({ menuId })
      });
      if (data.signedOut) { setState('signed-out'); loginForMenu(menuId, button); return; }
      if (typeof data.isFavorite !== 'boolean') throw new Error('invalid favorite');
      if (data.isFavorite) favoriteMenuIds.add(menuId);
      else favoriteMenuIds.delete(menuId);
      sync();
      announce(data.isFavorite ? '선호 메뉴에 등록했습니다.' : '선호 메뉴를 해제했습니다.');
    } catch (error) {
      // A timeout may have completed on the server. Reload before the next change.
      setState('error');
      announce('저장 결과를 확인하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.', true);
    } finally {
      pending.delete(menuId);
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = favoriteMenuIds.has(menuId) ? '♥' : '♡';
    }
  }));
})();
