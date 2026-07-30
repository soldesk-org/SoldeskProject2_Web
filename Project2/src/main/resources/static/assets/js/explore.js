(function () {
  var CATEGORY_MARKER = {
    "한식": "img/markers/marker-korean.png",
    "양식": "img/markers/marker-western.png",
    "중식": "img/markers/marker-chinese.png",
    "일식": "img/markers/marker-japanese.png",
    "분식": "img/markers/marker-snack.png",
    "패스트푸드": "img/markers/marker-fastfood.png",
    "아시안": "img/markers/marker-asian.png",
    "술집": "img/markers/marker-bar.png",
    "뷔페": "img/markers/marker-buffet.png",
    "카페/디저트": "img/markers/marker-cafe.png",
  };
  var DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 }; // 강남역

  var map = null;
  var markers = [];
  var selectedCategoryId = null;
  var priceMin = 0;
  var priceMax = 50000;
  var lastKeyword = "";
  var currentRestaurant = null;

  var detailPanel = document.getElementById("detail-panel");
  var searchAreaBtn = document.getElementById("search-area-btn");
  var categoryButtonsEl = document.getElementById("category-buttons");

  function categoryBtnClass(active) {
    return "h-[31px] rounded-[10px] px-4 text-[15px] font-medium transition-colors " +
      (active ? "bg-[rgba(255,109,34,0.8)] text-white" : "bg-[#eaeaea] text-black hover:bg-[#e0e0e0]");
  }

  function renderCategoryButtons(categories) {
    categoryButtonsEl.innerHTML = "";
    var all = document.createElement("button");
    all.textContent = "전체";
    all.className = categoryBtnClass(selectedCategoryId === null);
    all.addEventListener("click", function () { selectedCategoryId = null; renderCategoryButtons(categories); searchArea(); });
    categoryButtonsEl.appendChild(all);

    categories.filter(function (c) { return c.categoryName !== "그 외"; }).forEach(function (c) {
      var btn = document.createElement("button");
      btn.textContent = c.categoryName;
      btn.className = categoryBtnClass(selectedCategoryId === c.categoryId);
      btn.addEventListener("click", function () { selectedCategoryId = c.categoryId; renderCategoryButtons(categories); searchArea(); });
      categoryButtonsEl.appendChild(btn);
    });
  }

  function getBounds() {
    var b = map.getBounds();
    var sw = b.getSW();
    var ne = b.getNE();
    return {
      minLat: sw.lat(), maxLat: ne.lat(),
      minLng: sw.lng(), maxLng: ne.lng(),
    };
  }

  var DEFAULT_MARKER_ICON = {
    content:
      '<div style="width:27px;height:35px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));">' +
      '<svg width="27" height="35" viewBox="0 0 27 35" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M13.5 0C6.04 0 0 6.04 0 13.5 0 22.5 13.5 35 13.5 35S27 22.5 27 13.5C27 6.04 20.96 0 13.5 0Z" fill="#fd6d4a"/>' +
      '<circle cx="13.5" cy="13.5" r="5.5" fill="#ffffff"/>' +
      "</svg></div>",
    size: new naver.maps.Size(27, 35),
    anchor: new naver.maps.Point(13.5, 35),
  };

  function markerIcon(categoryName) {
    var url = CATEGORY_MARKER[categoryName];
    if (!url) return DEFAULT_MARKER_ICON;
    return { url: url, size: new naver.maps.Size(27, 35), scaledSize: new naver.maps.Size(27, 35) };
  }

  function clearMarkers() {
    markers.forEach(function (m) { m.setMap(null); });
    markers = [];
  }

  function renderMarkers(list) {
    clearMarkers();
    list.forEach(function (item) {
      if (item.latitude == null || item.longitude == null) return;
      var icon = markerIcon(item.category);
      var markerOptions = {
        position: new naver.maps.LatLng(item.latitude, item.longitude),
        map: map,
        title: item.name,
      };
      if (icon) markerOptions.icon = icon;
      var marker = new naver.maps.Marker(markerOptions);
      naver.maps.Event.addListener(marker, "click", function () { selectRestaurant(item); });
      markers.push(marker);
    });
  }

  function fetchList(path, params) {
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] !== null && params[k] !== undefined && params[k] !== ""; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");
    return Api.request(path + "?" + qs, { auth: true, method: "GET" });
  }

  function searchArea() {
    if (!map) return;
    var bounds = getBounds();
    searchAreaBtn.style.display = "none";
    fetchList("/api/restaurants/filter", {
      minLat: bounds.minLat, maxLat: bounds.maxLat, minLng: bounds.minLng, maxLng: bounds.maxLng,
      categoryId: selectedCategoryId, minPrice: priceMin > 0 ? priceMin : null, maxPrice: priceMax >= 50000 ? null : priceMax,
      page: 0, size: 50,
    })
      .then(function (data) { renderMarkers(data.restaurants || []); })
      .catch(function () {});
  }

  function searchKeyword(keyword) {
    lastKeyword = keyword;
    var bounds = map ? getBounds() : {};
    fetchList("/api/restaurants/search", {
      keyword: keyword,
      minLat: bounds.minLat, maxLat: bounds.maxLat, minLng: bounds.minLng, maxLng: bounds.maxLng,
      page: 0, size: 50,
    })
      .then(function (data) {
        renderMarkers(data.restaurants || []);
        if (data.restaurants && data.restaurants[0] && data.restaurants[0].latitude != null) {
          map.setCenter(new naver.maps.LatLng(data.restaurants[0].latitude, data.restaurants[0].longitude));
        }
      })
      .catch(function () {});
  }

  function starText(rating) {
    return "★ " + (rating != null ? Number(rating).toFixed(1) : "-");
  }

  function renderReviews(reviews) {
    if (!reviews || reviews.length === 0) return '<p class="text-[14px] font-medium text-[rgba(0,0,0,0.4)]">아직 등록된 리뷰가 없습니다.</p>';
    return reviews.slice(0, 5).map(function (r) {
      var keywords = (r.keywords || []).map(function (k) { return k.keyword; }).join(", ");
      return '<div class="rounded-[8px] bg-[#f7f7f7] p-3">' +
        '<div class="flex items-center justify-between">' +
        '<span class="text-[14px] font-semibold text-[#25374b]">' + escapeHtml(r.nickname) + '</span>' +
        '<span class="text-[13px] font-semibold text-[#fd6d4a]">' + starText(r.rating) + '</span>' +
        '</div>' +
        (keywords ? '<p class="mt-1 text-[13px] text-[rgba(0,0,0,0.5)]">' + escapeHtml(keywords) + '</p>' : "") +
        (r.content ? '<p class="mt-1 text-[14px] text-[rgba(0,0,0,0.7)]">' + escapeHtml(r.content) + '</p>' : "") +
        '</div>';
    }).join("");
  }

  function renderMenus(menus) {
    if (!menus || menus.length === 0) return '<p class="text-[14px] font-medium text-[rgba(0,0,0,0.4)]">등록된 메뉴 정보가 없습니다.</p>';
    return menus.map(function (m) {
      return '<div class="flex items-center justify-between">' +
        '<span class="text-[15px] font-medium text-[rgba(0,0,0,0.6)]">' + escapeHtml(m.name || m.menuName || "") + '</span>' +
        '<span class="text-[15px] font-semibold text-[rgba(0,0,0,0.6)]">' + (m.price != null ? Number(m.price).toLocaleString() + "원" : "") + '</span>' +
        '</div>';
    }).join("");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function selectRestaurant(item) {
    currentRestaurant = item;
    detailPanel.classList.remove("-translate-x-full");
    detailPanel.innerHTML =
      '<div class="relative mb-4 h-[180px] w-full overflow-hidden rounded-[10px]">' +
      (item.imageUrl ? '<img src="' + item.imageUrl + '" alt="' + escapeHtml(item.name) + '" class="size-full object-cover" />' : Api.photoPlaceholder) +
      '<button id="detail-close-btn" aria-label="닫기" class="absolute right-2 top-2 flex size-[28px] items-center justify-center rounded-full bg-white/90 text-[15px] text-[#25374b] shadow hover:bg-white">✕</button>' +
      "</div>" +
      '<div class="flex items-start justify-between gap-2">' +
      '<h2 class="text-[22px] font-semibold tracking-[-1px] text-[#25374b]">' + escapeHtml(item.name) + "</h2>" +
      '<button id="fav-btn" type="button" aria-label="즐겨찾기" class="shrink-0 text-[22px] leading-none text-[#fd6d4a]">' + (item.favorite ? "♥" : "♡") + "</button>" +
      "</div>" +
      '<p class="mt-1 text-[15px] font-medium text-[rgba(0,0,0,0.5)]">' + escapeHtml(item.category || "") + " · " + escapeHtml(item.roadAddress || item.address || "") + "</p>" +
      '<p class="mt-1 text-[14px] font-medium text-[rgba(0,0,0,0.5)]">' + starText(item.averageRating) + " (" + (item.reviewCount || 0) + "개 리뷰)</p>" +
      '<button id="directions-btn" class="mt-3 h-[40px] w-full rounded-[10px] bg-gradient-to-r from-[#fd6d4a] to-[#fea255] text-[15px] font-semibold text-white transition-opacity hover:opacity-90">길찾기</button>' +
      '<div id="directions-result" style="display:none" class="mt-2 flex items-stretch overflow-hidden rounded-[10px] border border-[rgba(253,109,74,0.25)] bg-[rgba(254,162,85,0.08)]"></div>' +
      '<div class="my-5 h-px w-full bg-[rgba(217,217,217,0.5)]"></div>' +
      '<h3 class="text-[16px] font-semibold text-black">메뉴</h3>' +
      '<div id="detail-menus" class="mt-3 flex flex-col gap-3"><p class="text-[14px] text-[rgba(0,0,0,0.4)]">불러오는 중...</p></div>' +
      '<div class="my-5 h-px w-full bg-[rgba(217,217,217,0.5)]"></div>' +
      '<div class="flex items-center justify-between">' +
      '<h3 class="text-[16px] font-semibold text-black">리뷰</h3>' +
      '<button id="write-review-btn" type="button" class="rounded-full bg-[rgba(253,109,74,0.1)] px-3 py-1.5 text-[13px] font-semibold text-[#fd6d4a] transition-colors hover:bg-[rgba(253,109,74,0.18)]">리뷰 작성</button>' +
      "</div>" +
      '<div id="detail-reviews" class="mt-3 flex flex-col gap-2"><p class="text-[14px] text-[rgba(0,0,0,0.4)]">불러오는 중...</p></div>' +
      '<div class="my-5 h-px w-full bg-[rgba(217,217,217,0.5)]"></div>' +
      '<h3 class="text-[16px] font-semibold text-black">주변 주차장</h3>' +
      '<div id="detail-parking" class="mt-3 flex flex-col gap-3"><p class="text-[14px] text-[rgba(0,0,0,0.4)]">불러오는 중...</p></div>';

    document.getElementById("fav-btn").addEventListener("click", function () { toggleFavorite(item); });
    document.getElementById("directions-btn").addEventListener("click", function () { showDirections(item); });
    document.getElementById("detail-close-btn").addEventListener("click", closeDetailPanel);
    document.getElementById("write-review-btn").addEventListener("click", function () { goToWriteReview(item); });

    var params = { name: item.name, address: item.address, roadAddress: item.roadAddress, latitude: item.latitude, longitude: item.longitude };
    fetchList("/api/restaurants/" + encodeURIComponent(item.restaurantId), params)
      .then(function (detail) {
        document.getElementById("detail-menus").innerHTML = renderMenus(detail.menus);
      })
      .catch(function () {});

    Api.request("/api/restaurants/" + encodeURIComponent(item.restaurantId) + "/reviews", { auth: false })
      .then(function (reviews) { document.getElementById("detail-reviews").innerHTML = renderReviews(reviews); })
      .catch(function () {});

    if (item.latitude != null && item.longitude != null) {
      Api.request("/api/parking-lots/nearby?latitude=" + item.latitude + "&longitude=" + item.longitude + "&radiusM=2000", { auth: false })
        .then(function (lots) { document.getElementById("detail-parking").innerHTML = renderParkingLots(lots); })
        .catch(function () {
          document.getElementById("detail-parking").innerHTML = '<p class="text-[14px] text-[rgba(0,0,0,0.4)]">주차장 정보를 불러오지 못했습니다.</p>';
        });
    } else {
      document.getElementById("detail-parking").innerHTML = '<p class="text-[14px] text-[rgba(0,0,0,0.4)]">주변 주차장 정보가 없습니다.</p>';
    }
  }

  function cleanParkingName(name) {
    return String(name == null ? "" : name).replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  }

  function renderParkingLots(lots) {
    if (!lots || lots.length === 0) return '<p class="text-[14px] font-medium text-[rgba(0,0,0,0.4)]">주변에 등록된 주차장이 없습니다.</p>';
    return lots.slice(0, 5).map(function (p) {
      var distText = p.distanceM < 1000 ? Math.round(p.distanceM) + "m" : (p.distanceM / 1000).toFixed(1) + "km";
      return '<div class="flex items-center justify-between gap-3 rounded-[8px] bg-[#f7f7f7] p-3">' +
        '<div class="min-w-0">' +
        '<p class="truncate text-[14px] font-semibold text-[#25374b]">' + escapeHtml(cleanParkingName(p.name)) + '</p>' +
        '<p class="mt-0.5 text-[12px] text-[rgba(0,0,0,0.5)]">' + escapeHtml(p.feeSummary || p.feeType || "") + (p.totalSpaces != null ? " · 총 " + p.totalSpaces + "면" : "") + '</p>' +
        '</div>' +
        '<span class="shrink-0 text-[13px] font-semibold text-[#fd6d4a]">' + distText + '</span>' +
        '</div>';
    }).join("");
  }

  function goToWriteReview(item) {
    if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
    var params = new URLSearchParams();
    params.set("restaurantId", item.restaurantId);
    params.set("name", item.name || "");
    if (item.address) params.set("address", item.address);
    if (item.roadAddress) params.set("roadAddress", item.roadAddress);
    if (item.latitude != null) params.set("latitude", item.latitude);
    if (item.longitude != null) params.set("longitude", item.longitude);
    window.location.href = "receipt-upload?" + params.toString();
  }

  function toggleFavorite(item) {
    if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
    var btn = document.getElementById("fav-btn");
    var method = item.favorite ? "DELETE" : "POST";
    btn.disabled = true;
    Api.request("/api/restaurants/" + encodeURIComponent(item.restaurantId) + "/favorite", {
      method: method,
      body: { name: item.name, address: item.address, roadAddress: item.roadAddress, latitude: item.latitude, longitude: item.longitude },
    })
      .then(function (res) {
        item.favorite = res.favorite;
        btn.textContent = item.favorite ? "♥" : "♡";
      })
      .catch(function (err) { window.alert(err.message || "즐겨찾기 처리에 실패했습니다."); })
      .finally(function () { btn.disabled = false; });
  }

  var directionsLine = null;
  function closeDetailPanel() {
    detailPanel.classList.add("-translate-x-full");
    currentRestaurant = null;
    if (directionsLine) { directionsLine.setMap(null); directionsLine = null; }
  }

  function directionsStat(label, value) {
    return '<div class="flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2.5">' +
      '<span class="text-[13px] font-semibold text-[#25374b]">' + escapeHtml(value) + '</span>' +
      '<span class="text-[11px] font-medium text-[rgba(37,55,75,0.5)]">' + escapeHtml(label) + '</span>' +
      '</div>';
  }
  function showDirectionsMessage(resultEl, msg) {
    resultEl.style.display = "";
    resultEl.innerHTML = '<p class="w-full px-3 py-2.5 text-[13px] font-medium text-[rgba(0,0,0,0.6)]">' + escapeHtml(msg) + '</p>';
  }

  function showDirections(item) {
    var resultEl = document.getElementById("directions-result");
    showDirectionsMessage(resultEl, "현재 위치 확인 중...");
    if (!navigator.geolocation) { showDirectionsMessage(resultEl, "이 브라우저는 위치 정보를 지원하지 않습니다."); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var startLat = pos.coords.latitude, startLng = pos.coords.longitude;
      Api.request("/api/directions?startLat=" + startLat + "&startLng=" + startLng + "&goalLat=" + item.latitude + "&goalLng=" + item.longitude, { auth: false })
        .then(function (data) {
          var km = (data.distanceM / 1000).toFixed(1);
          var min = Math.round(data.durationMs / 60000);
          var stats = [directionsStat("거리", km + "km"), directionsStat("소요시간", min + "분")];
          if (data.taxiFare) stats.push(directionsStat("택시요금", Number(data.taxiFare).toLocaleString() + "원"));
          resultEl.style.display = "";
          resultEl.innerHTML = stats.join('<div class="w-px shrink-0 bg-[rgba(253,109,74,0.2)]"></div>');
          if (directionsLine) directionsLine.setMap(null);
          var path = (data.path || []).map(function (p) { return new naver.maps.LatLng(p[1], p[0]); });
          directionsLine = new naver.maps.Polyline({ map: map, path: path, strokeColor: "#fd6d4a", strokeWeight: 4 });
          var bounds = new naver.maps.LatLngBounds();
          path.forEach(function (p) { bounds.extend(p); });
          map.fitBounds(bounds);
        })
        .catch(function (err) { showDirectionsMessage(resultEl, err.message || "길찾기 정보를 가져오지 못했습니다."); });
    }, function () { showDirectionsMessage(resultEl, "위치 정보를 가져올 수 없습니다."); });
  }

  function initPriceSlider() {
    var PRICE_MIN = 0, PRICE_MAX = 50000, PRICE_STEP = 1000;
    var min = PRICE_MIN, max = PRICE_MAX;
    var track = document.getElementById("price-track");
    var fill = document.getElementById("price-fill");
    var minHandle = document.getElementById("price-min-handle");
    var maxHandle = document.getElementById("price-max-handle");
    var label = document.getElementById("price-label");

    function pct(v) { return ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100; }
    function valueFromClientX(clientX) {
      var rect = track.getBoundingClientRect();
      var ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      var raw = PRICE_MIN + ratio * (PRICE_MAX - PRICE_MIN);
      return Math.round(raw / PRICE_STEP) * PRICE_STEP;
    }
    function render() {
      fill.style.left = pct(min) + "%";
      fill.style.right = 100 - pct(max) + "%";
      minHandle.style.left = pct(min) + "%";
      maxHandle.style.left = pct(max) + "%";
      label.textContent = min.toLocaleString() + "원 ~ " + max.toLocaleString() + "원" + (max >= PRICE_MAX ? " 이상" : "");
    }
    function startDrag(handle) {
      return function (e) {
        var target = e.currentTarget;
        target.setPointerCapture(e.pointerId);
        function onMove(ev) {
          var v = valueFromClientX(ev.clientX);
          if (handle === "min") min = Math.min(v, max - PRICE_STEP);
          else max = Math.max(v, min + PRICE_STEP);
          render();
        }
        function onUp() {
          target.releasePointerCapture(e.pointerId);
          target.removeEventListener("pointermove", onMove);
          target.removeEventListener("pointerup", onUp);
          priceMin = min; priceMax = max;
          searchArea();
        }
        target.addEventListener("pointermove", onMove);
        target.addEventListener("pointerup", onUp);
      };
    }
    minHandle.addEventListener("pointerdown", startDrag("min"));
    maxHandle.addEventListener("pointerdown", startDrag("max"));
    render();
  }

  function initMap(center) {
    map = new naver.maps.Map("naver-map", { center: new naver.maps.LatLng(center.lat, center.lng), zoom: 15 });
    naver.maps.Event.addListener(map, "dragend", function () { searchAreaBtn.style.display = ""; });
    naver.maps.Event.addListener(map, "zoom_changed", function () { searchAreaBtn.style.display = ""; });
    searchAreaBtn.addEventListener("click", searchArea);
    searchArea();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initPriceSlider();

    Api.request("/api/restaurants/categories", { auth: false })
      .then(function (categories) { renderCategoryButtons(categories || []); })
      .catch(function () { renderCategoryButtons([]); });

    var searchInput = document.getElementById("search-input");
    var searchBtn = document.getElementById("search-btn");
    searchBtn.addEventListener("click", function () {
      var kw = searchInput.value.trim();
      if (kw) searchKeyword(kw);
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") searchBtn.click();
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) { initMap({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        function () { initMap(DEFAULT_CENTER); }
      );
    } else {
      initMap(DEFAULT_CENTER);
    }
  });
})();
