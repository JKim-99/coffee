(function () {
  'use strict';

  const menu = Array.isArray(window.COMPOSE_MENU) ? window.COMPOSE_MENU : [];
  const categories = [...new Set(menu.map((item) => item.category))];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  document.querySelectorAll('.nav-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.setAttribute('aria-label', expanded ? '메뉴 열기' : '메뉴 닫기');
      document.getElementById(button.getAttribute('aria-controls'))?.classList.toggle('is-open', !expanded);
    });
  });

  document.querySelectorAll('img').forEach((image) => {
    image.addEventListener('error', () => {
      image.classList.add('image-unavailable');
      image.alt = image.alt || '이미지를 불러올 수 없습니다';
      image.removeAttribute('src');
    }, { once: true });
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
      heroDrinkImages[index].alt = `컴포즈커피 ${item.name} 메뉴 사진`;
    });
  }

  function cardMarkup(item, index) {
    const detailUrl = `menu-detail.html?id=${encodeURIComponent(item.id)}`;
    return `<a class="menu-card" href="${detailUrl}" style="--card-index:${index};animation-delay:${index * 180}ms" aria-label="${escapeHtml(item.name)} 메뉴 상세 보기">
      <div class="menu-card-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy"><span class="card-arrow" aria-hidden="true">↗</span></div>
      <div class="menu-card-copy"><small>${escapeHtml(item.category)}</small><h3>${escapeHtml(item.name)}</h3></div>
    </a>`;
  }

  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) {
    const favorites = [...menu];
    for (let index = favorites.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [favorites[index], favorites[randomIndex]] = [favorites[randomIndex], favorites[index]];
    }
    favorites.length = Math.min(12, favorites.length);
    featuredGrid.innerHTML = favorites.map(cardMarkup).join('') || '<p>메뉴 자료를 불러오지 못했습니다.</p>';
    document.querySelectorAll('.section-heading, .brand-callout-inner').forEach((element) => element.classList.add('reveal'));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }), { threshold: 0.14 });
      document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
    } else {
      document.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'));
    }
  }

  const menuGrid = document.getElementById('menu-grid');
  if (menuGrid) {
    const tabs = document.getElementById('category-tabs');
    const search = document.getElementById('menu-search');
    const count = document.getElementById('result-count');
    const empty = document.getElementById('empty-state');
    let selectedCategory = '전체';

    tabs.innerHTML = ['전체', ...categories].map((category, index) =>
      `<button class="category-tab" type="button" data-category="${escapeHtml(category)}" aria-pressed="${index === 0}">${escapeHtml(category)}</button>`
    ).join('');

    function renderMenu() {
      const query = search.value.trim().toLocaleLowerCase('ko');
      const filtered = menu.filter((item) =>
        (selectedCategory === '전체' || item.category === selectedCategory) && item.name.toLocaleLowerCase('ko').includes(query)
      );
      menuGrid.innerHTML = filtered.map(cardMarkup).join('');
      count.textContent = `${filtered.length}개 메뉴`;
      empty.hidden = filtered.length > 0;
      menuGrid.hidden = filtered.length === 0;
    }

    tabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      selectedCategory = button.dataset.category;
      tabs.querySelectorAll('.category-tab').forEach((tab) => tab.setAttribute('aria-pressed', String(tab === button)));
      renderMenu();
    });
    search.addEventListener('input', renderMenu);
    renderMenu();
  }

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
      document.title = `${item.name} | 컴포즈커피 메뉴`;
      detailRoot.innerHTML = `<a class="back-link" href="menu.html"><span aria-hidden="true">←</span> 전체 메뉴</a>
        <div class="detail-layout">
          <div class="detail-image-wrap"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" fetchpriority="high"></div>
          <div class="detail-copy"><p class="eyebrow">${escapeHtml(item.category)}</p><h1>${escapeHtml(item.name)}</h1>
            <h2 class="nutrition-title">제품 영양 정보</h2><ul class="nutrition-list">${nutritionMarkup}</ul>
            <p class="detail-note">제품 정보는 공식 공개 자료를 바탕으로 정리했으며, 제공 시점과 판매 매장에 따라 달라질 수 있습니다. 최신 정보는 공식 상세 페이지에서 확인해 주세요.</p>
            <div class="detail-actions"><a class="button button-dark" href="${escapeHtml(item.detailUrl)}" target="_blank" rel="noopener">공식 제품 정보 <span aria-hidden="true">↗</span></a><a class="button button-outline" href="menu.html">다른 메뉴 보기</a></div>
          </div>
        </div>`;
    }
  }
})();