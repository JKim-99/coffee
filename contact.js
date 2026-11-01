(function () {
  'use strict';

  document.querySelectorAll('.nav-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.setAttribute('aria-label', expanded ? '메뉴 열기' : '메뉴 닫기');
      document.getElementById(button.getAttribute('aria-controls'))?.classList.toggle('is-open', !expanded);
    });
  });

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const inquiryList = document.getElementById('inquiry-list');
  const emptyState = document.getElementById('history-empty');
  const clearButton = document.getElementById('clear-inquiries');
  if (!form || !status || !inquiryList || !emptyState || !clearButton) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function renderInquiries(inquiries) {
    emptyState.hidden = inquiries.length > 0;
    clearButton.hidden = inquiries.length === 0;
    inquiryList.innerHTML = inquiries.map((item) => `
      <article class="inquiry-card">
        <div class="inquiry-card-heading"><span class="inquiry-topic">${escapeHtml(item.topic)}</span><time>작성 ${escapeHtml(new Date(item.created_at).toLocaleString('ko-KR'))}</time></div>
        <h3>${escapeHtml(item.topic)} 문의</h3>
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

  loadInquiries();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const fields = new FormData(form);
    const inquiry = {
      name: String(fields.get('name')).trim(),
      email: String(fields.get('email')).trim(),
      topic: String(fields.get('topic')),
      message: String(fields.get('message')).trim()
    };

    submitButton.disabled = true;
    status.textContent = '문의 내역을 저장하고 있습니다.';
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(inquiry)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '문의 내역을 저장하지 못했습니다.');

      form.reset();
      status.textContent = '문의 내역을 데이터베이스에 저장했습니다.';
      await loadInquiries();
      document.getElementById('inquiry-history-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      await loadInquiries();
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
        await loadInquiries();
        return;
      }
    }
    status.textContent = '문의 내역을 모두 삭제했습니다.';
    clearButton.disabled = false;
    await loadInquiries();
  });
})();