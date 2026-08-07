(function () {
  if (!Api.requireLogin()) return;

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function formatDate(iso) {
    if (!iso) return "-";
    return String(iso).slice(0, 10);
  }

  // ---- 프로필 ----
  // 이메일/전화번호는 마이페이지 요약 카드에는 노출하지 않는다(2026-08-04 변경 — 필요하면 프로필 수정
  // 화면에서 확인). data.email/data.phone 자체는 이 API 응답에 계속 포함되지만 이 페이지에서는 안 쓴다.
  Api.request("/api/members/me").then(function (data) {
    document.getElementById("profileNickname").textContent = data.nickname || "";
    var avatar = document.getElementById("profileAvatar");
    if (data.profileImageUrl) {
      avatar.innerHTML = '<img src="' + data.profileImageUrl + '" class="size-full object-cover rounded-full" alt="프로필 사진">';
    } else if (data.nickname) {
      avatar.textContent = data.nickname.charAt(0);
    }

    var btiBadge = document.getElementById("profileBtiBadge");
    var btiEmptyBox = document.getElementById("profileBtiEmptyBox");
    if (data.foodBti) {
      btiBadge.lastChild.textContent = " " + data.foodBti;
      btiBadge.hidden = false;
      if (btiEmptyBox) btiEmptyBox.hidden = true;
    } else {
      btiBadge.hidden = true;
      if (btiEmptyBox) btiEmptyBox.hidden = false;
    }
  }).catch(function () {});

  // ---- 즐겨찾기 ----
  var favoriteList = document.getElementById("favoriteList");
  var favoriteEmpty = document.getElementById("favoriteEmpty");
  var statFavoriteCount = document.getElementById("statFavoriteCount");

  var tabFavoriteCount = document.getElementById("tabFavoriteCount");
  var favoritePagination = document.getElementById("favoritePagination");
  var favoritePagePrev = document.getElementById("favoritePagePrev");
  var favoritePageNext = document.getElementById("favoritePageNext");
  var favoritePageNumbers = document.getElementById("favoritePageNumbers");
  var FAVORITES_PAGE_SIZE = 10;
  var favoritesAll = [];
  var favoritesPage = 1;

  function favoriteItemHtml(it) {
    return (
      '<div class="e-shop-card !cursor-default">' +
        '<span class="e-shop-thumb e-img-ph"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg></span>' +
        '<div class="min-w-0 flex-1">' +
          '<div class="flex items-center gap-2"><span class="font-extrabold text-[15px] text-[var(--ink-900)] truncate">' + escapeHtml(it.name) + '</span></div>' +
          '<p class="t-xs mt-1.5 truncate">' + escapeHtml(it.roadAddress || it.address || "") + '</p>' +
          '<p class="t-xs mt-1">저장 <b class="t-num">' + formatDate(it.recordedAt) + '</b></p>' +
        '</div>' +
        '<div class="flex flex-col gap-1.5 flex-none">' +
          '<button type="button" class="btn btn-ghost btn-xs !text-[var(--danger)]" data-remove-favorite data-restaurant-id="' + escapeHtml(it.restaurantId) + '">해제</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderFavoritesPage() {
    favoriteList.innerHTML = "";
    var items = favoritesAll;
    if (!items.length) {
      favoriteEmpty.hidden = false;
      if (favoritePagination) favoritePagination.hidden = true;
      return;
    }
    favoriteEmpty.hidden = true;

    var totalPages = Math.max(1, Math.ceil(items.length / FAVORITES_PAGE_SIZE));
    if (favoritesPage > totalPages) favoritesPage = totalPages;
    var start = (favoritesPage - 1) * FAVORITES_PAGE_SIZE;
    items.slice(start, start + FAVORITES_PAGE_SIZE).forEach(function (it) {
      var li = document.createElement("li");
      li.className = "fav-item";
      li.setAttribute("data-shop-id", it.restaurantId);
      li.innerHTML = favoriteItemHtml(it);
      favoriteList.appendChild(li);
    });

    if (!favoritePagination) return;
    if (totalPages <= 1) {
      favoritePagination.hidden = true;
      return;
    }
    favoritePagination.hidden = false;
    favoritePageNumbers.innerHTML = "";
    for (var p = 1; p <= totalPages; p++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "e-page-btn";
      btn.textContent = String(p);
      if (p === favoritesPage) btn.setAttribute("aria-current", "page");
      (function (targetPage) {
        btn.addEventListener("click", function () { favoritesPage = targetPage; renderFavoritesPage(); });
      })(p);
      favoritePageNumbers.appendChild(btn);
    }
    favoritePagePrev.disabled = favoritesPage === 1;
    favoritePageNext.disabled = favoritesPage === totalPages;
  }

  if (favoritePagePrev) {
    favoritePagePrev.addEventListener("click", function () {
      if (favoritesPage > 1) { favoritesPage--; renderFavoritesPage(); }
    });
  }
  if (favoritePageNext) {
    favoritePageNext.addEventListener("click", function () {
      var totalPages = Math.max(1, Math.ceil(favoritesAll.length / FAVORITES_PAGE_SIZE));
      if (favoritesPage < totalPages) { favoritesPage++; renderFavoritesPage(); }
    });
  }

  function renderFavorites(items) {
    favoritesAll = items;
    favoritesPage = 1;
    if (statFavoriteCount) statFavoriteCount.textContent = items.length;
    if (tabFavoriteCount) tabFavoriteCount.textContent = items.length;
    renderFavoritesPage();
  }

  function loadFavorites() {
    return Api.request("/api/mypage/favorites").then(renderFavorites).catch(function () { renderFavorites([]); });
  }

  favoriteList.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove-favorite]");
    if (!btn) return;
    var restaurantId = btn.getAttribute("data-restaurant-id");
    btn.disabled = true;
    Api.request("/api/restaurants/" + encodeURIComponent(restaurantId) + "/favorite", { method: "DELETE" })
      .then(function () { Eatty.toast("즐겨찾기에서 해제했습니다.", "success"); return loadFavorites(); })
      .catch(function (err) { Eatty.toast(err.message || "해제에 실패했습니다.", "error"); btn.disabled = false; });
  });

  // ---- 방문기록(영수증 인증된 리뷰) ----
  var visitList = document.getElementById("visitList");
  var visitEmpty = document.getElementById("visitEmpty");
  var statVisitCount = document.getElementById("statVisitCount");

  var tabVisitCount = document.getElementById("tabVisitCount");

  function renderVisits(items) {
    visitList.innerHTML = "";
    if (statVisitCount) statVisitCount.textContent = items.length;
    if (tabVisitCount) tabVisitCount.textContent = items.length;
    if (!items.length) { visitEmpty.hidden = false; return; }
    visitEmpty.hidden = true;
    items.forEach(function (it) {
      var li = document.createElement("li");
      li.className = "visit-item";
      li.innerHTML =
        '<div class="e-shop-card !cursor-default">' +
          '<span class="e-shop-thumb e-img-ph"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg></span>' +
          '<div class="min-w-0 flex-1">' +
            '<p class="font-extrabold text-[15px] text-[var(--ink-900)] truncate">' + escapeHtml(it.name) + '</p>' +
            '<p class="t-xs mt-1.5 truncate">' + escapeHtml(it.roadAddress || it.address || "") + '</p>' +
            '<p class="t-xs mt-1">방문 <b class="t-num">' + formatDate(it.recordedAt) + '</b></p>' +
          '</div>' +
        '</div>';
      visitList.appendChild(li);
    });
  }

  function loadVisits() {
    return Api.request("/api/mypage/visits").then(renderVisits).catch(function () { renderVisits([]); });
  }

  // ---- 검색기록 ----
  var searchHistoryList = document.getElementById("searchHistoryList");
  var searchHistoryEmpty = document.getElementById("searchHistoryEmpty");

  var tabSearchCount = document.getElementById("tabSearchCount");

  // 검색기록은 최근 5개만 보여준다(2026-08-07) — 서버는 전체를 주지만 화면에서 잘라 쓴다.
  // "더 있음"을 따로 안내하지 않고 개수 배지도 보이는 만큼만 표시한다.
  var SEARCH_HISTORY_LIMIT = 5;

  function renderSearchHistories(items) {
    var shown = (items || []).slice(0, SEARCH_HISTORY_LIMIT);
    searchHistoryList.innerHTML = "";
    if (tabSearchCount) tabSearchCount.textContent = shown.length;
    if (!shown.length) { searchHistoryEmpty.hidden = false; return; }
    searchHistoryEmpty.hidden = true;
    shown.forEach(function (it) {
      var li = document.createElement("li");
      li.className = "sh-item flex items-center gap-3 py-3.5";
      li.setAttribute("data-history-id", it.searchHistoryId);
      li.innerHTML =
        '<svg style="width:16px;height:16px" class="text-[var(--ink-400)] flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
        '<span class="flex-1 text-sm font-semibold text-[var(--ink-800)] truncate">' + escapeHtml(it.keyword) + '</span>' +
        '<span class="t-xs flex-none">' + formatDate(it.createdAt) + '</span>' +
        '<button type="button" class="e-icon-btn !w-8 !h-8 flex-none" data-remove-history="' + it.searchHistoryId + '" aria-label="검색기록 삭제">' +
          '<svg style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>';
      searchHistoryList.appendChild(li);
    });
  }

  function loadSearchHistories() {
    return Api.request("/api/mypage/search-histories").then(renderSearchHistories).catch(function () { renderSearchHistories([]); });
  }

  searchHistoryList.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove-history]");
    if (!btn) return;
    var id = btn.getAttribute("data-remove-history");
    Api.request("/api/mypage/search-histories/" + id, { method: "DELETE" })
      .then(function () { return loadSearchHistories(); })
      .catch(function (err) { Eatty.toast(err.message || "삭제에 실패했습니다.", "error"); });
  });

  var clearAllBtn = document.getElementById("clearHistoryConfirmBtn");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", function () {
      Api.request("/api/mypage/search-histories", { method: "DELETE" })
        .then(function () {
          Eatty.closeModal("clearHistoryModal");
          Eatty.toast("검색기록을 모두 삭제했습니다.", "success");
          return loadSearchHistories();
        })
        .catch(function (err) { Eatty.toast(err.message || "삭제에 실패했습니다.", "error"); });
    });
  }

  // ---- 리뷰 수/평균 별점(통계 카드 — 내 리뷰 목록으로 직접 계산, 별도 통계 API 없음) ----
  Api.request("/api/mypage/reviews").then(function (reviews) {
    var statReviewCount = document.getElementById("statReviewCount");
    var statAvgRating = document.getElementById("statAvgRating");
    var statReviewMonthCount = document.getElementById("statReviewMonthCount");
    var goMyReviewsSub = document.getElementById("goMyReviewsSub");
    if (statReviewCount) statReviewCount.textContent = reviews.length;
    if (goMyReviewsSub) goMyReviewsSub.textContent = reviews.length + "건 · 수정 및 삭제";
    if (statAvgRating) {
      if (reviews.length) {
        var avg = reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length;
        statAvgRating.textContent = avg.toFixed(1);
      } else {
        statAvgRating.textContent = "-";
      }
    }
    if (statReviewMonthCount) {
      var thisMonthPrefix = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      var monthCount = reviews.filter(function (r) {
        return r.createdAt && String(r.createdAt).slice(0, 7) === thisMonthPrefix;
      }).length;
      statReviewMonthCount.textContent = monthCount + "건";
    }
  }).catch(function () {});

  // ---- 참여 중인 채팅방 수(19.오픈채팅 — 안읽은 메시지 수 API는 없어 방 개수만 표시) ----
  Api.request("/api/chat/rooms/my").then(function (rooms) {
    var goChatSub = document.getElementById("goChatSub");
    if (goChatSub) goChatSub.textContent = rooms.length ? rooms.length + "개 참여 중" : "참여 중인 채팅방 없음";
  }).catch(function () {
    var goChatSub = document.getElementById("goChatSub");
    if (goChatSub) goChatSub.textContent = "참여 중인 채팅방 없음";
  });

  loadFavorites();
  loadVisits();
  loadSearchHistories();

  // ---- 회원탈퇴 ----
  var withdrawConfirmBtn = document.getElementById("withdrawConfirmBtn");
  if (withdrawConfirmBtn) {
    withdrawConfirmBtn.addEventListener("click", function () {
      var confirmText = document.getElementById("withdrawConfirmInput").value.trim();
      var password = document.getElementById("withdrawPassword").value;
      var reason = document.getElementById("withdrawReasonSelect").value;
      var pwError = document.getElementById("withdrawPasswordError");
      pwError.classList.remove("is-visible");

      if (confirmText !== "탈퇴합니다") {
        Eatty.toast('"탈퇴합니다"를 정확히 입력해주세요.', "error");
        return;
      }
      if (!password) {
        pwError.classList.add("is-visible");
        return;
      }

      withdrawConfirmBtn.disabled = true;
      Api.request("/api/members/me", { method: "DELETE", body: { password: password, reason: reason } })
        .then(function () {
          Api.clearSession();
          window.location.href = "index";
        })
        .catch(function (err) {
          pwError.textContent = err.message || "비밀번호가 올바르지 않습니다.";
          pwError.classList.add("is-visible");
        })
        .finally(function () { withdrawConfirmBtn.disabled = false; });
    });
  }
})();
