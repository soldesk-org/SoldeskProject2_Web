/* 2026-08-14 전면 개편 — 정적 본문을 지우고 GET /api/terms/SERVICE(+과거버전/목차)로 동적 렌더링하도록
   바꿨다. 페이지 뼈대(#termsToc/#termsBody/#termsVersion/#termsEffectiveAt id)는 그대로 유지해서
   assets/css/terms-service.css의 스타일이 안 깨지게 했다. */
(function () {
  var DOC_TYPE = "SERVICE";
  var bodyEl = document.getElementById("termsBody");
  var tocEl = document.getElementById("termsToc");
  var versionBadge = document.getElementById("termsVersion");
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

  function renderDoc(detail) {
    bodyEl.innerHTML = detail.content;
    if (versionBadge) versionBadge.textContent = "v" + detail.versionLabel;
    if (effectiveAtEl) effectiveAtEl.textContent = formatDateKo(detail.effectiveDate);
    buildToc();
  }

  function loadVersions(selectedId) {
    if (!pickerEl) return;
    Api.request("/api/terms/" + DOC_TYPE + "/versions", { auth: false })
      .then(function (list) {
        pickerEl.innerHTML = "";
        list.forEach(function (v) {
          var opt = document.createElement("option");
          opt.value = v.termsDocumentId;
          opt.textContent = "v" + v.versionLabel + " (시행일 " + v.effectiveDate + ")" + (v.current ? " · 현재" : "");
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
