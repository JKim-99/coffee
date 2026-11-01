(function () {
  'use strict';

  const status = document.getElementById('account-status');
  const details = document.getElementById('account-details');
  const actions = document.getElementById('account-actions');
  const loginLink = document.getElementById('account-login-link');
  const logoutButton = document.getElementById('account-logout');
  const labels = { female: '여성', male: '남성', undisclosed: '응답 안 함' };

  async function request(url, method = 'GET') {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { accept: 'application/json' }
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || '요청을 처리하지 못했습니다.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  request('/api/auth/me').then(({ user }) => {
    document.getElementById('account-nickname').textContent = user.nickname;
    document.getElementById('account-email').textContent = user.email;
    document.getElementById('account-gender').textContent = labels[user.gender] || '정보 없음';
    document.getElementById('account-created').textContent = new Date(user.created_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    status.hidden = true;
    details.hidden = false;
    actions.hidden = false;
  }).catch((error) => {
    status.textContent = error.status === 401
      ? '회원 정보를 보려면 먼저 로그인해 주세요.'
      : '회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    if (error.status === 401) loginLink.hidden = false;
  });

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await request('/api/auth/me', 'DELETE');
      window.location.replace('login.html');
    } catch (error) {
      status.hidden = false;
      status.textContent = '로그아웃하지 못했습니다. 다시 시도해 주세요.';
      logoutButton.disabled = false;
    }
  });
})();