/* 메뉴 룰렛 (roulette.html)
 * ---------------------------------------------------------------------------
 * 백엔드 신규 API 없음 — 카테고리 목록만 07의 기존 공개 API(GET /api/restaurants/categories)를 쓴다.
 * 룰렛 결과는 "그 순간 정하고 끝나는" 값이라 서버에 저장하지 않는다(로그인도 필요 없음).
 *
 * [회전 각도 계산]
 * 각도는 전부 "12시 방향 = 0도, 시계방향 증가" 기준이다(포인터가 12시에 고정돼 있으므로).
 *   1) 당첨 칸을 Math.random()으로 **먼저** 정한다.
 *   2) 그 칸이 포인터(0도) 아래에 오려면 휠을 얼마나 돌려야 하는지 역산한다.
 *      휠을 R도 돌리면 각도 A에 있던 칸은 (A + R)로 이동하므로, A + R ≡ 0 (mod 360) → R ≡ -A.
 *   3) 마지막으로 여러 바퀴를 더해 "돌아가는 느낌"을 만든다.
 * 이렇게 하면 애니메이션이 끝난 시점에 포인터가 가리키는 칸과 실제 당첨 결과가 항상 일치한다
 * (랜덤 각도로 돌린 뒤 사후에 칸을 계산하는 방식보다 어긋날 여지가 없음).
 */
(function () {
  var CX = 160, CY = 160, R = 150;          // wheelSvg viewBox(0 0 320 320) 기준
  // 칸 이름은 항상 똑바로(가로) 세워 두는 쪽이 훨씬 잘 읽혀서, 방사형으로 눕히지 않는다.
  // 칸마다 있던 마커 아이콘은 가운데 축(hub)과 겹쳐 보여서 뺐다(2026-08-07) — 이름만 칸 한가운데에 둔다.
  var LABEL_R = 95;                          // 칸 이름을 놓을 반지름(칸의 시각적 중앙)
  var MIN_ITEMS = 2;

  // 07(음식점-메뉴-검색)/지도에서 쓰는 카테고리 마커 이미지를 그대로 재사용해 시각적으로 통일한다.
  var MARKER_BY_CODE = {
    KOREAN: "marker-korean.png",
    WESTERN: "marker-western.png",
    CHINESE: "marker-chinese.png",
    JAPANESE: "marker-japanese.png",
    SNACK: "marker-snack.png",
    FAST_FOOD: "marker-fastfood.png",
    ASIAN: "marker-asian.png",
    BAR: "marker-bar.png",
    BUFFET: "marker-buffet.png",
    CAFE_DESSERT: "marker-cafe.png",
  };
  // 칸 색상(순서대로 반복). 흰 글씨가 읽히도록 충분히 진한 색만 골랐다.
  var SLICE_COLORS = [
    "#fd6d4a", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#ef4444",
  ];

  var categories = [];      // API로 받은 전체 카테고리(마커 이미지가 있는 것만)
  var selectedCodes = [];   // 선택한 categoryCode (선택한 순서 유지)
  var items = [];           // 현재 룰렛에 올라간 항목 [{categoryCode, categoryName, color}]
  var rotation = 0;         // 지금까지 누적된 회전각(도). CSS transform은 절대값이라 계속 더해 나간다.
  var spinning = false;
  var lastWinner = null;

  var categoryGrid = document.getElementById("categoryGrid");
  var selectedCountEl = document.getElementById("selectedCount");
  var buildRouletteBtn = document.getElementById("buildRouletteBtn");
  var setupSection = document.getElementById("rouletteSetupSection");
  var playSection = document.getElementById("roulettePlaySection");
  var wheelGroup = document.getElementById("wheelGroup");
  var spinBtn = document.getElementById("spinBtn");
  var excludeBtn = document.getElementById("excludeBtn");

  function markerUrl(code) {
    return "img/markers/" + MARKER_BY_CODE[code];
  }

  /* ---------------------------- 카테고리 선택 ---------------------------- */
  function loadCategories() {
    Api.request("/api/restaurants/categories", { auth: false })
      .then(function (list) {
        // "그 외"(ETC)처럼 마커 이미지가 없는 항목은 룰렛에 올려도 의미가 없어 제외한다.
        categories = (list || []).filter(function (c) { return MARKER_BY_CODE[c.categoryCode]; });
        renderCategoryGrid();
      })
      .catch(function () {
        document.getElementById("categoryLoadError").hidden = false;
      });
  }

  function renderCategoryGrid() {
    categoryGrid.innerHTML = categories.map(function (c) {
      return '<button type="button" class="cat-pick" aria-pressed="false"' +
        ' data-category-code="' + c.categoryCode + '">' +
        '<span class="cat-pick-check" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
        '</span>' +
        '<img src="' + markerUrl(c.categoryCode) + '" alt="">' +
        '<span class="cat-pick-name"></span>' +
        '</button>';
    }).join("");

    // 카테고리명은 서버 값이라 textContent로 안전하게 주입한다.
    Array.prototype.forEach.call(categoryGrid.querySelectorAll(".cat-pick"), function (btn, i) {
      btn.querySelector(".cat-pick-name").textContent = categories[i].categoryName;
    });
  }

  categoryGrid.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-category-code]");
    if (!btn) return;
    var code = btn.getAttribute("data-category-code");
    var idx = selectedCodes.indexOf(code);
    if (idx > -1) selectedCodes.splice(idx, 1);
    else selectedCodes.push(code);
    btn.setAttribute("aria-pressed", idx > -1 ? "false" : "true");
    syncSelectionUI();
  });

  function syncSelectionUI() {
    selectedCountEl.textContent = selectedCodes.length;
    buildRouletteBtn.disabled = selectedCodes.length < MIN_ITEMS;
  }

  document.getElementById("selectAllBtn").addEventListener("click", function () {
    selectedCodes = categories.map(function (c) { return c.categoryCode; });
    setAllPressed(true);
    syncSelectionUI();
  });
  document.getElementById("clearAllBtn").addEventListener("click", function () {
    selectedCodes = [];
    setAllPressed(false);
    syncSelectionUI();
  });
  function setAllPressed(on) {
    Array.prototype.forEach.call(categoryGrid.querySelectorAll(".cat-pick"), function (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ------------------------------ 룰렛 그리기 ----------------------------- */
  // 12시=0도, 시계방향 기준의 각도를 SVG 좌표로 변환한다.
  function polar(radius, angleDeg) {
    var rad = (angleDeg - 90) * Math.PI / 180;
    return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
  }

  function slicePath(startDeg, endDeg) {
    var p0 = polar(R, startDeg);
    var p1 = polar(R, endDeg);
    var largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
    return "M " + CX + " " + CY +
      " L " + p0.x.toFixed(2) + " " + p0.y.toFixed(2) +
      " A " + R + " " + R + " 0 " + largeArc + " 1 " + p1.x.toFixed(2) + " " + p1.y.toFixed(2) + " Z";
  }

  function buildItems() {
    // 선택한 순서대로 룰렛 칸을 만든다.
    items = selectedCodes.map(function (code, i) {
      var c = categories.filter(function (x) { return x.categoryCode === code; })[0];
      return {
        categoryCode: code,
        categoryName: c ? c.categoryName : code,
        // 당첨 후 "내 주변 추천"에서 /api/restaurants/filter?categoryId=... 로 쓴다.
        categoryId: c ? c.categoryId : null,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      };
    });
  }

  function renderWheel() {
    var seg = 360 / items.length;
    var svgNs = "http://www.w3.org/2000/svg";
    // 칸이 많아질수록 한 칸의 폭이 좁아지므로("카페/디저트"처럼 긴 이름 기준) 글자를 줄인다.
    var fontSize = items.length >= 9 ? 11 : items.length >= 7 ? 12.5 : 14;
    wheelGroup.innerHTML = "";

    items.forEach(function (item, i) {
      var start = i * seg;
      var end = start + seg;
      var mid = start + seg / 2;

      var path = document.createElementNS(svgNs, "path");
      path.setAttribute("data-slice-index", String(i));   // 어느 칸인지 식별용(검증/디버깅에 사용)
      path.setAttribute("d", slicePath(start, end));
      path.setAttribute("fill", item.color);
      path.setAttribute("stroke", "#fff");
      path.setAttribute("stroke-width", "2");
      wheelGroup.appendChild(path);

      // 칸 이름 — 눕히지 않고 항상 가로로 세워 두며, 칸의 시각적 중앙(LABEL_R)에 배치한다.
      var labelPos = polar(LABEL_R, mid);
      var text = document.createElementNS(svgNs, "text");
      text.setAttribute("class", "wheel-label");
      text.setAttribute("x", labelPos.x.toFixed(2));
      text.setAttribute("y", labelPos.y.toFixed(2));
      text.setAttribute("font-size", String(fontSize));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.textContent = item.categoryName;
      wheelGroup.appendChild(text);
    });
  }

  // 룰렛을 새로 그릴 때는 회전각도 0으로 되돌린다. 애니메이션 없이 즉시 돌려놔야 해서
  // transition 클래스를 뗀 뒤 강제 리플로우로 값을 확정시킨다(안 그러면 되감기 애니메이션이 보임).
  function resetRotation() {
    wheelGroup.classList.remove("is-spinning");
    rotation = 0;
    wheelGroup.style.transform = "rotate(0deg)";
    wheelGroup.getBoundingClientRect();
  }

  /* -------------------------------- 스핀 --------------------------------- */
  function spin() {
    if (spinning || items.length < MIN_ITEMS) return;
    spinning = true;
    spinBtn.disabled = true;

    var seg = 360 / items.length;
    var winnerIndex = Math.floor(Math.random() * items.length);

    // 칸 정중앙에 딱 멈추면 부자연스러워서, 칸 폭의 ±35% 안에서 살짝 흔들어 준다.
    var jitter = (Math.random() - 0.5) * seg * 0.7;
    var targetAngle = winnerIndex * seg + seg / 2 + jitter;

    // 휠을 R도 돌리면 targetAngle은 (targetAngle + R)로 간다 → 포인터(0도)에 오려면 R ≡ -targetAngle.
    var targetMod = ((-targetAngle) % 360 + 360) % 360;
    var currentMod = ((rotation % 360) + 360) % 360;
    var delta = ((targetMod - currentMod) % 360 + 360) % 360;
    var turns = 5 + Math.floor(Math.random() * 3);   // 5~7바퀴

    rotation += turns * 360 + delta;
    lastWinner = items[winnerIndex];

    wheelGroup.classList.add("is-spinning");
    wheelGroup.style.transform = "rotate(" + rotation + "deg)";
  }

  wheelGroup.addEventListener("transitionend", function (e) {
    if (e.propertyName !== "transform" || !spinning) return;
    spinning = false;
    spinBtn.disabled = false;
    showResult();
  });

  // 애니메이션은 CSS class로 걸어두는데, 모달을 다시 열 때(respin) 같은 class가 이미 붙어있으면
  // 브라우저가 재생을 건너뛴다 — class를 뗐다가 강제 리플로우 후 다시 붙여서 매번 재생시킨다.
  function replayAnimation(el) {
    el.classList.remove("is-showing");
    void el.offsetWidth;
    el.classList.add("is-showing");
  }

  function showResult() {
    if (!lastWinner) return;
    document.getElementById("resultName").textContent = lastWinner.categoryName;
    document.getElementById("resultIcon").innerHTML =
      '<img src="' + markerUrl(lastWinner.categoryCode) + '" alt="">';

    replayAnimation(document.getElementById("resultModalPanel"));
    replayAnimation(document.getElementById("resultIcon"));

    // 칸이 2개일 때 하나를 더 빼면 룰렛이 성립하지 않으므로 그때는 "빼고 다시"를 감춘다.
    excludeBtn.hidden = items.length <= MIN_ITEMS;
    Eatty.openModal("resultModal");
    loadNearbyPick(lastWinner);
  }

  /* --------------------- 내 주변 추천(2026-08-07 추가) ---------------------
     당첨된 카테고리의 음식점 중 한 곳을 무작위로 하나만 보여준다. 07(음식점-메뉴-검색)의 기존
     GET /api/restaurants/filter를 그대로 재사용하고, 새 백엔드 API는 만들지 않는다.
     위치 권한 거부/미지원, 주변에 결과 없음, 호출 실패는 전부 "그냥 안 보여줌"으로 처리한다 —
     룰렛 자체(핵심 기능)를 막지 않기 위해서다. */
  var nearbyBox = document.getElementById("resultNearby");
  var nearbyCard = document.getElementById("resultNearbyCard");
  var nearbyNameEl = document.getElementById("resultNearbyName");
  var nearbyAddrEl = document.getElementById("resultNearbyAddr");
  var nearbyLabelEl = document.getElementById("resultNearbyLabel");
  var nearbyReqId = 0; // 다시 뽑기를 연타했을 때 예전 응답이 나중에 도착해 덮어쓰는 것 방지
  // 카테고리별로 이미 보여준 곳을 기억해뒀다가 다음엔 뺀다 — "계속 같은 곳만 추천된다"는 지적(2026-08-08)
  // 대응. 세션 동안만 유지(새로고침하면 초기화), 후보가 다 소진되면 그 카테고리만 비우고 다시 순환한다.
  var shownByCategory = {};

  function loadNearbyPick(winner) {
    if (!nearbyBox) return;
    nearbyBox.hidden = true;
    if (!winner || winner.categoryId == null || !navigator.geolocation) return;

    var reqId = ++nearbyReqId;
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      var d = 0.018; // 약 2km 반경의 바운딩 박스
      var qs = "categoryId=" + encodeURIComponent(winner.categoryId) +
        "&minLat=" + (lat - d) + "&maxLat=" + (lat + d) +
        "&minLng=" + (lng - d) + "&maxLng=" + (lng + d) +
        "&page=0&size=30";

      Api.request("/api/restaurants/filter?" + qs, { method: "GET", auth: false })
        .then(function (data) {
          if (reqId !== nearbyReqId) return; // 더 최신 요청이 있으면 이 응답은 버린다
          var list = (data && data.restaurants) || [];
          if (!list.length) return;

          var shown = shownByCategory[winner.categoryId] || (shownByCategory[winner.categoryId] = []);
          var fresh = list.filter(function (r) { return shown.indexOf(r.restaurantId) === -1; });
          if (!fresh.length) {
            // 후보를 다 보여줬으면 그 카테고리만 초기화하고 전체 목록에서 다시 고른다.
            shown.length = 0;
            fresh = list;
          }
          var picked = fresh[Math.floor(Math.random() * fresh.length)];
          shown.push(picked.restaurantId);

          renderNearbyPick(picked, winner);
        })
        .catch(function () {});
    }, function () { /* 위치 권한 거부 — 그냥 안 보여준다 */ }, { timeout: 8000, maximumAge: 300000 });
  }

  function renderNearbyPick(shop, winner) {
    nearbyLabelEl.textContent = "내 주변 " + winner.categoryName + " 추천";
    nearbyNameEl.textContent = shop.name || "";
    nearbyAddrEl.textContent = shop.roadAddress || shop.address || "";
    // 카카오는 place id 단건 재조회가 안 되므로, explore가 상세를 열 때 쓰는 값들을 쿼리로 함께 넘긴다
    // (explore.js의 openSharedRestaurant와 같은 규약).
    // category를 꼭 같이 넘겨야 한다 — 상세조회(GET /api/restaurants/{id})는 카카오 원본을 다시
    // 조회할 수 없어 category를 못 채워주기 때문에, 이 값을 빼먹으면 지도 마커가 카테고리별 아이콘이
    // 아니라 기본 마커로 떨어진다(explore.js openSharedRestaurant의 categoryQ).
    nearbyCard.href = "explore?shopId=" + encodeURIComponent(shop.restaurantId) +
      "&name=" + encodeURIComponent(shop.name || "") +
      "&category=" + encodeURIComponent(shop.category || winner.categoryName || "") +
      "&address=" + encodeURIComponent(shop.address || "") +
      "&roadAddress=" + encodeURIComponent(shop.roadAddress || "") +
      (shop.latitude != null ? "&latitude=" + shop.latitude : "") +
      (shop.longitude != null ? "&longitude=" + shop.longitude : "");
    nearbyBox.hidden = false;
  }

  /* ------------------------------ 화면 전환 ------------------------------ */
  buildRouletteBtn.addEventListener("click", function () {
    buildItems();
    renderWheel();
    resetRotation();
    setupSection.hidden = true;
    playSection.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    playSection.hidden = true;
    setupSection.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  spinBtn.addEventListener("click", spin);

  document.getElementById("respinBtn").addEventListener("click", function () {
    Eatty.closeModal("resultModal");
    spin();
  });

  excludeBtn.addEventListener("click", function () {
    if (!lastWinner || items.length <= MIN_ITEMS) return;
    // 당첨된 칸을 후보에서 빼고 룰렛을 다시 그린다(선택 목록에서도 함께 제거해 다음 화면과 어긋나지 않게).
    var code = lastWinner.categoryCode;
    items = items.filter(function (it) { return it.categoryCode !== code; });
    var si = selectedCodes.indexOf(code);
    if (si > -1) selectedCodes.splice(si, 1);
    var btn = categoryGrid.querySelector('[data-category-code="' + code + '"]');
    if (btn) btn.setAttribute("aria-pressed", "false");
    syncSelectionUI();

    renderWheel();
    resetRotation();
    Eatty.closeModal("resultModal");
    Eatty.toast(lastWinner.categoryName + "을(를) 뺐어요.", "default");
  });

  // ---- 이스터에그: 가운데 축(잇티) 7번 연속 클릭하면 얼굴 사진이 잠깐 나타남(2026-08-08) ----
  (function initHubEasterEgg() {
    var hub = document.getElementById("wheelHub");
    var hubText = document.getElementById("wheelHubText");
    var hubFace = document.getElementById("wheelHubFace");
    if (!hub || !hubText || !hubFace) return;

    var CLICKS_NEEDED = 7;
    var CLICK_WINDOW_MS = 3000;
    var REVEAL_MS = 2500;
    var clickTimes = [];
    var revealTimer = null;

    hub.addEventListener("click", function () {
      var now = Date.now();
      clickTimes.push(now);
      clickTimes = clickTimes.filter(function (t) { return now - t <= CLICK_WINDOW_MS; });

      hub.classList.remove("egg-pop");
      void hub.offsetWidth; // 리플로우로 애니메이션 재시작
      hub.classList.add("egg-pop");

      if (clickTimes.length >= CLICKS_NEEDED) {
        clickTimes = [];
        hubText.hidden = true;
        hubFace.hidden = false;
        clearTimeout(revealTimer);
        revealTimer = setTimeout(function () {
          hubFace.hidden = true;
          hubText.hidden = false;
        }, REVEAL_MS);
      }
    });
  })();

  loadCategories();
  syncSelectionUI();
})();
