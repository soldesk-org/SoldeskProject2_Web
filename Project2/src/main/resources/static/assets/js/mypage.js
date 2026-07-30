(function () {
  if (!Api.requireLogin()) return;

  var tabs = ["info", "favorites", "reviews"];
  var buttons = {};
  var panels = {};
  tabs.forEach(function (t) {
    buttons[t] = document.getElementById("tab-btn-" + t);
    panels[t] = document.getElementById("tab-panel-" + t);
  });

  function currentTab() {
    var params = new URLSearchParams(window.location.search);
    return tabs.indexOf(params.get("tab")) >= 0 ? params.get("tab") : "info";
  }

  function render() {
    var active = currentTab();
    tabs.forEach(function (t) {
      var isActive = t === active;
      buttons[t].className =
        "relative pb-4 text-[22px] font-semibold tracking-[-1.1px] transition-colors " +
        (isActive ? "text-[#fd6d4a]" : "text-[rgba(37,55,75,0.5)] hover:text-[#25374b]");
      buttons[t].querySelector(".tab-indicator").style.display = isActive ? "" : "none";
      panels[t].style.display = isActive ? "" : "none";
    });
  }

  function goTab(t) {
    var url = new URL(window.location.href);
    if (t === "info") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    window.history.pushState({}, "", url);
    render();
    if (window.refreshSidebarActive) window.refreshSidebarActive();
  }

  tabs.forEach(function (t) { buttons[t].addEventListener("click", function () { goTab(t); }); });

  var seeReviewsLink = document.getElementById("see-reviews-link");
  if (seeReviewsLink) seeReviewsLink.addEventListener("click", function () { goTab("reviews"); });

  window.addEventListener("popstate", render);
  render();

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function formatDate(s) {
    if (!s) return "";
    return String(s).slice(0, 10).replace(/-/g, ".");
  }

  document.getElementById("profile-avatar").innerHTML = Api.avatarPlaceholder;

  Api.request("/api/members/me", {})
    .then(function (me) {
      document.getElementById("profile-nickname").textContent = me.nickname;
      document.getElementById("profile-email").textContent = me.email;
      if (me.profileImageUrl) {
        document.getElementById("profile-avatar").innerHTML = '<img src="' + me.profileImageUrl + '" class="size-full object-cover" />';
      }
      if (me.foodBti) {
        document.getElementById("foodbti-code").textContent = me.foodBti;
        document.getElementById("foodbti-result").style.display = "";
      } else {
        document.getElementById("foodbti-empty").style.display = "";
      }
    })
    .catch(function () {});

  Api.request("/api/mypage/favorites", {})
    .then(function (favorites) {
      document.getElementById("favorites-count").textContent = favorites.length + "개";
      var grid = document.getElementById("favorites-grid");
      if (favorites.length === 0) { grid.innerHTML = '<p class="text-[16px] text-[rgba(37,55,75,0.5)]">즐겨찾기한 맛집이 없어요.</p>'; return; }
      grid.innerHTML = "";
      favorites.forEach(function (f) {
        var card = document.createElement("div");
        card.className = "rounded-[14px] border border-[rgba(37,55,75,0.1)] p-5 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.05)]";
        card.innerHTML =
          '<div class="flex gap-4">' +
          '<div class="size-[64px] shrink-0 overflow-hidden rounded-[10px]">' + Api.photoPlaceholder + "</div>" +
          '<div class="min-w-0 flex-1">' +
          '<h3 class="text-[22px] font-semibold tracking-[-1.1px] text-[#25374b]">' + escapeHtml(f.name) + "</h3>" +
          '<p class="mt-1 text-[16px] font-medium text-[rgba(37,55,75,0.6)]">' + escapeHtml(f.roadAddress || f.address || "") + "</p>" +
          "</div></div>";
        grid.appendChild(card);
      });
    })
    .catch(function () {});

  Api.request("/api/mypage/reviews", {})
    .then(function (reviews) {
      document.getElementById("reviews-count-label").textContent = "내가 남긴 리뷰 " + reviews.length + "개";

      var recentEl = document.getElementById("recent-reviews-list");
      var listEl = document.getElementById("reviews-list");
      if (reviews.length === 0) {
        recentEl.innerHTML = '<p class="text-[16px] text-[rgba(37,55,75,0.5)]">아직 작성한 리뷰가 없어요.</p>';
        listEl.innerHTML = '<p class="text-[16px] text-[rgba(37,55,75,0.5)]">아직 작성한 리뷰가 없어요.</p>';
        return;
      }

      function reviewRow(r) {
        return '<div class="flex items-center gap-5 rounded-[10px] border border-[rgba(37,55,75,0.1)] p-5 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.05)]">' +
          '<div class="size-[90px] shrink-0 overflow-hidden rounded-[10px]">' + Api.photoPlaceholder + "</div>" +
          '<div class="flex flex-1 items-baseline justify-between">' +
          '<span class="text-[24px] font-semibold tracking-[-1.2px] text-[#25374b]">' + escapeHtml(r.restaurantName) + "</span>" +
          '<span class="text-[18px] font-medium text-[rgba(37,55,75,0.45)]">' + formatDate(r.createdAt) + "</span>" +
          "</div></div>";
      }

      recentEl.innerHTML = reviews.slice(0, 4).map(reviewRow).join("");
      listEl.innerHTML = reviews.map(reviewRow).join("");
    })
    .catch(function () {});
})();
