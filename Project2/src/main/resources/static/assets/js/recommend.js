(function () {
  var DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 }; // 강남역
  var RECENT_KEY = "eatty:recommendRecentQueries";

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
  var cardList = document.getElementById("recommendCardList");
  var lastHistoryId = null;
  var lastRecommendations = [];

  function show(which) {
    emptyBox.hidden = which !== "empty";
    loadingBox.hidden = which !== "loading";
    resultBox.hidden = which !== "result";
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
      var marker = new naver.maps.Marker({ position: pos, map: map, title: place.place_name, icon: numberedIcon(i + 1) });
      naver.maps.Event.addListener(marker, "click", function () {
        var card = cardList.querySelector('.rc-card[data-shop-id="' + place.place_id + '"]');
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

  // RestaurantCategoryMatchingService.KAKAO_CATEGORY_FALLBACK(백엔드)와 동일한 키워드 표(2026-08-08).
  // 백엔드도 같은 방식으로 카카오 원본 category_name을 보조 분류하지만, 그건 공유 링크 재검증(카카오
  // bounding box 재검색)이 그 가게를 다시 찾아낼 때만 쓰인다 — 재검색에서 못 찾으면(카카오 단건
  // 재조회가 안 되는 근본 제약) explore.js가 이 쿼리 파라미터 값을 그대로 쓰게 되므로, 프론트도 같은
  // 수준의 키워드 인식을 갖고 있어야 한다.
  var KAKAO_CATEGORY_FALLBACK = [
    ["패스트푸드", ["패스트푸드", "치킨", "피자", "버거", "햄버거"]],
    ["뷔페", ["뷔페"]],
    ["술집", ["술집", "호프", "요리주점", "포차", "와인바", "칵테일바", "이자카야"]],
    ["카페/디저트", ["카페", "디저트", "베이커리", "제과"]],
    ["분식", ["분식"]],
    ["한식", ["한식"]],
    ["양식", ["양식", "이탈리안", "스테이크"]],
    ["중식", ["중식", "중국음식", "중국요리", "중국집"]],
    ["일식", ["일식", "일본음식", "돈까스", "스시", "초밥"]],
    ["아시안", ["아시아", "베트남", "태국", "인도음식", "세계음식"]],
  ];

  function extractCategoryName(categoryNameRaw) {
    if (!categoryNameRaw) return "";
    for (var i = 0; i < KAKAO_CATEGORY_FALLBACK.length; i++) {
      var label = KAKAO_CATEGORY_FALLBACK[i][0], needles = KAKAO_CATEGORY_FALLBACK[i][1];
      for (var j = 0; j < needles.length; j++) {
        if (categoryNameRaw.indexOf(needles[j]) !== -1) return label;
      }
    }
    return "";
  }

  // "카카오맵에서 보기"(외부로 나가버림) 대신 우리 지도 탐색으로 이동해 그 가게 하나만 바로 보여주는
  // 공유 링크(2026-08-08 변경) — explore.js의 openSharedRestaurant()/shareBtn과 같은 파라미터 규약
  // (roulette.js의 nearbyCard.href와도 동일한 패턴).
  function exploreShareUrl(place) {
    var params = new URLSearchParams();
    params.set("shopId", place.place_id);
    if (place.place_name) params.set("name", place.place_name);
    var category = extractCategoryName(place.category_name);
    if (category) params.set("category", category);
    if (place.address_name) params.set("address", place.address_name);
    if (place.road_address_name) params.set("roadAddress", place.road_address_name);
    if (place.y != null) params.set("latitude", place.y);
    if (place.x != null) params.set("longitude", place.x);
    return "explore?" + params.toString();
  }

  // ---- 결과 카드 ----
  function renderCard(place, index) {
    var article = document.createElement("article");
    article.className = "rc-card";
    article.setAttribute("data-shop-id", place.place_id);
    if (place.matched_review_ratio != null) article.setAttribute("data-match-score", Math.round(place.matched_review_ratio * 100));

    var tags = (place.matched_keywords && place.matched_keywords.length)
      ? place.matched_keywords
      : (place.category_name ? place.category_name.split(">").map(function (s) { return s.trim(); }).filter(Boolean).slice(-2) : []);
    var dist = distanceLabel(place.distance);
    var matchBadge = place.matched_review_ratio != null
      ? '<span class="e-badge ' + (index === 0 ? "e-badge--brand" : "e-badge--gray") + '">' + Math.round(place.matched_review_ratio * 100) + '% 일치</span>'
      : "";

    article.innerHTML =
      '<span class="rc-rank" ' + (index === 0 ? "" : 'style="background:var(--ink-' + (index === 1 ? "700" : "400") + ')"') + '>' + (index + 1) + '</span>' +
      '<div class="min-w-0 flex-1">' +
      '<div class="flex items-center gap-2 flex-wrap">' +
      '<h3 class="text-[17px] font-extrabold text-[var(--ink-900)] truncate">' + escapeHtml(place.place_name) + '</h3>' +
      matchBadge +
      (place.category_group_name ? '<span class="e-badge e-badge--gray">' + escapeHtml(place.category_group_name) + '</span>' : '') +
      '</div>' +
      '<div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">' +
      (place.total_review_count != null ? '<span class="t-xs">리뷰 ' + place.total_review_count + '</span>' : '') +
      '<span class="t-xs flex items-center gap-1">' +
      '<svg style="width:13px;height:13px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>' +
      escapeHtml(place.road_address_name || place.address_name || "") + (dist ? " · " + dist : "") +
      '</span></div>' +
      (tags.length ? '<div class="flex flex-wrap gap-1.5 mt-2">' + tags.map(function (t) { return '<span class="e-tag">' + escapeHtml(t) + '</span>'; }).join("") + '</div>' : '') +
      (place.reason ? '<p class="rc-reason"><b class="text-[var(--brand-700)]">추천 이유</b> · ' + escapeHtml(place.reason) + '</p>' : '') +
      '<div class="flex flex-wrap items-center gap-2 mt-3.5">' +
      '<a href="' + escapeHtml(exploreShareUrl(place)) + '" class="btn btn-primary btn-sm">지도에서 보기</a>' +
      '<button type="button" class="btn btn-outline btn-sm" data-fav="' + escapeHtml(place.place_id) + '"><span class="e-heart-icon" style="color:var(--ink-300)">♡</span> 즐겨찾기</button>' +
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
      Api.request("/api/restaurants/" + encodeURIComponent(place.place_id) + "/favorite", {
        method: favored ? "DELETE" : "POST",
        body: { name: place.place_name, address: place.address_name, roadAddress: place.road_address_name, latitude: Number(place.y), longitude: Number(place.x) },
      }).then(function (res) {
        btn.innerHTML = res.favorite
          ? '<span class="e-heart-icon is-active">♥</span> 즐겨찾기됨'
          : '<span class="e-heart-icon" style="color:var(--ink-300)">♡</span> 즐겨찾기';
      }).catch(function (err) { Eatty.toast(err.message || "즐겨찾기 처리에 실패했습니다.", "error"); });
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
            .then(function () { Eatty.toast("피드백 감사합니다."); })
            .catch(function () {});
        });
      });
    }
    return article;
  }

  function renderResults(data) {
    lastHistoryId = data.history_id || null;
    lastRecommendations = data.recommendations || [];

    document.getElementById("recommendResultTitle").textContent = "추천 결과 " + lastRecommendations.length + "곳";
    cardList.innerHTML = "";
    if (!lastRecommendations.length) {
      cardList.innerHTML = '<div class="e-card e-card-pad"><p class="t-sm">조건에 맞는 추천 결과를 찾지 못했어요. 다른 표현으로 다시 시도해보세요.</p></div>';
    } else {
      lastRecommendations.forEach(function (place, i) { cardList.appendChild(renderCard(place, i)); });
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
      }).catch(function (err) {
        show("empty");
        alert(err && err.message ? err.message : "추천을 가져오지 못했어요. 잠시 후 다시 시도해주세요.");
      });
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

  // 2026-08-09 추가 — 기본값을 OFF로 바꾸고(요청사항), 위치 권한이 없는 상태에서 스위치를 켜려고 하면
  // 그냥 켜진 것처럼 보이다가 실제 요청 시 조용히 기본 좌표로 대체되던 것 대신, 그 자리에서 바로
  // 권한을 확인해서 없으면 다시 꺼두고 안내한다.
  (function initUseMyLocationSwitch() {
    var sw = document.getElementById("useMyLocationSwitch");
    if (!sw) return;
    sw.addEventListener("change", function () {
      if (!sw.checked) return;
      if (!navigator.geolocation) {
        sw.checked = false;
        Eatty.toast("이 브라우저에서는 위치 정보를 사용할 수 없습니다.", "error");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function () { /* 권한 있음 — 체크 상태 유지 */ },
        function () {
          sw.checked = false;
          Eatty.toast("위치 권한이 없습니다.", "error");
        }
      );
    });
  })();

  document.getElementById("recommendForm").addEventListener("submit", function (e) {
    e.preventDefault();
    runRecommend();
  });
  document.getElementById("retryBtn").addEventListener("click", runRecommend);

  document.getElementById("saveAllBtn").addEventListener("click", function () {
    if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
    var tasks = lastRecommendations.map(function (place) {
      return Api.request("/api/restaurants/" + encodeURIComponent(place.place_id) + "/favorite", {
        method: "POST",
        body: { name: place.place_name, address: place.address_name, roadAddress: place.road_address_name, latitude: Number(place.y), longitude: Number(place.x) },
      }).catch(function () {});
    });
    Promise.all(tasks).then(function () {
      Eatty.toast("추천 " + lastRecommendations.length + "곳을 즐겨찾기에 저장했습니다.", "brand");
      cardList.querySelectorAll("[data-fav]").forEach(function (btn) { btn.innerHTML = '<span class="e-heart-icon is-active">♥</span> 즐겨찾기됨'; });
    });
  });

  // ---- 식사 후 후속 제안 (공원/카페, 실제 카카오 로컬 API 기반) ----
  function resetFollowup() {
    document.querySelectorAll("[data-followup-body]").forEach(function (el) { el.innerHTML = ""; });
  }
  var FOLLOWUP_LABEL = { PARK: "근처 공원", CAFE: "근처 카페" };
  var FOLLOWUP_ICON = {
    PARK: {
      bg: "var(--success-soft)", color: "var(--success)",
      svg: '<svg style="width:14px;height:20px" viewBox="0 0 320 512" fill="currentColor"><path d="M160 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM126.5 199.3c-1 .4-1.9 .8-2.9 1.2l-8 3.5c-16.4 7.3-29 21.2-34.7 38.2l-2.6 7.8c-5.6 16.8-23.7 25.8-40.5 20.2s-25.8-23.7-20.2-40.5l2.6-7.8c11.4-34.1 36.6-61.9 69.4-76.5l8-3.5c20.8-9.2 43.3-14 66.1-14c44.6 0 84.8 26.8 101.9 67.9L281 232.7l21.4 10.7c15.8 7.9 22.2 27.1 14.3 42.9s-27.1 22.2-42.9 14.3L247 287.3c-10.3-5.2-18.4-13.8-22.8-24.5l-9.6-23-19.3 65.5 49.5 54c5.4 5.9 9.2 13 11.2 20.8l23 92.1c4.3 17.1-6.1 34.5-23.3 38.8s-34.5-6.1-38.8-23.3l-22-88.1-70.7-77.1c-14.8-16.1-20.3-38.6-14.7-59.7l16.9-63.5zM68.7 398l25-62.4c2.1 3 4.5 5.8 7 8.6l40.7 44.4-14.5 36.2c-2.4 6-6 11.5-10.6 16.1L54.6 502.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L68.7 398z"/></svg>',
    },
    CAFE: {
      bg: "var(--warning-soft)", color: "var(--warning)",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M4 22h13"/></svg>',
    },
  };
  var followupModalTitle = document.getElementById("followupModalTitle");
  var followupModalDesc = document.getElementById("followupModalDesc");
  var followupModalBody = document.getElementById("followupModalBody");

  function followupLoadingHtml() {
    return '<div class="flex flex-col items-center justify-center py-14 text-center">' +
      '<div class="rc-spinner" style="width:40px;height:40px"><span></span></div>' +
      '<p class="text-[13.5px] text-[var(--ink-500)] mt-4">주변을 살펴보고 있어요</p>' +
      '</div>';
  }

  function followupPlaceRow(p, type) {
    var icon = FOLLOWUP_ICON[type] || FOLLOWUP_ICON.CAFE;
    var meta = [p.categoryName ? p.categoryName.split(">").pop().trim() : "", p.roadAddressName || p.addressName || ""]
      .filter(Boolean).join(" · ");
    var tag = p.placeUrl ? "a" : "div";
    return '<' + tag + (p.placeUrl ? ' href="' + escapeHtml(p.placeUrl) + '" target="_blank" rel="noopener"' : "") +
      ' class="rc-follow-row">' +
      '<span class="rc-follow-icon" style="background:' + icon.bg + ';color:' + icon.color + '">' + icon.svg + '</span>' +
      '<span class="min-w-0 flex-1">' +
      '<span class="block text-[14.5px] font-bold text-[var(--ink-900)] truncate">' + escapeHtml(p.placeName) + '</span>' +
      (meta ? '<span class="block text-[12px] text-[var(--ink-500)] truncate mt-0.5">' + escapeHtml(meta) + '</span>' : "") +
      '</span>' +
      (p.distanceMeters != null ? '<span class="text-[12.5px] font-bold text-[var(--brand-600)] flex-none">' + distanceLabel(p.distanceMeters) + '</span>' : "") +
      '</' + tag + '>';
  }

  document.getElementById("followupSection").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-followup-load]");
    if (!btn) return;
    if (!lastRecommendations.length) return;
    var anchor = lastRecommendations[0];
    var type = btn.getAttribute("data-followup-load");

    followupModalTitle.textContent = FOLLOWUP_LABEL[type] || "근처 추천";
    followupModalDesc.textContent = (anchor.place_name || "추천 1순위 매장") + " 주변 결과예요.";
    followupModalBody.innerHTML = followupLoadingHtml();
    Eatty.openModal("followupModal");

    Api.request("/api/recommendation/nearby-course", {
      method: "POST", auth: false,
      body: { type: type, anchorName: anchor.place_name, x: Number(anchor.x), y: Number(anchor.y) },
    }).then(function (data) {
      var places = data.places || [];
      if (!places.length) { followupModalBody.innerHTML = '<p class="t-sm text-center py-14">근처에서 찾지 못했어요.</p>'; return; }
      followupModalBody.innerHTML = places.map(function (p) { return followupPlaceRow(p, type); }).join("");
    }).catch(function (err) {
      followupModalBody.innerHTML = '<p class="t-sm text-center py-14 text-red-500">' + escapeHtml(err.message || "불러오지 못했습니다.") + '</p>';
    });
  });
})();
