(function () {
  'use strict';

  const loginPanel = document.getElementById('admin-login-panel');
  const inquiryPanel = document.getElementById('admin-inquiries-panel');
  const headerNav = document.querySelector('.admin-header-nav');
  const loginForm = document.getElementById('admin-login-form');
  const loginStatus = document.getElementById('admin-login-status');
  const listStatus = document.getElementById('admin-list-status');
  const replyStatus = document.getElementById('admin-reply-status');
  const inquiryList = document.getElementById('admin-inquiry-list');
  const replyPanel = document.getElementById('admin-reply-panel');
  const replyForm = document.getElementById('reply-form');
  let selectedInquiry = null;
  let inquiries = [];

  async function api(url, method = 'GET', body) {
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json', accept: 'application/json' } : { accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || '요청을 처리하지 못했습니다.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  function showAdmin() {
    loginPanel.hidden = true;
    inquiryPanel.hidden = false;
    headerNav.hidden = false;
    loadInquiries();
  }

  function showLogin(message = '') {
    loginPanel.hidden = false;
    inquiryPanel.hidden = true;
    headerNav.hidden = true;
    loginStatus.textContent = message;
  }

  async function loadInquiries() {
    listStatus.textContent = '문의 목록을 불러오는 중입니다.';
    try {
      const data = await api('/api/admin/inquiries');
      inquiries = data.inquiries;
      listStatus.textContent = inquiries.length ? `${inquiries.length}건의 문의` : '등록된 문의가 없습니다.';
      if (inquiries.some((item) => item.email_status === 'not_configured')) {
        listStatus.textContent += ' · 이메일 발신 설정이 없어 답변 알림은 전송되지 않습니다.';
      }
      inquiryList.innerHTML = inquiries.map((item) => `
        <button class="admin-inquiry-item${selectedInquiry?.id === item.id ? ' is-selected' : ''}" type="button" data-inquiry-id="${escapeHtml(item.id)}">
          <span class="admin-inquiry-item-title">${escapeHtml(item.subject)}</span>
          <span class="admin-inquiry-item-meta">${escapeHtml(item.topic)} · ${escapeHtml(item.email)}</span>
          <span class="admin-inquiry-item-meta">${item.replied_at ? '답변 완료' : '답변 대기'} · ${escapeHtml(new Date(item.created_at).toLocaleString('ko-KR'))}</span>
        </button>`).join('');
      if (selectedInquiry) {
        const selected = inquiries.find((item) => item.id === selectedInquiry.id);
        if (selected) selectInquiry(selected.id);
      }
    } catch (error) {
      if (error.status === 401) showLogin('관리자 로그인이 필요합니다.');
      else listStatus.textContent = error.message;
    }
  }

  function selectInquiry(id) {
    selectedInquiry = inquiries.find((item) => item.id === id);
    if (!selectedInquiry) return;
    inquiryList.querySelectorAll('.admin-inquiry-item').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.inquiryId === id);
    });
    document.getElementById('selected-subject').textContent = selectedInquiry.subject;
    document.getElementById('selected-contact').textContent = `${selectedInquiry.name} · ${selectedInquiry.email}`;
    document.getElementById('selected-message').textContent = selectedInquiry.message;
    document.getElementById('reply-text').value = selectedInquiry.reply || '';
    replyStatus.textContent = selectedInquiry.email_status === 'sent'
      ? '이전 답변 알림 이메일 발송 완료'
      : selectedInquiry.email_status === 'not_configured'
        ? '이메일 발신 도메인 설정이 필요합니다. 답변은 저장 가능하지만 메일은 전송되지 않습니다.'
        : '';
    replyPanel.hidden = false;
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('[type="submit"]');
    const fields = new FormData(loginForm);
    submit.disabled = true;
    loginStatus.textContent = '로그인 중입니다.';
    try {
      await api('/api/admin/login', 'POST', { username: fields.get('username'), password: fields.get('password') });
      loginForm.reset();
      showAdmin();
    } catch (error) {
      loginStatus.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  inquiryList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-inquiry-id]');
    if (button) selectInquiry(button.dataset.inquiryId);
  });

  document.getElementById('refresh-inquiries').addEventListener('click', loadInquiries);
  document.getElementById('admin-logout').addEventListener('click', async () => {
    try { await api('/api/admin/logout', 'POST', {}); } catch (error) {}
    showLogin('관리자 로그아웃이 완료되었습니다.');
  });

  replyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedInquiry || !replyForm.reportValidity()) return;
    const submit = replyForm.querySelector('[type="submit"]');
    submit.disabled = true;
    replyStatus.textContent = '답변을 저장하고 알림 이메일을 처리하는 중입니다.';
    try {
      const result = await api(`/api/admin/inquiries?id=${encodeURIComponent(selectedInquiry.id)}`, 'POST', {
        reply: document.getElementById('reply-text').value.trim()
      });
      selectedInquiry.reply = document.getElementById('reply-text').value.trim();
      selectedInquiry.replied_at = result.replied_at;
      selectedInquiry.email_status = result.email_status;
      replyStatus.textContent = '답변 작성이 완료되었습니다.';
      if (result.email_status !== 'sent') {
        replyStatus.textContent += ' (이메일 발송 설정/오류로 알림 메일은 전송되지 않았습니다.)';
      }
      await loadInquiries();
      selectedInquiry = null;
      replyPanel.hidden = true;
      replyForm.reset();
      window.alert(result.email_status === 'sent'
        ? '답변 작성이 완료되었고 알림 이메일을 발송했습니다. 다른 문의를 확인할 수 있습니다.'
        : '답변 작성이 완료되었습니다. 이메일 발송이 설정되지 않아 알림 메일은 보내지 못했습니다. 다른 문의를 확인할 수 있습니다.');
    } catch (error) {
      if (error.status === 401) showLogin('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.');
      else replyStatus.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  api('/api/admin/inquiries').then(showAdmin).catch(() => showLogin());
})();