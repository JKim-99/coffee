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
  // Contact information is public; authentication is required only when submitting.
  if (!nav) return;
  nav.classList.add('is-enhanced');

  const loginLink = nav.querySelector('a[href="login.html"]');
  const signupLink = nav.querySelector('a[href="signup.html"]');
  const headerLogout = document.getElementById('account-header-logout');
  const existingLogout = nav.querySelector('#nav-logout-link');
  const existingAccount = nav.querySelector('a[href="account.html"]');
  [existingLogout, existingAccount, headerLogout].filter(Boolean).forEach((link) => { link.hidden = true; });

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
    link.hidden = false;
    return link;
  }

  function reportLogoutFailure() {
    let status = document.getElementById('nav-auth-status') || document.getElementById('account-status');
    if (!status) {
      status = document.createElement('p');
      status.id = 'nav-auth-status';
      status.className = 'nav-auth-status';
      status.setAttribute('role', 'status');
      nav.after(status);
    }
    status.hidden = false;
    status.textContent = '로그아웃하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.';
  }

  function bindLogout(control) {
    if (control.dataset.authLogoutBound === 'true') return;
    control.dataset.authLogoutBound = 'true';
    control.addEventListener('click', async (event) => {
      event.preventDefault();
      if (control.getAttribute('aria-disabled') === 'true') return;
      control.setAttribute('aria-disabled', 'true');
      control.textContent = '로그아웃 중…';
      try {
        const response = await fetch('/api/auth/me', {
          method: 'DELETE', credentials: 'same-origin', headers: { accept: 'application/json' }
        });
        if (!response.ok) throw new Error('logout failed');
        window.location.replace('login.html');
      } catch {
        control.removeAttribute('aria-disabled');
        control.textContent = '로그아웃';
        reportLogoutFailure();
      }
    });
  }

  async function refreshAuthNavigation() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'same-origin', headers: { accept: 'application/json' }
      });
      if (!response.ok) return;
      const { user } = await response.json();
      if (!user) return;
      if (loginLink) loginLink.hidden = true;
      if (signupLink) signupLink.hidden = true;
      const account = addNavLink('account.html', '내 정보', 'nav-account-link');
      account.setAttribute('aria-label', `${user.nickname}님 회원 정보`);
      const logout = headerLogout || addNavLink('#logout', '로그아웃', 'nav-logout-link');
      logout.hidden = false;
      bindLogout(logout);
    } catch {
      // Keep public navigation available if the session cannot be verified.
    }
  }
  refreshAuthNavigation();
})();
