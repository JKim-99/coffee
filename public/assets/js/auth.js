(function () {
  'use strict';

  const status = document.getElementById('auth-status');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');
  // Only navigate back to a known local page, never a third-party URL.
  function returnDestination() {
    const next = new URLSearchParams(window.location.search).get('next');
    if (!next || /[\\\r\n]/.test(next)) return 'index.html';
    try {
      const url = new URL(next, window.location.href);
      const allowed = new Set(['/', '/index.html', '/menu.html', '/menu', '/menu-detail.html', '/menu-detail', '/contact.html', '/contact', '/inquiries.html', '/inquiries', '/inquiry-detail.html', '/inquiry-detail', '/account.html', '/account']);
      if (url.origin !== window.location.origin || !allowed.has(url.pathname)) return 'index.html';
      return url.pathname + url.search + url.hash;
    } catch { return 'index.html'; }
  }
  const destination = returnDestination();
  if (destination !== 'index.html') {
    document.querySelectorAll('a[href="signup.html"], a[href="login.html"]').forEach((link) => {
      link.href += `?next=${encodeURIComponent(destination)}`;
    });
  }
  const rememberedEmailKey = 'composecoffee.remembered-email.v1';

  if (loginForm) {
    const emailInput = loginForm.querySelector('[name="email"]');
    const rememberEmail = loginForm.querySelector('[name="rememberEmail"]');
    try {
      const rememberedEmail = window.localStorage.getItem(rememberedEmailKey);
      if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberEmail.checked = true;
      }
    } catch (error) {
      // Remember-email is optional when browser storage is unavailable.
    }

    rememberEmail?.addEventListener('change', () => {
      if (rememberEmail.checked) return;
      try { window.localStorage.removeItem(rememberedEmailKey); } catch (error) {}
    });
  }

  async function send(url, method, payload) {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: payload ? { 'content-type': 'application/json', accept: 'application/json' } : { accept: 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
    return data;
  }

  if (signupForm && status) {
    const passwordInput = signupForm.querySelector('[name="password"]');
    const confirmInput = signupForm.querySelector('[name="passwordConfirm"]');
    const nicknameInput = signupForm.querySelector('[name="nickname"]');
    [passwordInput, confirmInput, nicknameInput].forEach((input) => input?.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
    }));
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!signupForm.reportValidity()) return;
      const fields = new FormData(signupForm);
      const password = String(fields.get('password'));
      const nickname = String(fields.get('nickname')).trim();
      let invalid;
      if (!/\S/u.test(password)) {
        status.textContent = '비밀번호는 공백만으로 구성할 수 없습니다.';
        invalid = passwordInput;
      } else if (password !== String(fields.get('passwordConfirm'))) {
        status.textContent = '비밀번호가 일치하지 않습니다.';
        invalid = confirmInput;
      } else if (!/^[\p{L}\p{M}\p{N} ._'\-]+$/u.test(nickname)) {
        status.textContent = '닉네임에는 글자·숫자·공백과 . _ \' - 기호만 사용할 수 있습니다.';
        invalid = nicknameInput;
      }
      if (invalid) {
        invalid.setAttribute('aria-invalid', 'true');
        invalid.focus();
        return;
      }
      const submit = signupForm.querySelector('[type="submit"]');
      submit.disabled = true;
      status.textContent = '회원 정보를 저장하고 있습니다.';
      try {
        await send('/api/auth/signup', 'POST', {
          nickname: String(fields.get('nickname')).trim(),
          email: String(fields.get('email')).trim(),
          password: String(fields.get('password')),
          gender: String(fields.get('gender'))
        });
        signupForm.reset();
        status.textContent = '회원가입이 완료되었습니다. 로그인해 주세요.';
        window.setTimeout(() => { window.location.href = `login.html?registered=1&next=${encodeURIComponent(returnDestination())}`; }, 900);
      } catch (error) {
        status.textContent = error.message || '요청을 처리하지 못했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.';
      } finally {
        submit.disabled = false;
      }
    });
  }

  if (loginForm && status) {
    const logoutButton = document.getElementById('logout-button');
    const accountLink = document.getElementById('account-link');
    if (new URLSearchParams(location.search).has('registered')) status.textContent = '회원가입이 완료되었습니다. 로그인해 주세요.';
    fetch('/api/auth/me', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.user) return;
        status.textContent = `${data.user.nickname}님 로그인 상태입니다.`;
        if (accountLink) accountLink.hidden = false;
        if (logoutButton) logoutButton.hidden = false;
      })
      .catch(() => {});
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!loginForm.reportValidity()) return;
      const submit = loginForm.querySelector('[type="submit"]');
      const fields = new FormData(loginForm);
      submit.disabled = true;
      status.textContent = '로그인 중입니다.';
      try {
        const { user } = await send('/api/auth/login', 'POST', {
          email: String(fields.get('email')).trim(),
          password: String(fields.get('password'))
        });
        try {
          if (loginForm.querySelector('[name="rememberEmail"]').checked) {
            window.localStorage.setItem(rememberedEmailKey, user.email);
          } else {
            window.localStorage.removeItem(rememberedEmailKey);
          }
        } catch (error) {
          // Storage restrictions must not prevent successful authentication.
        }
        status.textContent = `${user.nickname}님, 로그인되었습니다.`;
        if (accountLink) accountLink.hidden = false;
        if (logoutButton) logoutButton.hidden = false;
        window.setTimeout(() => { window.location.href = returnDestination(); }, 600);
      } catch (error) {
        status.textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    });
    logoutButton?.addEventListener('click', async () => {
      try {
        await send('/api/auth/me', 'DELETE');
        status.textContent = '로그아웃되었습니다.';
        logoutButton.hidden = true;
        if (accountLink) accountLink.hidden = true;
      } catch (error) {
        status.textContent = error.message;
      }
    });
  }
})();