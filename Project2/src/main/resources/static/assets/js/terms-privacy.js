(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('#privacyToc .toc-link'));
  var sections = links.map(function (l) { return document.querySelector(l.getAttribute('href')); });

  function onScroll() {
    var y = window.scrollY + 140;
    var idx = 0;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= y) idx = i; });
    // 2026-08-06 추가 - 문서 맨 아래까지 스크롤해도 마지막 조가 아니라 그 이전 조가 활성 표시되던
    // 문제. 마지막 조 다음에 오는 여백(본문 마지막 문단 + 카드 padding + 푸터)이 140px보다 커서,
    // 페이지 최대 스크롤 위치(scrollY의 상한)에 140을 더해도 마지막 h2의 offsetTop을 못 넘는 경우가
    // 있었다 - 스크롤이 문서 끝에 닿으면 목차 마지막 항목을 강제로 활성화한다.
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
    if (atBottom) idx = sections.length - 1;
    links.forEach(function (l, i) { l.classList.toggle('is-active', i === idx); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
