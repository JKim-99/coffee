(function () {
  'use strict';

  const status = document.getElementById('auth-status');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');

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
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!signupForm.reportValidity()) return;
      const submit = signupForm.querySelector('[type="submit"]');
      const fields = new FormData(signupForm);
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
        window.setTimeout(() => { window.location.href = 'login.html?registered=1'; }, 900);
      } catch (error) {
        status.textContent = error.message || '요청을 처리하지 못했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.';
      } finally {
        submit.disabled = false;
      }
    });
  }

  if (loginForm && status) {
    const logoutButton = document.getElementById('logout-button');
    if (new URLSearchParams(location.search).has('registered')) status.textContent = '회원가입이 완료되었습니다. 로그인해 주세요.';
    fetch('/api/auth/me', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.user) return;
        status.textContent = `${data.user.nickname}님 로그인 상태입니다.`;
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
        status.textContent = `${user.nickname}님, 로그인되었습니다.`;
        if (logoutButton) logoutButton.hidden = false;
        window.setTimeout(() => { window.location.href = 'index.html'; }, 600);
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
      } catch (error) {
        status.textContent = error.message;
      }
    });
  }
})();