(function () {
  'use strict';

  const status = document.getElementById('inquiry-detail-status');
  const card = document.getElementById('inquiry-detail-card');
  const id = new URLSearchParams(window.location.search).get('id');
  const labels = { female: '여성', male: '남성', undisclosed: '응답 안 함' };

  if (!id) {
    status.textContent = '문의 정보가 지정되지 않았습니다.';
    return;
  }

  fetch(`/api/my/inquiries?id=${encodeURIComponent(id)}`, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' }
  }).then(async (response) => {
    const data = await response.json();
    if (response.status === 401) {
      window.location.replace(`login.html?next=${encodeURIComponent(`inquiry-detail.html?id=${id}`)}`);
      return null;
    }
    if (response.status === 404) throw new Error('문의 내역을 찾을 수 없습니다. 본인이 작성한 문의인지 확인해 주세요.');
    if (!response.ok) throw new Error(data.error || '문의 상세를 불러오지 못했습니다.');
    return data.inquiry;
  }).then((item) => {
    if (!item) return;
    document.title = `${item.subject} | 문의 상세`;
    document.getElementById('inquiry-detail-title').textContent = item.subject;
    document.getElementById('detail-topic').textContent = item.topic;
    document.getElementById('detail-subject').textContent = item.subject;
    document.getElementById('detail-message').textContent = item.message;
    const replyStatus = document.getElementById('detail-reply-status');
    const replyContent = document.getElementById('detail-reply-content');
    replyStatus.textContent = item.reply ? '답변 완료' : '답변 대기중';
    replyStatus.classList.toggle('is-replied', Boolean(item.reply));
    if (item.reply) {
      replyContent.textContent = item.reply;
      replyContent.hidden = false;
    } else {
      replyContent.hidden = true;
    }
    document.getElementById('detail-created').textContent = `작성 ${new Date(item.created_at).toLocaleString('ko-KR')}`;
    document.getElementById('detail-updated').textContent = item.updated_at && item.updated_at !== item.created_at
      ? `수정 ${new Date(item.updated_at).toLocaleString('ko-KR')}`
      : '';
    status.hidden = true;
    card.hidden = false;
  }).catch((error) => {
    status.textContent = error.message || '문의 상세를 불러오지 못했습니다.';
  });
})();