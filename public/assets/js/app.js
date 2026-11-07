(function () {
  'use strict';

  const menu = Array.isArray(window.COMPOSE_MENU) ? window.COMPOSE_MENU : [];
  const categories = [...new Set(menu.map((item) => item.category))];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const decodeHtmlEntities = (value) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(value ?? '');
    return textarea.value;
  };
  const displayName = (value) => decodeHtmlEntities(value)
    .replace(/^\s*[IH]-\s*/i, '')
    .trim();
  let favoriteState = window.COMPOSE_FAVORITE_STATE || 'loading';
  let favoriteMenuIds = new Set((window.COMPOSE_FAVORITE_IDS || []).map(String));



  function imageFallback(image) {
    if (image.dataset.fallbackShown) return;
    image.dataset.fallbackShown = 'true';
    const fallback = document.createElement('span');
    fallback.className = 'image-fallback';
    fallback.textContent = `${image.alt || '메뉴'} · 사진을 불러올 수 없습니다`;
    image.hidden = true;
    image.after(fallback);
  }
  // Capture failures from images inserted after the initial page load as well.
  document.addEventListener('error', (event) => {
    if (event.target.tagName === 'IMG') imageFallback(event.target);
  }, true);
  document.querySelectorAll('img').forEach((image) => {
    if (image.complete && image.naturalWidth === 0) imageFallback(image);
  });

  const heroDrinkImages = [
    document.getElementById('hero-drink-main-image'),
    document.getElementById('hero-drink-small-image')
  ].filter(Boolean);
  if (heroDrinkImages.length === 2) {
    const uniquePhotos = [...new Map(
      menu.filter((item) => item.image).map((item) => [item.image, item])
    ).values()];
    for (let index = uniquePhotos.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [uniquePhotos[index], uniquePhotos[randomIndex]] = [uniquePhotos[randomIndex], uniquePhotos[index]];
    }
    uniquePhotos.slice(0, 2).forEach((item, index) => {
      heroDrinkImages[index].src = item.image;
      heroDrinkImages[index].alt = `컴포즈커피 ${displayName(item.name)} 메뉴 사진`;
    });
  }

  function caffeineSummary(item) {
    const value = item.nutrition?.split(';').map((part) => part.trim()).find((part) => part.startsWith('카페인 '));
    return value || '카페인 정보 없음';
  }

  function cardMarkup(item, index) {
    const detailUrl = `menu-detail.html?id=${encodeURIComponent(item.id)}`;
    const name = displayName(item.name);
    const isFavorite = favoriteMenuIds.has(String(item.id));
    return `<article class="menu-card" data-menu-id="${escapeHtml(item.id)}" style="--card-index:${index};animation-delay:${index * 180}ms">
      <div class="menu-card-image"><a class="menu-card-image-link" href="${detailUrl}" aria-label="${escapeHtml(name)} 메뉴 상세 보기"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(name)}" loading="lazy"><span class="card-arrow" aria-hidden="true">↗</span></a><button class="favorite-toggle${isFavorite ? ' is-favorite' : ''}" type="button" data-favorite-id="${escapeHtml(item.id)}" aria-pressed="${isFavorite}" aria-label="${escapeHtml(name)} 선호 메뉴 ${isFavorite ? '해제' : '등록'}">${isFavorite ? '♥' : '♡'}</button></div>
      <a class="menu-card-copy" href="${detailUrl}"><small>${escapeHtml(item.category)}</small><h3>${escapeHtml(name)}</h3><span class="menu-card-facts">${escapeHtml(caffeineSummary(item))}</span></a>
    </article>`;
  }

  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) {
    const favorites = [...menu];
    for (let index = favorites.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [favorites[index], favorites[randomIndex]] = [favorites[randomIndex], favorites[index]];
    }
    favorites.length = Math.min(12, favorites.length);
    featuredGrid.innerHTML = favorites.map(cardMarkup).join('') || '<p>메뉴 자료를 불러오지 못했습니다. <a href="menu.html">전체 메뉴 보기</a></p>';
  }

  let renderMenu = () => {};
  const menuGrid = document.getElementById('menu-grid');
  if (menuGrid) {
    const tabs = document.getElementById('category-tabs');
    const search = document.getElementById('menu-search');
    const count = document.getElementById('result-count');
    const empty = document.getElementById('empty-state');
    let selectedCategory = new URLSearchParams(window.location.search).get('favorites') === '1' ? '내 선호 메뉴' : '전체';
    favoriteMenuIds = new Set((window.COMPOSE_FAVORITE_IDS || []).map(String));

    tabs.innerHTML = ['전체', '내 선호 메뉴', ...categories].map((category, index) =>
      `<button class="category-tab" type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === selectedCategory}">${escapeHtml(category)}</button>`
    ).join('');

    renderMenu = () => {
      const query = search.value.trim().toLocaleLowerCase('ko');
      const filtered = menu.filter((item) =>
        (selectedCategory !== '내 선호 메뉴' || favoriteState === 'ready') &&
        (selectedCategory === '전체' || (selectedCategory === '내 선호 메뉴'
          ? favoriteMenuIds.has(String(item.id))
          : item.category === selectedCategory)) && (displayName(item.name).toLocaleLowerCase('ko').includes(query) || decodeHtmlEntities(item.name).trim().toLocaleLowerCase('ko').includes(query))
      );
      menuGrid.innerHTML = filtered.map(cardMarkup).join('');
      count.textContent = `${filtered.length}개 메뉴`;
      const needsMemberState = selectedCategory === '내 선호 메뉴' && favoriteState !== 'ready';
      if (needsMemberState) {
        const messages = {
          loading: '선호 메뉴를 불러오는 중입니다.',
          'signed-out': '로그인 후 나만의 선호 메뉴를 등록하고 확인해 보세요.',
          error: '선호 메뉴를 불러오지 못했습니다. 위의 다시 불러오기 버튼으로 재시도해 주세요.'
        };
        count.textContent = messages[favoriteState] || messages.loading;
        empty.innerHTML = favoriteState === 'signed-out'
          ? '<p>로그인 후 나만의 선호 메뉴를 등록하고 확인해 보세요.</p><a class="button button-dark" href="login.html?next=%2Fmenu.html%3Ffavorites%3D1">로그인하러 가기</a>'
          : `<p>${messages[favoriteState] || messages.loading}</p>`;
      } else {
        empty.textContent = selectedCategory === '내 선호 메뉴' && !query
          ? '아직 등록한 선호 메뉴가 없습니다. 메뉴의 하트를 눌러 등록해 보세요.'
          : '검색 결과가 없습니다. 다른 메뉴 이름으로 검색해 주세요.';
      }
      empty.hidden = filtered.length > 0;
      menuGrid.hidden = filtered.length === 0;
    };

    tabs.addEventListener('click', (event) => {
      const favorite = event.target.closest('[data-favorite-id]');
      if (favorite) return;
      const button = event.target.closest('[data-category]');
      if (!button) return;
      selectedCategory = button.dataset.category;
      tabs.querySelectorAll('.category-tab').forEach((tab) => tab.setAttribute('aria-pressed', String(tab === button)));
      renderMenu();
    });
    const previous = document.getElementById('category-prev');
    const next = document.getElementById('category-next');
    const hint = document.getElementById('category-scroll-hint');
    function updateScrollControls() {
      const max = tabs.scrollWidth - tabs.clientWidth;
      const overflow = max > 1;
      if (previous) previous.hidden = !overflow || tabs.scrollLeft <= 1;
      if (next) next.hidden = !overflow || tabs.scrollLeft >= max - 1;
      if (hint) hint.hidden = !overflow;
    }
    previous?.addEventListener('click', () => tabs.scrollBy({ left: -tabs.clientWidth * .75, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' }));
    next?.addEventListener('click', () => tabs.scrollBy({ left: tabs.clientWidth * .75, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' }));
    tabs.addEventListener('scroll', updateScrollControls, { passive: true });
    window.addEventListener('resize', updateScrollControls);
    if ('ResizeObserver' in window) new ResizeObserver(updateScrollControls).observe(tabs);
    updateScrollControls();
    search.addEventListener('input', renderMenu);
    renderMenu();
  }

  window.setFavoriteState = (state) => {
    favoriteState = state;
    renderMenu();
  };

  window.setFavoriteMenuIds = (ids) => {
    favoriteMenuIds = new Set(ids.map(String));
    window.COMPOSE_FAVORITE_IDS = [...favoriteMenuIds];
    renderMenu();
    document.querySelectorAll('[data-favorite-id]').forEach((button) => {
      const isFavorite = favoriteMenuIds.has(button.dataset.favoriteId);
      button.classList.toggle('is-favorite', isFavorite);
      button.setAttribute('aria-pressed', String(isFavorite));
      const item = menu.find((menuItem) => String(menuItem.id) === button.dataset.favoriteId);
      button.setAttribute('aria-label', `${displayName(item?.name)} 선호 메뉴 ${isFavorite ? '해제' : '등록'}`);
      button.textContent = isFavorite ? '♥' : '♡';
    });
  };

  const detailRoot = document.getElementById('menu-detail');
  if (detailRoot) {
    const id = new URLSearchParams(window.location.search).get('id');
    const item = menu.find((entry) => entry.id === id);
    if (!item) {
      detailRoot.innerHTML = `<div class="not-found"><p class="eyebrow">MENU NOT FOUND</p><h1>메뉴 정보를 찾을 수 없습니다.</h1><p>메뉴 목록에서 다시 선택해 주세요.</p><a class="button button-dark" href="menu.html">메뉴 목록으로</a></div>`;
    } else {
      const nutrition = item.nutrition.split(';').map((part) => part.trim()).filter(Boolean);
      const nutritionMarkup = nutrition.length
        ? nutrition.map((part) => {
          const separator = part.indexOf(' ');
          const label = separator < 0 ? part : part.slice(0, separator);
          const value = separator < 0 ? '정보 없음' : part.slice(separator + 1);
          return `<li class="nutrition-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>`;
        }).join('')
        : '<li class="nutrition-item"><span>제품 영양 정보</span><strong>정보 없음</strong></li>';
      const name = displayName(item.name);
      document.title = `${name} | 컴포즈커피 메뉴`;
      detailRoot.innerHTML = `<a class="back-link" href="menu.html"><span aria-hidden="true">←</span> 전체 메뉴</a>
        <div class="detail-layout">
          <div class="detail-image-wrap"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(name)}" fetchpriority="high"></div>
          <div class="detail-copy"><p class="eyebrow">${escapeHtml(item.category)}</p><h1>${escapeHtml(name)}</h1>
            <p class="favorite-return-note">${new URLSearchParams(window.location.search).get('saveFavorite') === '1' ? '선택한 메뉴로 돌아왔습니다. 자동 저장되지 않습니다. 아래 하트를 눌러 선호 메뉴에 저장해 주세요.' : '하트를 눌러 이 메뉴를 선호 메뉴로 저장할 수 있습니다.'}</p>
            <button class="favorite-toggle detail-favorite${favoriteMenuIds.has(String(item.id)) ? ' is-favorite' : ''}" type="button" data-favorite-id="${escapeHtml(item.id)}" aria-pressed="${favoriteMenuIds.has(String(item.id))}" aria-label="${escapeHtml(name)} 선호 메뉴 ${favoriteMenuIds.has(String(item.id)) ? '해제' : '등록'}">${favoriteMenuIds.has(String(item.id)) ? '♥' : '♡'}</button>
            <h2 class="nutrition-title">제품 영양 정보</h2><ul class="nutrition-list">${nutritionMarkup}</ul>
            <p class="detail-note">제품 정보는 공식 공개 자료를 바탕으로 정리했으며, 제공 시점과 판매 매장에 따라 달라질 수 있습니다. 가격·알레르기 정보는 이 시안에서 제공하지 않습니다. 카페인 미표시는 무카페인을 뜻하지 않습니다. 구매 전 최신 정보는 공식 상세 페이지와 매장에서 확인해 주세요.</p>
            <div class="detail-actions"><a class="button button-dark" href="${escapeHtml(item.detailUrl)}" target="_blank" rel="noopener">공식 제품 정보 <span aria-hidden="true">↗</span></a><a class="button button-outline" href="menu.html">다른 메뉴 보기</a></div>
          </div>
        </div>`;
    }
  }
})();