(function () {
  'use strict';

  const status = document.getElementById('inquiries-status');
  const empty = document.getElementById('inquiries-empty');
  const list = document.getElementById('my-inquiry-list');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  fetch('/api/my/inquiries', { credentials: 'same-origin', headers: { accept: 'application/json' } })
    .then(async (response) => {
      const data = await response.json();
      if (response.status === 401) {
        window.location.replace(`login.html?next=${encodeURIComponent('inquiries.html')}`);
        return null;
      }
      if (!response.ok) throw new Error(data.error || '문의 목록을 불러오지 못했습니다.');
      return data.inquiries;
    })
    .then((inquiries) => {
      if (!inquiries) return;
      status.hidden = true;
      empty.hidden = inquiries.length > 0;
      list.innerHTML = inquiries.map((item) => `
        <article class="my-inquiry-card">
          <span class="inquiry-status-badge${item.replied_at ? ' is-replied' : ''}">${item.replied_at ? '답변 완료' : '답변 대기중'}</span>
          <span class="inquiry-topic">${escapeHtml(item.topic)}</span>
          <a class="my-inquiry-title" href="inquiry-detail.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.subject || `${item.topic} 문의`)}</a>
          <time>${escapeHtml(new Date(item.created_at).toLocaleString('ko-KR'))}</time>
        </article>`).join('');
    })
    .catch((error) => {
      status.textContent = error.message || '문의 목록을 불러오지 못했습니다.';
    });
})();