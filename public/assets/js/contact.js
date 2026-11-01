(function () {
  'use strict';

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const inquiryList = document.getElementById('inquiry-list');
  const emptyState = document.getElementById('history-empty');
  const clearButton = document.getElementById('clear-inquiries');
  const inquiryHistory = document.getElementById('inquiry-history');
  if (!form || !status || !inquiryList || !emptyState || !clearButton || !inquiryHistory) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function renderInquiries(inquiries) {
    emptyState.hidden = inquiries.length > 0;
    clearButton.hidden = inquiries.length === 0;
    inquiryList.innerHTML = inquiries.map((item) => `
      <article class="inquiry-card">
        <div class="inquiry-card-heading"><span class="inquiry-topic">${escapeHtml(item.topic)}</span><time>작성 ${escapeHtml(new Date(item.created_at).toLocaleString('ko-KR'))}</time></div>
        <h3>${escapeHtml(item.subject || `${item.topic} 문의`)}</h3>
        <p class="inquiry-card-meta">${escapeHtml(item.name)} · ${escapeHtml(item.email)}</p>
        <p class="inquiry-card-message">${escapeHtml(item.message).replace(/\r?\n/g, '<br>')}</p>
        <div class="inquiry-card-actions">
          <span class="inquiry-status">${item.updated_at ? `수정 ${escapeHtml(new Date(item.updated_at).toLocaleString('ko-KR'))}` : '수정 이력 없음'}</span>
          <button class="inquiry-delete" type="button" data-delete-inquiry="${escapeHtml(item.id)}">삭제</button>
        </div>
      </article>`).join('');
  }

  async function loadInquiries() {
    emptyState.textContent = '문의 내역을 불러오는 중입니다.';
    emptyState.hidden = false;
    try {
      const response = await fetch('/api/inquiries', { headers: { accept: 'application/json' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '문의 내역을 불러오지 못했습니다.');
      renderInquiries(data.inquiries);
      return true;
    } catch (error) {
      emptyState.textContent = error.message || '문의 내역을 불러오지 못했습니다.';
      inquiryList.replaceChildren();
      clearButton.hidden = true;
      return false;
    }
  }

  async function tryAdminHistory() {
    try {
      const response = await fetch('/api/inquiries?limit=50', {
        headers: { accept: 'application/json' },
        credentials: 'same-origin'
      });
      if (response.status === 401 || response.status === 403 || !response.ok) return;
      const data = await response.json();
      inquiryHistory.hidden = false;
      renderInquiries(data.inquiries);
    } catch (error) {
      // Public visitors do not need access to the administrator-only inquiry list.
    }
  }

  tryAdminHistory();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const fields = new FormData(form);
    const inquiry = {
      name: String(fields.get('name')).trim(),
      email: String(fields.get('email')).trim(),
      topic: String(fields.get('topic')),
      subject: String(fields.get('subject')).trim(),
      message: String(fields.get('message')).trim()
    };

    submitButton.disabled = true;
    status.textContent = '로그인 상태를 확인하고 있습니다.';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      let session;
      try {
        session = await fetch('/api/auth/me', { credentials: 'same-origin', signal: controller.signal });
      } finally { clearTimeout(timer); }
      if (session.status === 401) {
        status.textContent = '로그인 후 문의를 작성해 주세요.';
        window.location.href = 'login.html?next=%2Fcontact.html';
        return;
      }
      if (!session.ok || !(await session.json()).user) throw new Error('로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      status.textContent = '문의 내역을 저장하고 있습니다.';
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(inquiry)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '문의 내역을 저장하지 못했습니다.');

      form.reset();
      status.textContent = '문의 내역을 데이터베이스에 저장했습니다.';
      try {
        const response = await fetch('/api/inquiries?limit=50', { headers: { accept: 'application/json' }, credentials: 'same-origin' });
        if (response.ok) {
          const data = await response.json();
          inquiryHistory.hidden = false;
          renderInquiries(data.inquiries);
          document.getElementById('inquiry-history-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (error) {
        // Submitted inquiries remain stored; administrator history is private.
      }
    } catch (error) {
      status.textContent = error.message || '문의 내역을 저장하지 못했습니다. 다시 시도해 주세요.';
    } finally {
      submitButton.disabled = false;
    }
  });

  inquiryList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-inquiry]');
    if (!button) return;

    button.disabled = true;
    try {
      const response = await fetch(`/api/inquiries?id=${encodeURIComponent(button.dataset.deleteInquiry)}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '문의 내역을 삭제하지 못했습니다.');
      status.textContent = '문의 내역을 삭제했습니다.';
      await tryAdminHistory();
    } catch (error) {
      status.textContent = error.message || '문의 내역을 삭제하지 못했습니다.';
      button.disabled = false;
    }
  });

  clearButton.addEventListener('click', async () => {
    const buttons = [...inquiryList.querySelectorAll('[data-delete-inquiry]')];
    clearButton.disabled = true;
    for (const button of buttons) {
      try {
        const response = await fetch(`/api/inquiries?id=${encodeURIComponent(button.dataset.deleteInquiry)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('일부 내역을 삭제하지 못했습니다.');
      } catch (error) {
        status.textContent = error.message;
        clearButton.disabled = false;
        await tryAdminHistory();
        return;
      }
    }
    status.textContent = '문의 내역을 모두 삭제했습니다.';
    clearButton.disabled = false;
    await tryAdminHistory();
  });
  form.querySelector('button[type="submit"]').disabled = false;
})();