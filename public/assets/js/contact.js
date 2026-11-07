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

  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const loginActions = document.getElementById('contact-login-actions');
  const loginLink = document.getElementById('contact-login-link');
  const draftKey = 'composecoffee.contact-draft.v1';
  const draftFields = ['topic', 'subject', 'message'];
  const field = (name) => form.querySelector(`[name="${name}"]`);
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(draftKey) || 'null');
    if (draft) draftFields.forEach((name) => {
      if (typeof draft[name] === 'string') field(name).value = draft[name].slice(0, name === 'message' ? 3000 : 120);
    });
  } catch { /* Drafts are optional; unavailable storage does not block writing. */ }
  loginLink?.addEventListener('click', () => {
    try {
      const draft = Object.fromEntries(draftFields.map((name) => [name, field(name).value]));
      window.sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch { /* Keep the explicit login link usable without browser storage. */ }
  });
  document.getElementById('contact-stay')?.addEventListener('click', () => {
    if (loginActions) loginActions.hidden = true;
    status.textContent = '현재 화면에 머무릅니다. 문의 등록은 로그인 후 이용해 주세요.';
  });

  function showLogin() {
    if (loginActions) loginActions.hidden = false;
    status.textContent = '문의 안내는 자유롭게 확인할 수 있습니다. 등록하려면 로그인해 주세요. 작성 중인 내용은 로그인 링크를 누르면 임시 보관합니다.';
  }
  function applyMember(user) {
    if (nameInput) { nameInput.value = user.nickname; nameInput.readOnly = true; }
    if (emailInput) { emailInput.value = user.email; emailInput.readOnly = true; }
    if (loginActions) loginActions.hidden = true;
  }
  async function loadMember() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin', signal: controller.signal });
      if (response.status === 401) { showLogin(); return null; }
      if (!response.ok) throw new Error('member unavailable');
      const { user } = await response.json();
      if (!user?.id || !user.email) throw new Error('invalid member');
      applyMember(user);
      try { window.sessionStorage.removeItem(draftKey); } catch {}
      return user;
    } catch {
      status.textContent = '회원 정보를 확인하지 못했습니다. 연결을 확인하고 문의 등록을 다시 시도해 주세요.';
      return undefined;
    } finally { clearTimeout(timer); }
  }
  const memberReady = loadMember();

  tryAdminHistory();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    status.textContent = '로그인 상태를 확인하고 있습니다.';
    try {
      await memberReady;
      const user = await loadMember();
      if (!user) return;
      if (!form.reportValidity()) return;
      const fields = new FormData(form);
      const inquiry = {
        topic: String(fields.get('topic')),
        subject: String(fields.get('subject')).trim(),
        message: String(fields.get('message')).trim()
      };
      status.textContent = '문의 내역을 저장하고 있습니다.';
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(inquiry)
      });
      const data = await response.json();
      if (response.status === 401) { showLogin(); return; }
      if (!response.ok) throw new Error(data.error || '문의 내역을 저장하지 못했습니다.');

      form.reset();
      applyMember(user);
      try { window.sessionStorage.removeItem(draftKey); } catch {}
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