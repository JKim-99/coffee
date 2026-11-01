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

  const storageKey = 'composecoffee.inquiries.v1';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function readInquiries() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter((item) => item && typeof item === 'object') : [];
    } catch (error) {
      return [];
    }
  }

  function renderInquiries() {
    const inquiries = readInquiries();
    emptyState.hidden = inquiries.length > 0;
    clearButton.hidden = inquiries.length === 0;
    inquiryList.innerHTML = inquiries.map((item) => `
      <article class="inquiry-card">
        <div class="inquiry-card-heading"><span class="inquiry-topic">${escapeHtml(item.topic)}</span><time>${escapeHtml(item.createdAt)}</time></div>
        <h3>${escapeHtml(item.subject)}</h3>
        <p class="inquiry-card-meta">${escapeHtml(item.name)} · ${escapeHtml(item.email)}</p>
        <p class="inquiry-card-message">${escapeHtml(item.message).replace(/\r?\n/g, '<br>')}</p>
        <div class="inquiry-card-actions">
          <span class="inquiry-status">저장됨 · 메일 미전송</span>
          <button class="inquiry-delete" type="button" data-delete-inquiry="${escapeHtml(item.id)}">삭제</button>
        </div>
      </article>`).join('');
  }

  renderInquiries();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const inquiry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: String(fields.get('name')).trim(),
      email: String(fields.get('email')).trim(),
      topic: String(fields.get('topic')),
      subject: `[컴포즈커피 문의] ${fields.get('topic')}`,
      message: String(fields.get('message')).trim(),
      createdAt: new Date().toLocaleString('ko-KR')
    };

    try {
      const inquiries = readInquiries();
      inquiries.unshift(inquiry);
      window.localStorage.setItem(storageKey, JSON.stringify(inquiries));
      renderInquiries();
      status.textContent = '문의 내역을 이 브라우저에 저장했습니다. 아래 문의 내역에서 확인할 수 있습니다.';
      form.reset();
      document.getElementById('inquiry-history-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      status.textContent = '브라우저 저장 공간을 사용할 수 없어 문의 내역을 저장하지 못했습니다.';
    }
  });

  inquiryList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-inquiry]');
    if (!button) return;
    const inquiries = readInquiries().filter((item) => item.id !== button.dataset.deleteInquiry);
    window.localStorage.setItem(storageKey, JSON.stringify(inquiries));
    renderInquiries();
  });

  clearButton.addEventListener('click', () => {
    window.localStorage.removeItem(storageKey);
    renderInquiries();
    status.textContent = '저장된 문의 내역을 모두 삭제했습니다.';
  });
})();