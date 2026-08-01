(function () {
  var DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 }; // 강남역
  var RECENT_KEY = "eatty:recommendRecentQueries";
  var RULE_LABEL = { CATEGORY_BASED: "카테고리 기반 추천", REVIEW_RATIO_BASED: "리뷰 태그 기반 추천" };

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function distanceLabel(meters) {
    if (meters == null) return "";
    var m = Number(meters);
    if (!m) return "";
    return m < 1000 ? Math.round(m) + "m" : (m / 1000).toFixed(1) + "km";
  }

  var query = document.getElementById("recommendQuery");
  var emptyBox = document.getElementById("recommendEmpty");
  var loadingBox = document.getElementById("recommendLoading");
  var resultBox = document.getElementById("recommendResult");
  var errorBox = document.getElementById("recommendError");
  var cardList = document.getElementById("recommendCardList");
  var lastHistoryId = null;
  var lastRecommendations = [];

  function show(which) {
    emptyBox.hidden = which !== "empty";
    loadingBox.hidden = which !== "loading";
    resultBox.hidden = which !== "result";
    errorBox.hidden = which !== "error";
  }

  // ---- 최근 질문 (서버에 저장 API가 없어 localStorage로만 관리) ----
  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveRecent(list) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  }
  function pushRecent(text) {
    var list = loadRecent().filter(function (q) { return q !== text; });
    list.unshift(text);
    saveRecent(list);
    renderRecent();
  }
  function renderRecent() {
    var el = document.getElementById("recentQueryList");
    var list = loadRecent();
    if (!list.length) { el.innerHTML = '<p class="t-xs text-center py-6">최근 질문이 없습니다.</p>'; return; }
    el.innerHTML = list.map(function (q) {
      return '<button type="button" class="e-dropdown-item !text-[13px]" data-recent-query="' + escapeHtml(q) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.5 2"/></svg>' +
        '<span class="truncate">' + escapeHtml(q) + '</span></button>';
    }).join("");
  }
  renderRecent();
  document.getElementById("clearRecentBtn").addEventListener("click", function () {
    saveRecent([]);
    renderRecent();
    Eatty.toast("최근 질문 기록을 삭제했습니다.");
  });

  document.addEventListener("click", function (e) {
    var ex = e.target.closest("[data-example], [data-recent-query]");
    if (!ex) return;
    query.value = ex.getAttribute("data-example") || ex.getAttribute("data-recent-query");
    query.dispatchEvent(new Event("input"));
    query.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---- 내 음BTI 표시 (로그인 시) ----
  if (Api.isLoggedIn()) {
    Api.request("/api/members/me").then(function (me) {
      var el = document.getElementById("myFoodBtiText");
      if (el) el.textContent = me.foodBti || "아직 검사하지 않음";
    }).catch(function () {});
  }

  // ---- 지도 ----
  var map = null;
  var markers = [];
  function clearMarkers() { markers.forEach(function (m) { m.setMap(null); }); markers = []; }
  function numberedIcon(n) {
    return {
      content: '<div style="width:26px;height:26px;border-radius:50%;background:#fd6d4a;color:#fff;' +
        'font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 1px 3px rgba(0,0,0,.35)">' + n + '</div>',
      anchor: new naver.maps.Point(13, 13),
    };
  }
  function renderMapMarkers(list) {
    if (!map) return;
    clearMarkers();
    var bounds = new naver.maps.LatLngBounds();
    list.forEach(function (place, i) {
      var lat = Number(place.y), lng = Number(place.x);
      if (!lat || !lng) return;
      var pos = new naver.maps.LatLng(lat, lng);
      var marker = new naver.maps.Marker({ position: pos, map: map, title: place.placeName, icon: numberedIcon(i + 1) });
      naver.maps.Event.addListener(marker, "click", function () {
        var card = cardList.querySelector('.rc-card[data-shop-id="' + place.placeId + '"]');
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      markers.push(marker);
      bounds.extend(pos);
    });
    if (list.length) map.fitBounds(bounds);
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (pos) { map = new naver.maps.Map("naverMapRecommend", { center: new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude), zoom: 14 }); },
      function () { map = new naver.maps.Map("naverMapRecommend", { center: new naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng), zoom: 14 }); }
    );
  } else {
    map = new naver.maps.Map("naverMapRecommend", { center: new naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng), zoom: 14 });
  }

  // ---- 결과 카드 ----
  function renderCard(place, index) {
    var article = document.createElement("article");
    article.className = "rc-card";
    article.setAttribute("data-shop-id", place.placeId);
    if (place.matchedReviewRatio != null) article.setAttribute("data-match-score", Math.round(place.matchedReviewRatio * 100));

    var tags = (place.matchedKeywords && place.matchedKeywords.length)
      ? place.matchedKeywords
      : (place.categoryName ? place.categoryName.split(">").map(function (s) { return s.trim(); }).filter(Boolean).slice(-2) : []);
    var dist = distanceLabel(place.distance);
    var matchBadge = place.matchedReviewRatio != null
      ? '<span class="e-badge ' + (index === 0 ? "e-badge--brand" : "e-badge--gray") + '">' + Math.round(place.matchedReviewRatio * 100) + '% 일치</span>'
      : "";

    article.innerHTML =
      '<span class="rc-rank" ' + (index === 0 ? "" : 'style="background:var(--ink-' + (index === 1 ? "700" : "400") + ')"') + '>' + (index + 1) + '</span>' +
      '<div class="min-w-0 flex-1">' +
      '<div class="flex items-center gap-2 flex-wrap">' +
      '<h3 class="text-[17px] font-extrabold text-[var(--ink-900)] truncate">' + escapeHtml(place.placeName) + '</h3>' +
      matchBadge +
      (place.categoryGroupName ? '<span class="e-badge e-badge--gray">' + escapeHtml(place.categoryGroupName) + '</span>' : '') +
      '</div>' +
      '<div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">' +
      (place.totalReviewCount != null ? '<span class="t-xs">리뷰 ' + place.totalReviewCount + '</span>' : '') +
      '<span class="t-xs flex items-center gap-1">' +
      '<svg style="width:13px;height:13px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>' +
      escapeHtml(place.roadAddressName || place.addressName || "") + (dist ? " · " + dist : "") +
      '</span></div>' +
      (tags.length ? '<div class="flex flex-wrap gap-1.5 mt-2">' + tags.map(function (t) { return '<span class="e-tag">' + escapeHtml(t) + '</span>'; }).join("") + '</div>' : '') +
      (place.reason ? '<p class="rc-reason"><b class="text-[var(--brand-700)]">추천 이유</b> · ' + escapeHtml(place.reason) + '</p>' : '') +
      '<div class="flex flex-wrap items-center gap-2 mt-3.5">' +
      (place.placeUrl ? '<a href="' + escapeHtml(place.placeUrl) + '" target="_blank" rel="noopener" class="btn btn-primary btn-sm">카카오맵에서 보기</a>' : '') +
      '<button type="button" class="btn btn-outline btn-sm" data-fav="' + escapeHtml(place.placeId) + '">♡ 즐겨찾기</button>' +
      '<div class="flex items-center gap-1.5 ml-auto" data-feedback-group>' +
      '<button type="button" class="fb-btn" data-feedback="like" aria-pressed="false" aria-label="좋아요">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 22V10l4-8h1.5a2 2 0 0 1 2 2.3L14 8h5a2 2 0 0 1 2 2.4l-1.6 8A2 2 0 0 1 17.4 20H7Z"/><path d="M7 10H4v12h3"/></svg>좋아요</button>' +
      '<button type="button" class="fb-btn" data-feedback="dislike" aria-pressed="false" aria-label="싫어요">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2v12l-4 8h-1.5a2 2 0 0 1-2-2.3L10 16H5a2 2 0 0 1-2-2.4l1.6-8A2 2 0 0 1 6.6 4H17Z"/><path d="M17 14h3V2h-3"/></svg>싫어요</button>' +
      '</div></div></div>';

    article.querySelector("[data-fav]").addEventListener("click", function () {
      if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
      var btn = this;
      var favored = btn.textContent.indexOf("♥") !== -1;
      Api.request("/api/restaurants/" + encodeURIComponent(place.placeId) + "/favorite", {
        method: favored ? "DELETE" : "POST",
        body: { name: place.placeName, address: place.addressName, roadAddress: place.roadAddressName, latitude: Number(place.y), longitude: Number(place.x) },
      }).then(function (res) { btn.innerHTML = res.favorite ? "♥ 즐겨찾기됨" : "♡ 즐겨찾기"; })
        .catch(function (err) { Eatty.toast(err.message || "즐겨찾기 처리에 실패했습니다.", "error"); });
    });

    var feedbackGroup = article.querySelector("[data-feedback-group]");
    if (!lastHistoryId) {
      feedbackGroup.innerHTML = '<span class="t-xs">로그인하면 피드백을 남길 수 있어요</span>';
    } else {
      feedbackGroup.querySelectorAll("[data-feedback]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var on = btn.getAttribute("aria-pressed") === "true";
          feedbackGroup.querySelectorAll("[data-feedback]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          article.classList.remove("is-liked", "is-disliked");
          if (on) return;
          var kind = btn.getAttribute("data-feedback");
          btn.setAttribute("aria-pressed", "true");
          article.classList.add(kind === "like" ? "is-liked" : "is-disliked");
          Api.request("/api/recommendation/" + lastHistoryId + "/feedback", { method: "PATCH", body: { wasHelpful: kind === "like" } })
            .then(function () { Eatty.toast("피드백 감사합니다.", kind === "like" ? "brand" : "default"); })
            .catch(function () {});
        });
      });
    }
    return article;
  }

  function renderResults(data) {
    lastHistoryId = data.historyId || null;
    lastRecommendations = data.recommendations || [];

    document.getElementById("recommendResultTitle").textContent = "추천 결과 " + lastRecommendations.length + "곳";
    cardList.innerHTML = "";
    if (!lastRecommendations.length) {
      cardList.innerHTML = '<div class="e-card e-card-pad"><p class="t-sm">조건에 맞는 추천 결과를 찾지 못했어요. 다른 표현으로 다시 시도해보세요.</p></div>';
    } else {
      lastRecommendations.forEach(function (place, i) { cardList.appendChild(renderCard(place, i)); });
    }

    var summaryEl = document.getElementById("aiSummaryText");
    var tagsEl = document.getElementById("aiSummaryTags");
    var a = data.analysis;
    if (a) {
      var parts = [];
      if (a.location && a.location.length) parts.push(a.location.join(", ") + " 근처");
      if (a.category && a.category.length) parts.push(a.category.join(", "));
      if (a.atmosphereKeywords && a.atmosphereKeywords.length) parts.push(a.atmosphereKeywords.join(", ") + " 분위기");
      var sentence = (parts.length ? parts.join(" · ") + " 조건으로 " : "") +
        (RULE_LABEL[data.recommendationRule] || "조건") + "으로 " + lastRecommendations.length + "곳을 골랐어요.";
      summaryEl.textContent = sentence + (data.dataNotice ? " " + data.dataNotice : "");

      var tagValues = [].concat(a.location || [], a.category || [], a.atmosphereKeywords || [], a.menuKeywords || []);
      tagsEl.innerHTML = tagValues.slice(0, 6).map(function (t) { return '<span class="e-tag">' + escapeHtml(t) + '</span>'; }).join("");
    } else {
      summaryEl.textContent = "조건에 맞는 추천 결과 " + lastRecommendations.length + "곳을 찾았어요.";
      tagsEl.innerHTML = "";
    }

    renderMapMarkers(lastRecommendations);
    resetFollowup();
  }

  function buildQueryText() {
    var text = query.value.trim();
    var area = document.getElementById("quickArea").value.trim();
    var peopleSelect = document.getElementById("quickPeople");
    var budgetSelect = document.getElementById("quickBudget");
    var extra = [];
    if (area) extra.push(area);
    if (peopleSelect.value) extra.push(peopleSelect.selectedOptions[0].textContent + " 방문");
    if (budgetSelect.value) extra.push("1인 예산 " + budgetSelect.selectedOptions[0].textContent);
    if (!text && extra.length) return extra.join(", ") + " 맛집 추천해줘";
    if (extra.length) return text + " (" + extra.join(", ") + ")";
    return text;
  }

  function runRecommend() {
    var text = buildQueryText();
    if (!text) { Eatty.toast("찾고 있는 조건을 입력해주세요.", "error"); query.focus(); return; }
    document.getElementById("resultQueryEcho").textContent = query.value.trim() || text;
    show("loading");

    function request(center) {
      var useAuth = document.getElementById("useMyBtiSwitch").checked;
      Api.request("/api/recommendation/query", {
        method: "POST",
        auth: useAuth,
        body: { text: text, x: center ? center.lng : undefined, y: center ? center.lat : undefined, radius: 3000, size: 10 },
      }).then(function (data) {
        renderResults(data);
        show("result");
        pushRecent(query.value.trim() || text);
        resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
      }).catch(function () { show("error"); });
    }

    if (document.getElementById("useMyLocationSwitch").checked && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) { request({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        function () { request(DEFAULT_CENTER); }
      );
    } else if (document.getElementById("useMyLocationSwitch").checked) {
      request(DEFAULT_CENTER);
    } else {
      request(null);
    }
  }

  document.getElementById("recommendForm").addEventListener("submit", function (e) {
    e.preventDefault();
    runRecommend();
  });
  document.getElementById("retryBtn").addEventListener("click", runRecommend);
  document.querySelectorAll("#recommendError button").forEach(function (btn) { btn.addEventListener("click", runRecommend); });

  document.getElementById("saveAllBtn").addEventListener("click", function () {
    if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
    var tasks = lastRecommendations.map(function (place) {
      return Api.request("/api/restaurants/" + encodeURIComponent(place.placeId) + "/favorite", {
        method: "POST",
        body: { name: place.placeName, address: place.addressName, roadAddress: place.roadAddressName, latitude: Number(place.y), longitude: Number(place.x) },
      }).catch(function () {});
    });
    Promise.all(tasks).then(function () {
      Eatty.toast("추천 " + lastRecommendations.length + "곳을 즐겨찾기에 저장했습니다.", "brand");
      cardList.querySelectorAll("[data-fav]").forEach(function (btn) { btn.innerHTML = "♥ 즐겨찾기됨"; });
    });
  });

  // ---- 식사 후 후속 제안 (공원/카페, 실제 카카오 로컬 API 기반) ----
  function resetFollowup() {
    document.querySelectorAll("[data-followup-body]").forEach(function (el) { el.innerHTML = ""; });
  }
  document.getElementById("followupSection").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-followup-load]");
    if (!btn) return;
    if (!lastRecommendations.length) return;
    var anchor = lastRecommendations[0];
    var type = btn.getAttribute("data-followup-load");
    var body = btn.closest(".fu-card").querySelector("[data-followup-body]");
    body.innerHTML = '<p class="t-xs">찾는 중...</p>';
    Api.request("/api/recommendation/nearby-course", {
      method: "POST", auth: false,
      body: { type: type, anchorName: anchor.placeName, x: Number(anchor.x), y: Number(anchor.y) },
    }).then(function (data) {
      var places = data.places || [];
      if (!places.length) { body.innerHTML = '<p class="t-xs">근처에서 찾지 못했어요.</p>'; return; }
      body.innerHTML = places.slice(0, 5).map(function (p) {
        return '<div class="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--line-soft)] last:border-0">' +
          '<span class="text-[13px] font-semibold text-[var(--ink-800)] truncate">' + escapeHtml(p.placeName) + '</span>' +
          (p.distanceMeters != null ? '<span class="t-xs font-bold text-[var(--brand-600)] flex-none">' + distanceLabel(p.distanceMeters) + '</span>' : '') +
          '</div>';
      }).join("");
    }).catch(function (err) {
      body.innerHTML = '<p class="t-xs text-red-500">' + escapeHtml(err.message || "불러오지 못했습니다.") + '</p>';
    });
  });
})();
