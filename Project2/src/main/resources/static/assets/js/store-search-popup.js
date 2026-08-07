(function () {
  var input = document.getElementById("storeSearchInput");
  var btn = document.getElementById("storeSearchBtn");
  var resultsBox = document.getElementById("storeSearchResults");
  var emptyMsg = document.getElementById("storeSearchEmpty");
  if (!input || !btn) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderResults(items) {
    resultsBox.innerHTML = "";
    if (!items.length) {
      emptyMsg.textContent = "검색 결과가 없습니다. 다른 이름으로 검색해보세요.";
      emptyMsg.hidden = false;
      return;
    }
    emptyMsg.hidden = true;
    items.forEach(function (item) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "e-file-item text-left w-full";
      el.innerHTML =
        '<div class="min-w-0 flex-1">' +
          '<p class="text-sm font-bold text-[var(--ink-900)] truncate">' + escapeHtml(item.name) + "</p>" +
          '<p class="t-xs mt-0.5 truncate">' + escapeHtml(item.roadAddress || item.address || "") + "</p>" +
        "</div>";
      el.addEventListener("click", function () {
        // opener가 미리 정의해둔 콜백으로 선택 결과를 넘긴다(Juso 주소 팝업의 jusoCallBack과 동일한
        // "팝업이 opener 함수를 직접 호출하는" 패턴) — opener가 닫혔거나 콜백을 안 정의했으면 그냥 닫는다.
        if (window.opener && !window.opener.closed && typeof window.opener.eattyStoreSearchCallback === "function") {
          window.opener.eattyStoreSearchCallback(item);
        }
        window.close();
      });
      resultsBox.appendChild(el);
    });
  }

  function runSearch() {
    var keyword = input.value.trim();
    if (!keyword) return;
    btn.disabled = true;
    resultsBox.innerHTML = "";
    emptyMsg.hidden = true;
    Api.request("/api/restaurants/search?keyword=" + encodeURIComponent(keyword) + "&type=shop&size=20",
      { method: "GET", auth: false })
      .then(function (data) { renderResults(data.restaurants || []); })
      .catch(function () {
        emptyMsg.textContent = "매장 검색에 실패했습니다. 잠시 후 다시 시도해주세요.";
        emptyMsg.hidden = false;
      })
      .finally(function () { btn.disabled = false; });
  }

  btn.addEventListener("click", runSearch);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); runSearch(); }
  });
})();
