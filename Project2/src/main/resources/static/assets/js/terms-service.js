/* 목차 활성화 */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('#termsToc .toc-link'));
  var sections = links.map(function (l) { return document.querySelector(l.getAttribute('href')); });

  function onScroll() {
    var y = window.scrollY + 140;
    var idx = 0;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= y) idx = i; });
    // 2026-08-06 추가 - terms-privacy.html과 동일한 이유("문서 끝까지 스크롤해도 마지막 장이 활성화
    // 안 됨")로 스크롤이 문서 끝에 닿으면 목차 마지막 항목을 강제로 활성화한다.
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
    if (atBottom) idx = sections.length - 1;
    links.forEach(function (l, i) { l.classList.toggle('is-active', i === idx); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
