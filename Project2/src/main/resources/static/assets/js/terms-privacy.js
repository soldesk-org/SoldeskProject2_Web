/* 2026-08-14 전면 개편 — terms-service.js와 동일한 이유/구조(개별 파일로 중복 유지, CLAUDE.md 2장 관례). */
(function () {
  var DOC_TYPE = "PRIVACY";
  var bodyEl = document.getElementById("privacyBody");
  var tocEl = document.getElementById("privacyToc");
  var effectiveAtEl = document.getElementById("privacyEffectiveAt");
  var pickerEl = document.getElementById("versionPicker");
  var tocLabel = tocEl ? tocEl.querySelector("p") : null;

  function formatDateKo(dateStr) {
    if (!dateStr) return "-";
    var parts = String(dateStr).split("-");
    return parts[0] + "년 " + parseInt(parts[1], 10) + "월 " + parseInt(parts[2], 10) + "일";
  }

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
    window.removeEventListener("scroll", window.__privacyScrollSpy);
    window.__privacyScrollSpy = onScroll;
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // 2026-08-19 추가 — terms-service.js와 동일한 이유(시행 전 개정본을 select로 미리보면 이미 시행된
  // 것처럼 보이던 문제)로 같은 방식을 적용.
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
        "<p>" + formatDateKo(detail.effectiveDate) + "부터 적용될 예정이며, 그 전까지는 현재 시행 중인 방침이 유효합니다.</p></div></div>"
      : "") + detail.content;
    if (effectiveAtEl) effectiveAtEl.textContent = formatDateKo(detail.effectiveDate);
    buildToc();
  }

  // 버전 select 자체가 배지 역할까지 겸한다(2026-08-14) — terms-service.js와 동일 패턴.
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
        bodyEl.innerHTML = "<p>개인정보처리방침을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>";
        if (window.Eatty) Eatty.toast("개인정보처리방침을 불러오지 못했습니다.", "error");
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
