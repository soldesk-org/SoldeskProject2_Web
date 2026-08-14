/* notice-detail — 공지 상세, 변경 전/후 비교(신규, 2026-08-14). GET /api/notices/{id}. */
(function () {
  var titleEl = document.getElementById("noticeTitle");
  var effectiveDateEl = document.getElementById("noticeEffectiveDate");
  var postedAtEl = document.getElementById("noticePostedAt");
  var prevBody = document.getElementById("noticePrevBody");
  var prevMeta = document.getElementById("noticePrevMeta");
  var newBody = document.getElementById("noticeNewBody");
  var newMeta = document.getElementById("noticeNewMeta");

  function getNoticeId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function renderVersionBlock(bodyEl, metaEl, version, emptyMessage) {
    if (!version) {
      bodyEl.innerHTML = '<p class="t-sm">' + emptyMessage + "</p>";
      metaEl.textContent = "-";
      return;
    }
    bodyEl.innerHTML = version.content;
    metaEl.textContent = "v" + version.versionLabel + " · 시행일 " + version.effectiveDate;
  }

  var noticeId = getNoticeId();
  if (!noticeId) {
    window.location.replace("/");
    return;
  }

  Api.request("/api/notices/" + noticeId, { auth: false })
    .then(function (detail) {
      titleEl.textContent = detail.title;
      effectiveDateEl.textContent = detail.effectiveDate;
      postedAtEl.textContent = detail.postedAt ? detail.postedAt.slice(0, 10) : "-";
      renderVersionBlock(prevBody, prevMeta, detail.previousVersion, "이 공지는 최초 버전 게시라 비교할 이전 버전이 없습니다.");
      renderVersionBlock(newBody, newMeta, detail.newVersion, "-");
    })
    .catch(function () {
      // 존재하지 않는 noticeId로 들어오면(2026-08-14 수정) 이 페이지에 에러 문구만 띄워두는 대신
      // 바로 메인으로 돌려보낸다 — 링크가 없으면 못 들어오는 페이지라는 설계 의도에 맞춰, 없는 링크로
      // 억지로 들어와도 뭔가 볼 게 없게 한다.
      if (window.Eatty) Eatty.toast("존재하지 않는 공지입니다.", "error");
      window.location.replace("/");
    });
})();
