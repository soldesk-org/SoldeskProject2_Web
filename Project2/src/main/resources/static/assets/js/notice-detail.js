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
    titleEl.textContent = "잘못된 접근입니다.";
    prevBody.innerHTML = "";
    newBody.innerHTML = "";
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
      titleEl.textContent = "공지를 찾을 수 없습니다.";
      prevBody.innerHTML = "";
      newBody.innerHTML = "";
      if (window.Eatty) Eatty.toast("공지를 불러오지 못했습니다.", "error");
    });
})();
