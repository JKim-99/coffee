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
  if (!form || !status) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const subject = `[컴포즈커피 문의] ${fields.get('topic')}`;
    const body = [
      `이름: ${fields.get('name')}`,
      `이메일: ${fields.get('email')}`,
      `문의 유형: ${fields.get('topic')}`,
      '',
      String(fields.get('message'))
    ].join('\n');
    const mailto = `mailto:help@composecoffee.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    status.textContent = '기본 메일 앱을 열어 문의 내용을 준비합니다. 메일 앱이 열리지 않으면 고객상담 전화 1899-5003으로 문의해 주세요.';
    window.location.href = mailto;
  });
})();