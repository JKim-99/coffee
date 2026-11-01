(function () {
  'use strict';

  const menuGrid = document.getElementById('menu-grid');
  if (!menuGrid) return;

  let favoriteMenuIds = new Set();
  let loggedIn = false;

  fetch('/api/my/favorites', { credentials: 'same-origin', headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (response.status === 401) return null;
      if (!response.ok) throw new Error('선호 메뉴를 불러오지 못했습니다.');
      return response.json();
    })
    .then((data) => {
      if (!data) return;
      loggedIn = true;
      favoriteMenuIds = new Set(data.favorites.map((item) => String(item.menu_id)));
      window.setFavoriteMenuIds?.([...favoriteMenuIds]);
    })
    .catch(() => {});

  menuGrid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-favorite-id]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    if (!loggedIn) {
      window.alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
      window.location.href = `login.html?next=${encodeURIComponent('menu.html')}`;
      return;
    }

    const menuId = button.dataset.favoriteId;
    const wasFavorite = favoriteMenuIds.has(menuId);
    button.disabled = true;
    try {
      const response = await fetch(wasFavorite
        ? `/api/my/favorites?menuId=${encodeURIComponent(menuId)}`
        : '/api/my/favorites', {
        method: wasFavorite ? 'DELETE' : 'POST',
        credentials: 'same-origin',
        headers: { accept: 'application/json', ...(wasFavorite ? {} : { 'content-type': 'application/json' }) },
        body: wasFavorite ? undefined : JSON.stringify({ menuId })
      });
      const data = await response.json();
      if (response.status === 401) {
        window.alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        window.location.href = `login.html?next=${encodeURIComponent('menu.html')}`;
        return;
      }
      if (!response.ok) throw new Error(data.error || '선호 메뉴를 저장하지 못했습니다.');
      if (data.isFavorite) favoriteMenuIds.add(menuId);
      else favoriteMenuIds.delete(menuId);
      window.setFavoriteMenuIds?.([...favoriteMenuIds]);
    } catch (error) {
      window.alert(error.message || '선호 메뉴를 변경하지 못했습니다.');
    } finally {
      button.disabled = false;
    }
  });
})();