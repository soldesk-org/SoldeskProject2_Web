/* 2026-08-14 전면 개편 — 정적 본문을 지우고 GET /api/terms/SERVICE(+과거버전/목차)로 동적 렌더링하도록
   바꿨다. 페이지 뼈대(#termsToc/#termsBody/#termsVersion/#termsEffectiveAt id)는 그대로 유지해서
   assets/css/terms-service.css의 스타일이 안 깨지게 했다. */
(function () {
  var DOC_TYPE = "SERVICE";
  var bodyEl = document.getElementById("termsBody");
  var tocEl = document.getElementById("termsToc");
  var effectiveAtEl = document.getElementById("termsEffectiveAt");
  var pickerEl = document.getElementById("versionPicker");
  var tocLabel = tocEl ? tocEl.querySelector("p") : null;

  function formatDateKo(dateStr) {
    if (!dateStr) return "-";
    var parts = String(dateStr).split("-");
    return parts[0] + "년 " + parseInt(parts[1], 10) + "월 " + parseInt(parts[2], 10) + "일";
  }

  // 본문 안의 h2[id] 제목들을 훑어서 좌측 목차를 자동 생성한다(어느 버전을 보든 그 버전의 실제 장 구성대로).
  function buildToc() {
    if (!tocEl) return;
    tocEl.innerHTML = "";
    if (tocLabel) tocEl.appendChild(tocLabel);
    var headings = Array.prototype.slice.call(bodyEl.querySelectorAll("h2[id]"));
    headings.forEach(function (h, i) {
      var a = document.createElement("a");
      a.className = "toc-link" + (i === 0 ? " is-active" : "");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      tocEl.appendChild(a);
    });
    initScrollSpy(headings);
  }

  function initScrollSpy(headings) {
    var links = Array.prototype.slice.call(tocEl.querySelectorAll(".toc-link"));
    function onScroll() {
      var y = window.scrollY + 140;
      var idx = 0;
      headings.forEach(function (h, i) { if (h.offsetTop <= y) idx = i; });
      var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
      if (atBottom && headings.length) idx = headings.length - 1;
      links.forEach(function (l, i) { l.classList.toggle("is-active", i === idx); });
    }
    window.removeEventListener("scroll", window.__termsScrollSpy);
    window.__termsScrollSpy = onScroll;
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // 2026-08-19 추가 — 아직 시행일이 안 지난 개정본(공지만 하고 시행 전인 버전)을 select에서 골라
  // 미리보면, 지금까지는 "현재" 버전과 구분 없이 그냥 본문만 똑같이 보여줘서 이미 시행된 것처럼
  // 보인다는 지적. 오늘 날짜(YYYY-MM-DD 문자열 비교, 시행일도 같은 포맷이라 안전)보다 시행일이
  // 미래인 버전은 select 옵션에 "(예정)"을 붙이고, 실제로 그 버전을 열람 중일 때는 본문 위에
  // "아직 시행되지 않았다"는 경고 배너를 보여준다.
  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function renderDoc(detail) {
    var isUpcoming = !!detail.effectiveDate && detail.effectiveDate > todayStr();
    bodyEl.innerHTML = (isUpcoming
      ? '<div class="e-alert e-alert--warning mb-6"><div><p class="e-alert-title">시행 전 개정본입니다</p>' +
        "<p>" + formatDateKo(detail.effectiveDate) + "부터 적용될 예정이며, 그 전까지는 현재 시행 중인 약관이 유효합니다.</p></div></div>"
      : "") + detail.content;
    if (effectiveAtEl) effectiveAtEl.textContent = formatDateKo(detail.effectiveDate);
    buildToc();
  }

  // 버전 select 자체가 배지 역할까지 겸한다(2026-08-14) — 닫혀있을 때는 선택된 option의 텍스트가 그대로
  // "v2026-08-01" 배지처럼 보이고, 클릭하면 지난 버전 목록이 드롭다운으로 펼쳐진다.
  function loadVersions(selectedId) {
    if (!pickerEl) return;
    Api.request("/api/terms/" + DOC_TYPE + "/versions", { auth: false })
      .then(function (list) {
        pickerEl.innerHTML = "";
        var today = todayStr();
        list.forEach(function (v) {
          var opt = document.createElement("option");
          opt.value = v.termsDocumentId;
          var suffix = v.current ? " (현재)" : (v.effectiveDate && v.effectiveDate > today ? " (예정)" : "");
          opt.textContent = "v" + v.versionLabel + suffix;
          if (selectedId && String(selectedId) === String(v.termsDocumentId)) opt.selected = true;
          pickerEl.appendChild(opt);
        });
      })
      .catch(function () {
        pickerEl.innerHTML = '<option value="">버전 목록을 불러오지 못했습니다.</option>';
      });
  }

  function loadCurrent() {
    Api.request("/api/terms/" + DOC_TYPE, { auth: false })
      .then(function (detail) {
        renderDoc(detail);
        loadVersions(detail.termsDocumentId);
      })
      .catch(function () {
        bodyEl.innerHTML = "<p>약관을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>";
        if (window.Eatty) Eatty.toast("약관을 불러오지 못했습니다.", "error");
      });
  }

  if (pickerEl) {
    pickerEl.addEventListener("change", function () {
      var id = pickerEl.value;
      if (!id) return;
      Api.request("/api/terms/" + DOC_TYPE + "/versions/" + id, { auth: false })
        .then(renderDoc)
        .catch(function () {
          if (window.Eatty) Eatty.toast("해당 버전을 불러오지 못했습니다.", "error");
        });
    });
  }

  loadCurrent();
})();
