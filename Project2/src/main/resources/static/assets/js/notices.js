/* notices — 공지사항 목록(신규, 2026-08-14). GET /api/notices, 항목 클릭 시 notice-detail?id=로 이동. */
(function () {
  var listBody = document.getElementById("noticeListBody");

  var NOTICE_TYPE_LABELS = { MINOR: "작은 변경", MAJOR: "큰 변경" };
  var DOC_TYPE_LABELS = { SERVICE: "이용약관", PRIVACY: "개인정보처리방침" };

  function renderList(notices) {
    if (!notices.length) {
      listBody.innerHTML = '<p class="t-sm">등록된 공지가 없습니다.</p>';
      return;
    }
    listBody.innerHTML = "";
    var table = document.createElement("table");
    table.className = "e-table";
    table.innerHTML =
      "<thead><tr><th>구분</th><th>제목</th><th>변경 유형</th><th>시행일</th><th>게시일</th></tr></thead>";
    var tbody = document.createElement("tbody");
    notices.forEach(function (n) {
      var tr = document.createElement("tr");
      tr.className = "cursor-pointer hover:bg-[var(--ink-50)]";
      tr.innerHTML =
        "<td>" + (DOC_TYPE_LABELS[n.docType] || n.docType) + "</td>" +
        "<td>" + escapeHtml(n.title) + "</td>" +
        "<td>" + (NOTICE_TYPE_LABELS[n.noticeType] || n.noticeType || "-") + "</td>" +
        "<td>" + n.effectiveDate + "</td>" +
        "<td>" + (n.postedAt ? n.postedAt.slice(0, 10) : "-") + "</td>";
      tr.addEventListener("click", function () {
        window.location.href = "notice-detail?id=" + n.noticeId;
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    listBody.appendChild(table);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text == null ? "" : text;
    return div.innerHTML;
  }

  Api.request("/api/notices", { auth: false })
    .then(renderList)
    .catch(function () {
      listBody.innerHTML = '<p class="t-sm">공지 목록을 불러오지 못했습니다.</p>';
      if (window.Eatty) Eatty.toast("공지 목록을 불러오지 못했습니다.", "error");
    });
})();
