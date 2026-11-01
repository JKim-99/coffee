(function () {
  'use strict';

  const nav = document.querySelector('.primary-nav');

  document.querySelectorAll('.nav-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.setAttribute('aria-label', expanded ? '메뉴 열기' : '메뉴 닫기');
      document.getElementById(button.getAttribute('aria-controls'))?.classList.toggle('is-open', !expanded);
    });
  });

  document.querySelectorAll('a[href="contact.html"], a[href="/contact.html"], a[href="/contact"]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      if (link.getAttribute('aria-busy') === 'true') return;
      link.setAttribute('aria-busy', 'true');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'same-origin', headers: { accept: 'application/json' }, signal: controller.signal
        });
        if (response.status === 401) {
          window.alert('로그인이 필요합니다. 로그인 후 문의하기로 돌아옵니다.');
          window.location.href = 'login.html?next=%2Fcontact.html';
        } else if (response.ok && (await response.json()).user) {
          window.location.href = link.href;
        } else {
          throw new Error('session unavailable');
        }
      } catch (error) {
        window.alert('로그인 상태를 확인하지 못했습니다. 연결을 확인하고 문의하기를 다시 눌러 주세요.');
      } finally {
        clearTimeout(timer);
        link.removeAttribute('aria-busy');
      }
    });
  });

  if (!nav) return;
  nav.classList.add('is-enhanced');

  const loginLink = nav.querySelector('a[href="login.html"]');

  function addNavLink(href, label, id) {
    let link = nav.querySelector(`#${id}`) || nav.querySelector(`a[href="${href}"]`);
    if (!link) {
      link = document.createElement('a');
      link.className = 'nav-link';
      link.id = id;
      link.href = href;
      link.textContent = label;
      nav.insertBefore(link, nav.querySelector('.nav-cta') || null);
    }
    return link;
  }

  function bindLogout(logoutLink) {
    if (logoutLink.dataset.authLogoutBound === 'true') return;
    logoutLink.dataset.authLogoutBound = 'true';
    logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      if (logoutLink.getAttribute('aria-disabled') === 'true') return;
      logoutLink.setAttribute('aria-disabled', 'true');
      logoutLink.textContent = '로그아웃 중…';
      try {
        const logoutResponse = await fetch('/api/auth/me', {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { accept: 'application/json' }
        });
        if (!logoutResponse.ok) throw new Error('logout failed');
        window.location.replace('login.html');
      } catch (error) {
        logoutLink.removeAttribute('aria-disabled');
        logoutLink.textContent = '로그아웃';
        window.alert('로그아웃하지 못했습니다. 다시 시도해 주세요.');
      }
    });
  }

  const existingLogoutLink = nav.querySelector('#nav-logout-link');
  if (existingLogoutLink) bindLogout(existingLogoutLink);

  async function refreshAuthNavigation() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        headers: { accept: 'application/json' }
      });
      if (!response.ok) return;
      const { user } = await response.json();
      if (!user) return;

      if (loginLink) loginLink.hidden = true;
      const accountLink = addNavLink('account.html', '내 정보', 'nav-account-link');
      accountLink.setAttribute('aria-label', `${user.nickname}님 회원 정보`);
      const logoutLink = addNavLink('#logout', '로그아웃', 'nav-logout-link');
      logoutLink.href = '#logout';
      bindLogout(logoutLink);
    } catch (error) {
      // Keep the logged-out navigation if the session status cannot be checked.
    }
  }

  refreshAuthNavigation();
})();