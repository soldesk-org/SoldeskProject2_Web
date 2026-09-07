(function () {
  var DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 }; // 강남역
  var RECENT_KEY = "eatty:recommendRecentQueries";

  // 2026-08-22 추가, 2026-09-04 수정 — AI 추천 서버가 꺼져있을 때 이 페이지에 URL로 직접 들어오면
  // "서비스 준비중" 화면만 보이게 한다(헤더 메뉴 숨김은 api.js가 담당, 이건 그 우회 경로를 막는 것).
  // 화면(HTML)에서부터 #recommendUnavailable이 기본으로 보이고 #recommendMain은 기본 숨김 상태라
  // 상태 확인 응답을 기다리는 동안 깜빡임 없이 바로 안내 화면이 뜬다. 다만 서버가 실제로는 켜져있는
  // 일반적인 경우에도 응답을 기다리는 그 짧은 시간만큼 안내 화면이 먼저 번쩍였다가 본문으로 바뀌는
  // 게 어색해서, api.js가 다른 페이지에서 미리 확인해 localStorage에 남겨둔 마지막 상태(캐시)가
  // "켜짐"이면 응답을 기다리지 않고 곧바로 본문을 보여주고, 실제 응답이 오면 그걸로 다시 한번
  // 정확하게 맞춘다(캐시와 실제가 어긋난 경우 보정 — 예: 그 사이 서버가 꺼졌으면 다시 안내 화면으로).
  // 캐시가 없거나 "꺼짐"이면 기존처럼 HTML 기본값(안내 화면)을 유지한 채 응답을 기다린다 — 상태 확인
  // 자체가 실패해도(네트워크 오류 등) 안전하게 "꺼져있다"로 간주한다.
  var AI_RECO_CACHE_KEY = "eatty:aiRecoUp";
  (function applyCachedState() {
    try {
      if (localStorage.getItem(AI_RECO_CACHE_KEY) === "1") showRecommendMain();
    } catch (e) { /* 무시 */ }
  })();

  Api.request("/api/recommendations/status", { auth: false })
    .then(function (data) {
      var up = !!(data && data.up);
      if (up) showRecommendMain(); else showRecommendUnavailable();
      try { localStorage.setItem(AI_RECO_CACHE_KEY, up ? "1" : "0"); } catch (e) { /* 무시 */ }
    })
    .catch(function () { /* 실패 시 현재 화면 상태를 그대로 유지 */ });

  function showRecommendMain() {
    var main = document.getElementById("recommendMain");
    var unavailable = document.getElementById("recommendUnavailable");
    if (unavailable) unavailable.hidden = true;
    if (main) main.hidden = false;
  }

  function showRecommendUnavailable() {
    var main = document.getElementById("recommendMain");
    var unavailable = document.getElementById("recommendUnavailable");
    if (main) main.hidden = true;
    if (unavailable) unavailable.hidden = false;
  }

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
  // "다른 결과 다시 검색"(2026-08-12 추가) — retryBtn을 눌렀을 때 이전에 보여준 음식점들은 제외하고
  // 새로운 곳들로 채워지도록, 지금까지 보여준 place_id를 누적해서 기억해둔다. 새 검색(폼 제출/예시
  // 칩)이면 다른 조건이므로 초기화한다.
  var shownPlaceIds = [];
  // 2026-08-22 추가 - 검색 후 입력창을 비우기로 하면서("입력한 게 안 없어져" 지적), "다른 곳 추천"
  // (retryBtn)이 여전히 같은 조건으로 재검색해야 하는데 그때 입력창이 비어있으면 buildQueryText()가
  // 빈 문자열을 돌려줘 깨진다 — 마지막으로 실제 검색에 쓰인 문구를 여기 따로 기억해뒀다가 재검색에 쓴다.
  var lastQueryText = "";

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
  function hasNaverMaps() {
    return !!(window.naver && window.naver.maps &&
      typeof window.naver.maps.Map === "function" &&
      typeof window.naver.maps.LatLng === "function" &&
      typeof window.naver.maps.LatLngBounds === "function");
  }
  function initRecommendMap(center) {
    var mapEl = document.getElementById("naverMapRecommend");
    if (!hasNaverMaps()) { map = null; return; }
    try {
      map = new window.naver.maps.Map("naverMapRecommend", {
        center: new window.naver.maps.LatLng(center.lat, center.lng),
        zoom: 14,
      });
      if (mapEl) mapEl.classList.remove("e-skeleton");
    } catch (e) {
      map = null;
    }
  }
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
    if (!map || !hasNaverMaps()) return;
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
      function (pos) { initRecommendMap({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      function () { initRecommendMap(DEFAULT_CENTER); }
    );
  } else {
    initRecommendMap(DEFAULT_CENTER);
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
      '<button type="button" class="btn btn-outline btn-sm" data-fav="' + escapeHtml(place.place_id) + '"><span class="e-heart-icon" style="color:var(--ink-300)">♡</span> 저장</button>' +
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
          ? '<span class="e-heart-icon is-active">♥</span> 저장됨'
          : '<span class="e-heart-icon" style="color:var(--ink-300)">♡</span> 저장';
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
          Api.request("/api/recommendations/" + lastHistoryId, { method: "PATCH", body: { wasHelpful: kind === "like" } })
            .then(function () { Eatty.toast("피드백 감사합니다."); })
            .catch(function () {});
        });
      });
    }
    return article;
  }

  function renderResults(data, isRetry) {
    lastHistoryId = data.history_id || null;
    var incoming = data.recommendations || [];

    if (isRetry) {
      var fresh = incoming.filter(function (p) { return shownPlaceIds.indexOf(p.place_id) === -1; });
      if (!fresh.length && incoming.length) {
        // 필터링했더니 전부 이미 봤던 곳뿐이면(후보 자체가 적은 경우) 새로운 결과가 없다는 걸 알리고
        // 기존 화면은 그대로 둔다 — 빈 화면으로 덮어쓰지 않는다.
        Eatty.toast("더 이상 새로운 추천 결과가 없어요.", "default");
        return;
      }
      lastRecommendations = fresh;
    } else {
      shownPlaceIds = [];
      lastRecommendations = incoming;
    }
    shownPlaceIds = shownPlaceIds.concat(lastRecommendations.map(function (p) { return p.place_id; }));

    document.getElementById("recommendResultTitle").textContent = "추천 결과 " + lastRecommendations.length + "곳";
    var noticeEl = document.getElementById("recommendDataNotice");
    if (noticeEl) {
      noticeEl.hidden = !data.data_notice;
      noticeEl.textContent = data.data_notice || "";
    }
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

  function runRecommend(isRetry) {
    var text = isRetry ? lastQueryText : buildQueryText();
    if (!text) { Eatty.toast("찾고 있는 조건을 입력해주세요.", "error"); query.focus(); return; }
    lastQueryText = text;
    show("loading");
    // 2026-08-13 추가 — "최근 질문" 클릭은 누르자마자 바로 맨 위로 스크롤되는데, 검색은 결과가 올 때까지
    // (LLM 추론 때문에 몇 초 걸림) 화면이 그대로라 눌렀는지 안 눌렀는지 헷갈렸다. 최근 질문과 대칭으로
    // 누르자마자 바로 로딩 영역으로 스크롤한다(결과가 오면 기존처럼 resultBox로 한 번 더 스크롤).
    loadingBox.scrollIntoView({ behavior: "smooth", block: "start" });

    function request(center) {
      var useAuth = document.getElementById("useMyBtiSwitch").checked;
      // 재검색은 이전에 본 곳들을 걸러내고도 채울 수 있도록 후보를 더 넉넉히 요청한다(Python 쪽에
      // "제외" 파라미터가 없어 클라이언트에서 겹치는 곳만 걸러내는 방식이라 여유가 필요) — 다만 Python
      // 서버의 size는 최대 15까지만 허용해서(2026-08-13 확인, 초과하면 422) 40으로 잡았던 게 실제로는
      // 매 재검색마다 요청 자체가 거부되고 있었다. 15로 고정.
      var size = isRetry ? 15 : 10;
      Api.request("/api/recommendations", {
        method: "POST",
        auth: useAuth,
        body: { text: text, x: center ? center.lng : undefined, y: center ? center.lat : undefined, radius: 3000, size: size },
      }).then(function (data) {
        renderResults(data, isRetry);
        show("result");
        pushRecent(query.value.trim() || text);
        // 2026-08-22 추가 - 검색 후에도 입력창에 방금 친 문구가 그대로 남아있던 문제("버튼 눌렀는데
        // 입력한 게 안 없어져" 지적). 최근 질문 기록(pushRecent)은 이미 지우기 전에 값을 읽어뒀으니
        // 그 다음에 비운다.
        query.value = "";
        resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
      }).catch(function () {
        // 2026-08-10 수정 — Cloudflare 터널이 끊기면 err.message에 "error code: 1033" 같은 원본 에러
        // 페이지 내용이 그대로 담겨오는데, 그걸 alert()로 그대로 노출하고 있었다. 서버 쪽 원인 문자열이
        // 무엇이든 사용자에게는 고정된 안내만 토스트로 보여준다.
        show("empty");
        Eatty.toast("AI 추천 서버가 작동하지 않습니다.", "error");
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
    runRecommend(false);
  });
  document.getElementById("retryBtn").addEventListener("click", function () { runRecommend(true); });

  // "지도에서 모두 보기"/"크게 보기"(2026-08-13 추가) — 예전엔 그냥 href="explore"라서 지도 탐색의
  // 기본 검색 화면만 열리고 방금 추천받은 음식점들은 하나도 안 보였다. sessionStorage로 결과 목록을
  // 통째로 넘겨서 explore.js가 그 목록으로 목록/마커를 그대로 채우게 한다(단발성 — explore.js가 읽고
  // 나면 지워서, 그 뒤로 explore를 다시 들어가면 평소처럼 주변 검색이 뜬다).
  var HANDOFF_KEY = "eatty.recommendMapHandoff";
  function saveMapHandoff() {
    if (!lastRecommendations.length) return;
    var items = lastRecommendations
      .filter(function (p) { return p.y && p.x; })
      .map(function (p) {
        return {
          restaurantId: p.place_id,
          name: p.place_name,
          // explore.js의 마커 이미지(CATEGORY_MARKER)는 우리 쪽 분류명(한식/양식/...)을 키로 쓰기 때문에,
          // 카카오 원본 category_name을 그대로 넘기면 매칭이 안 된다 — exploreShareUrl()과 같은 방식으로
          // 미리 분류해서 넘긴다.
          category: extractCategoryName(p.category_name),
          address: p.address_name,
          roadAddress: p.road_address_name,
          latitude: Number(p.y),
          longitude: Number(p.x),
        };
      });
    if (!items.length) return;
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ items: items, savedAt: Date.now() })); } catch (e) { /* 무시 */ }
  }
  ["openInMapBtn", "openInMapMiniBtn"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", saveMapHandoff);
  });

  document.getElementById("saveAllBtn").addEventListener("click", function () {
    if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
    var tasks = lastRecommendations.map(function (place) {
      return Api.request("/api/restaurants/" + encodeURIComponent(place.place_id) + "/favorite", {
        method: "POST",
        body: { name: place.place_name, address: place.address_name, roadAddress: place.road_address_name, latitude: Number(place.y), longitude: Number(place.x) },
      }).catch(function () {});
    });
    Promise.all(tasks).then(function () {
      Eatty.toast("추천 " + lastRecommendations.length + "곳을 저장했습니다.", "brand");
      cardList.querySelectorAll("[data-fav]").forEach(function (btn) { btn.innerHTML = '<span class="e-heart-icon is-active">♥</span> 저장됨'; });
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

  // 2026-08-18 수정 — 스피너 대신 실제 결과 행(.rc-follow-row)과 같은 모양의 스켈레톤으로 교체.
  function followupLoadingHtml() {
    var row =
      '<div class="rc-follow-row">' +
      '<span class="e-skeleton w-[38px] h-[38px] rounded-[12px] flex-none"></span>' +
      '<span class="min-w-0 flex-1 space-y-1.5">' +
      '<span class="e-skeleton block h-3.5 w-2/5 rounded"></span>' +
      '<span class="e-skeleton block h-3 w-3/5 rounded"></span>' +
      '</span>' +
      '<span class="e-skeleton block h-3 w-8 rounded flex-none"></span>' +
      '</div>';
    return row + row + row;
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

    Api.request("/api/recommendations/nearby-places", {
      method: "POST", auth: false,
      body: { type: type, anchorName: anchor.place_name, x: Number(anchor.x), y: Number(anchor.y) },
    }).then(function (data) {
      var places = data.places || [];
      if (!places.length) { followupModalBody.innerHTML = '<p class="t-sm text-center py-14">근처에서 찾지 못했어요.</p>'; return; }
      followupModalBody.innerHTML = places.map(function (p) { return followupPlaceRow(p, type); }).join("");
    }).catch(function () {
      Eatty.closeModal("followupModal");
      Eatty.toast("AI 추천 서버와 통신할 수 없습니다", "error");
    });
  });
})();
