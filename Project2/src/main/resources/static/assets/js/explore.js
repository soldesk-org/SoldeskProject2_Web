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

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function starsHtml(rating) {
    var r = Number(rating) || 0, html = "";
    for (var i = 1; i <= 5; i++) {
      html += '<svg viewBox="0 0 24 24" fill="currentColor" class="' + (i <= Math.round(r) ? "is-on" : "") + '">' +
        '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>';
    }
    return html;
  }

  var map = null;
  var markers = [];
  var resultsCache = [];
  var selectedCategoryId = null;
  var priceMin = 0, priceMax = 50000;
  var lastKeyword = "";
  var currentDetail = null;
  var directionsLine = null;

  var searchForm = document.getElementById("exploreSearchForm");
  var searchInput = document.getElementById("exploreSearchInput");
  var resultList = document.getElementById("resultList");
  var resultCount = document.getElementById("resultCount");
  var resultEmpty = document.getElementById("resultEmpty");
  var researchAreaBtn = document.getElementById("researchAreaBtn");
  var detailPanel = document.getElementById("shopDetailPanel");

  function getBounds() {
    var b = map.getBounds();
    var sw = b.getSW(), ne = b.getNE();
    return { minLat: sw.lat(), maxLat: ne.lat(), minLng: sw.lng(), maxLng: ne.lng() };
  }

  var DEFAULT_MARKER_ICON = {
    content:
      '<div style="width:27px;height:35px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">' +
      '<svg width="27" height="35" viewBox="0 0 27 35" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M13.5 0C6.04 0 0 6.04 0 13.5 0 22.5 13.5 35 13.5 35S27 22.5 27 13.5C27 6.04 20.96 0 13.5 0Z" fill="#fd6d4a"/>' +
      '<circle cx="13.5" cy="13.5" r="5.5" fill="#fff"/></svg></div>',
    size: new naver.maps.Size(27, 35),
    anchor: new naver.maps.Point(13.5, 35),
  };
  function markerIcon(categoryName) {
    var url = CATEGORY_MARKER[categoryName];
    if (!url) return DEFAULT_MARKER_ICON;
    return { url: url, size: new naver.maps.Size(27, 35), scaledSize: new naver.maps.Size(27, 35), anchor: new naver.maps.Point(13.5, 35) };
  }
  function clearMarkers() {
    markers.forEach(function (m) { m.setMap(null); });
    markers = [];
  }
  function renderMarkers(list) {
    clearMarkers();
    list.forEach(function (item) {
      if (item.latitude == null || item.longitude == null) return;
      var marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(item.latitude, item.longitude),
        map: map, title: item.name, icon: markerIcon(item.category),
      });
      naver.maps.Event.addListener(marker, "click", function () { openDetail(item); });
      markers.push(marker);
    });
  }

  function fetchList(path, params) {
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] !== null && params[k] !== undefined && params[k] !== ""; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");
    return Api.request(path + (qs ? "?" + qs : ""), { method: "GET" });
  }

  function distanceKmText(item) {
    return item.distanceKm != null ? (item.distanceKm < 1 ? Math.round(item.distanceKm * 1000) + "m" : item.distanceKm.toFixed(1) + "km") : "";
  }

  function renderResultCard(item) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "e-shop-card";
    btn.setAttribute("data-shop-id", item.restaurantId);
    var dist = distanceKmText(item);
    btn.innerHTML =
      '<span class="e-shop-thumb e-img-ph">' +
        (item.imageUrl ? '<img src="' + escapeHtml(item.imageUrl) + '" class="size-full object-cover" alt="">' :
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg>') +
      '</span>' +
      '<span class="min-w-0 flex-1">' +
        '<span class="flex items-center gap-2">' +
          '<b class="font-extrabold text-[15px] text-[var(--ink-900)] truncate">' + escapeHtml(item.name) + '</b>' +
          (item.category ? '<span class="e-badge e-badge--gray flex-none">' + escapeHtml(item.category) + '</span>' : "") +
        '</span>' +
        '<span class="e-rating mt-1">' + starsHtml(item.averageRating) +
          '<span class="e-rating-score">' + (item.averageRating != null ? Number(item.averageRating).toFixed(1) : "-") + '</span>' +
          '<span class="t-xs ml-1">(' + (item.reviewCount || 0) + ')</span>' +
        '</span>' +
        '<span class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">' +
          '<span class="t-xs">' + escapeHtml(dist ? dist + " · " : "") + escapeHtml(item.roadAddress || item.address || "") + '</span>' +
        '</span>' +
      '</span>';
    btn.addEventListener("click", function () { openDetail(item); });
    return btn;
  }

  function renderResults(list) {
    resultsCache = list;
    resultList.querySelectorAll(".e-shop-card").forEach(function (el) { el.remove(); });
    if (resultCount) resultCount.textContent = list.length;
    if (!list.length) {
      resultEmpty.hidden = false;
    } else {
      resultEmpty.hidden = true;
      var loadMoreBtn = document.getElementById("loadMoreBtn");
      list.forEach(function (item) {
        var card = renderResultCard(item);
        if (loadMoreBtn) resultList.insertBefore(card, loadMoreBtn);
        else resultList.appendChild(card);
      });
      var lm = document.getElementById("loadMoreBtn");
      if (lm) lm.hidden = true; // 서버가 페이지네이션 커서를 안 쓰는 방식이라 "더 보기"는 단순화해서 숨김
    }
    renderMarkers(list);
  }

  function searchArea() {
    if (!map) return;
    var bounds = getBounds();
    if (researchAreaBtn) researchAreaBtn.parentElement.style.display = "none";
    fetchList("/api/restaurants/filter", {
      minLat: bounds.minLat, maxLat: bounds.maxLat, minLng: bounds.minLng, maxLng: bounds.maxLng,
      categoryId: selectedCategoryId,
      minPrice: priceMin > 0 ? priceMin : null,
      maxPrice: priceMax >= 50000 ? null : priceMax,
      page: 0, size: 50,
    }).then(function (data) { renderResults(data.restaurants || []); }).catch(function () { renderResults([]); });
  }

  function searchKeyword(keyword) {
    lastKeyword = keyword;
    var bounds = map ? getBounds() : {};
    fetchList("/api/restaurants/search", {
      keyword: keyword,
      minLat: bounds.minLat, maxLat: bounds.maxLat, minLng: bounds.minLng, maxLng: bounds.maxLng,
      page: 0, size: 50,
    }).then(function (data) {
      renderResults(data.restaurants || []);
      var first = (data.restaurants || [])[0];
      if (first && first.latitude != null) map.setCenter(new naver.maps.LatLng(first.latitude, first.longitude));
    }).catch(function () { renderResults([]); });
  }

  // ---- 검색/필터 UI ----
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var kw = searchInput.value.trim();
      if (kw) searchKeyword(kw); else searchArea();
    });
  }
  var searchClearBtn = document.getElementById("searchClearBtn");
  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", function () { searchInput.value = ""; searchArea(); });
  }

  // 카테고리 칩 — 시안의 하드코딩된 영문 코드가 실제 categoryId/categoryCode와 맞지 않아서,
  // /api/restaurants/categories 응답으로 칩 자체를 새로 그린다.
  var categoryFilterList = document.getElementById("categoryFilterList");
  if (categoryFilterList) {
    var allBtn = categoryFilterList.querySelector('[data-category="all"]');
    Api.request("/api/restaurants/categories").then(function (categories) {
      (categories || []).forEach(function (c) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "e-chip";
        btn.setAttribute("data-category-id", c.categoryId);
        btn.setAttribute("data-toggle-press", "");
        btn.setAttribute("data-toggle-group", "category");
        btn.setAttribute("aria-pressed", "false");
        btn.textContent = c.categoryName;
        categoryFilterList.appendChild(btn);
      });
    }).catch(function () {});

    categoryFilterList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-category-id], [data-category='all']");
      if (!btn) return;
      selectedCategoryId = btn.hasAttribute("data-category-id") ? btn.getAttribute("data-category-id") : null;
      searchArea();
    });
  }
  var emptyFilterResetBtn = document.getElementById("emptyFilterResetBtn");
  if (emptyFilterResetBtn) emptyFilterResetBtn.addEventListener("click", function () { filterResetBtnEl().click(); });
  function filterResetBtnEl() { return document.getElementById("filterResetBtn"); }

  var priceFilterList = document.getElementById("priceFilterList");
  var filterMinPrice = document.getElementById("filterMinPrice");
  var filterMaxPrice = document.getElementById("filterMaxPrice");
  if (priceFilterList) {
    priceFilterList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-price]");
      if (!btn) return;
      priceMin = Number(btn.getAttribute("data-price-min") || 0);
      priceMax = Number(btn.getAttribute("data-price-max") || 50000);
      if (filterMinPrice) filterMinPrice.value = priceMin;
      if (filterMaxPrice) filterMaxPrice.value = priceMax;
      searchArea();
    });
  }

  var filterResetBtn = document.getElementById("filterResetBtn");
  if (filterResetBtn) {
    filterResetBtn.addEventListener("click", function () {
      selectedCategoryId = null; priceMin = 0; priceMax = 50000;
      searchInput.value = "";
      if (categoryFilterList) {
        categoryFilterList.querySelectorAll("[data-category-id], [data-category='all']").forEach(function (b) {
          b.setAttribute("aria-pressed", b.getAttribute("data-category") === "all" ? "true" : "false");
        });
      }
      document.querySelectorAll('[data-price]').forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-price") === "all" ? "true" : "false"); });
      searchArea();
    });
  }

  // "영업중만" 토글은 목록 단건마다 실시간 영업 상태를 계산할 API가 없어(목록 응답에 businessHours가
  // 없음) 실제로 필터링하지 못한다 — 지어낸 필터링을 하는 대신 있는 그대로 안내만 한다.
  var openNowSwitch = document.getElementById("openNowSwitch");
  if (openNowSwitch) {
    openNowSwitch.addEventListener("change", function () {
      if (openNowSwitch.checked) Eatty.toast("영업중 필터는 아직 지원되지 않습니다.", "default");
    });
  }
  // 정렬도 서버가 지원하는 정렬 기준이 다르므로, 받아온 결과를 클라이언트에서 재정렬한다.
  var sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      var v = sortSelect.value;
      var sorted = resultsCache.slice();
      if (v === "rating") sorted.sort(function (a, b) { return (b.averageRating || 0) - (a.averageRating || 0); });
      else if (v === "reviewCount") sorted.sort(function (a, b) { return (b.reviewCount || 0) - (a.reviewCount || 0); });
      else if (v === "distance") sorted.sort(function (a, b) { return (a.distanceKm || 999) - (b.distanceKm || 999); });
      renderResults(sorted);
    });
  }

  if (researchAreaBtn) researchAreaBtn.addEventListener("click", searchArea);
  var mapZoomInBtn = document.getElementById("mapZoomInBtn");
  var mapZoomOutBtn = document.getElementById("mapZoomOutBtn");
  if (mapZoomInBtn) mapZoomInBtn.addEventListener("click", function () { map.setZoom(map.getZoom() + 1); });
  if (mapZoomOutBtn) mapZoomOutBtn.addEventListener("click", function () { map.setZoom(map.getZoom() - 1); });
  var myLocationBtn = document.getElementById("myLocationBtn");
  if (myLocationBtn) {
    myLocationBtn.addEventListener("click", function () {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(function (pos) {
        map.setCenter(new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
      });
    });
  }

  // ---- 상세 패널 ----
  function renderMenus(menus) {
    var el = document.getElementById("detailTabMenu");
    if (!el) return;
    if (!menus || !menus.length) { el.innerHTML = '<p class="t-sm">등록된 메뉴 정보가 없습니다.</p>'; return; }
    el.innerHTML = '<div class="space-y-2.5">' + menus.map(function (m) {
      return '<div class="flex items-center justify-between"><span class="text-sm font-semibold text-[var(--ink-800)]">' + escapeHtml(m.name) + '</span>' +
        '<span class="text-sm font-bold text-[var(--ink-800)]">' + (m.price != null ? Number(m.price).toLocaleString() + "원" : "") + '</span></div>';
    }).join("") + '</div>';
  }

  function renderReviewsTab(reviews) {
    var el = document.getElementById("detailReviewList");
    if (!el) return;
    if (!reviews || !reviews.length) {
      el.innerHTML = '<li class="t-sm py-4 text-center">아직 등록된 리뷰가 없습니다.</li>';
    } else {
      el.innerHTML = reviews.slice(0, 20).map(function (r) {
        var keywords = (r.keywords || []).map(function (k) {
          return '<span class="e-tag ' + (k.sentiment === "NEGATIVE" ? "e-tag--neg" : "e-tag--pos") + '">' + escapeHtml(k.keyword) + '</span>';
        }).join("");
        return '<li class="pb-4 border-b border-[var(--line-soft)]">' +
          '<div class="flex items-center justify-between gap-2">' +
          '<span class="text-sm font-extrabold text-[var(--ink-900)]">' + escapeHtml(r.nickname) + '</span>' +
          '<span class="e-rating">' + starsHtml(r.rating) + '<span class="e-rating-score">' + Number(r.rating).toFixed(1) + '</span></span>' +
          '</div>' +
          (keywords ? '<div class="flex flex-wrap gap-1 mt-2">' + keywords + '</div>' : "") +
          '<p class="t-sm mt-2.5 leading-relaxed">' + escapeHtml(r.content) + '</p>' +
          '<button type="button" class="btn btn-ghost btn-xs mt-2" data-report-review="' + r.reviewId + '">🚩 신고</button>' +
          '</li>';
      }).join("");
    }

    el.querySelectorAll("[data-report-review]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
        reportTargetReviewId = btn.getAttribute("data-report-review");
        Eatty.openModal("reportModal");
      });
    });

    renderTagDistribution(reviews);
  }

  function renderTagDistribution(reviews) {
    var wrap = document.getElementById("detailTagDistWrap");
    var el = document.getElementById("detailTagDist");
    if (!wrap || !el) return;
    var counts = {};
    var total = 0;
    (reviews || []).forEach(function (r) {
      (r.keywords || []).forEach(function (k) {
        counts[k.keyword] = (counts[k.keyword] || 0) + 1;
        total++;
      });
    });
    var entries = Object.keys(counts).map(function (k) { return { keyword: k, count: counts[k] }; })
      .sort(function (a, b) { return b.count - a.count; }).slice(0, 5);
    if (!entries.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    var max = entries[0].count;
    el.innerHTML = entries.map(function (e) {
      var pct = Math.round((e.count / max) * 100);
      return '<div><div class="flex items-center justify-between mb-1">' +
        '<span class="t-xs font-bold text-[var(--ink-700)]">' + escapeHtml(e.keyword) + '</span>' +
        '<span class="t-xs t-num">' + e.count + '</span></div>' +
        '<div class="e-progress e-progress-sm"><div class="e-progress-bar" style="width:' + pct + '%"></div></div></div>';
    }).join("");
  }

  var reportTargetReviewId = null;
  var reportSubmitBtn = document.getElementById("reportSubmitBtn");
  if (reportSubmitBtn) {
    reportSubmitBtn.addEventListener("click", function () {
      var reason = document.getElementById("reportReasonSelect").value;
      var detail = document.getElementById("reportDetail").value.trim();
      if (!reason) { Eatty.toast("신고 사유를 선택해주세요.", "error"); return; }
      Api.request("/api/reviews/" + reportTargetReviewId + "/report", { method: "POST", body: { reasonCode: reason, detail: detail } })
        .then(function () { Eatty.closeModal("reportModal"); Eatty.toast("신고가 접수되었습니다.", "success"); })
        .catch(function (err) { Eatty.toast(err.message || "신고에 실패했습니다.", "error"); });
    });
  }

  function weekdayLabel(n) {
    return ["일", "월", "화", "수", "목", "금", "토"][n] || "";
  }
  function renderHours(businessHours) {
    if (!businessHours || !businessHours.length) return "영업시간 정보가 없습니다.";
    return businessHours.filter(function (h) { return !h.isClosed; }).map(function (h) {
      return weekdayLabel(h.dayOfWeek) + " " + (h.openTime || "") + "~" + (h.closeTime || "");
    }).join(" · ");
  }

  function openDetail(item) {
    currentDetail = item;
    detailPanel.classList.add("is-open");
    detailPanel.setAttribute("aria-hidden", "false");
    document.getElementById("directionsResult").hidden = true;
    if (directionsLine) { directionsLine.setMap(null); directionsLine = null; }
    var tagDistWrap = document.getElementById("detailTagDistWrap");
    if (tagDistWrap) tagDistWrap.hidden = true;

    document.getElementById("detailShopName").textContent = item.name;
    document.getElementById("detailCategory").textContent = item.category || "";
    document.getElementById("detailRating").innerHTML = starsHtml(item.averageRating) +
      '<span class="e-rating-score">' + (item.averageRating != null ? Number(item.averageRating).toFixed(1) : "-") + '</span>';
    document.getElementById("detailReviewCount").textContent = item.reviewCount || 0;
    document.getElementById("detailAddress").textContent = item.roadAddress || item.address || "";

    var favBtn = document.getElementById("favoriteBtn");
    favBtn.setAttribute("aria-pressed", item.favorite ? "true" : "false");
    favBtn.classList.toggle("is-active", !!item.favorite);

    var callBtn = document.getElementById("callBtn");
    var writeReviewBtn = document.getElementById("writeReviewBtn");
    if (writeReviewBtn) {
      var params = new URLSearchParams();
      params.set("restaurantId", item.restaurantId);
      params.set("name", item.name || "");
      if (item.address) params.set("address", item.address);
      if (item.roadAddress) params.set("roadAddress", item.roadAddress);
      if (item.latitude != null) params.set("latitude", item.latitude);
      if (item.longitude != null) params.set("longitude", item.longitude);
      writeReviewBtn.setAttribute("href", "receipt-upload?" + params.toString());
    }

    var shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.onclick = function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(window.location.origin + "/explore?shopId=" + item.restaurantId);
          Eatty.toast("링크를 복사했습니다.", "success");
        }
      };
    }

    Api.request("/api/restaurants/" + encodeURIComponent(item.restaurantId) +
      "?name=" + encodeURIComponent(item.name || "") +
      "&address=" + encodeURIComponent(item.address || "") +
      "&roadAddress=" + encodeURIComponent(item.roadAddress || "") +
      (item.latitude != null ? "&latitude=" + item.latitude : "") +
      (item.longitude != null ? "&longitude=" + item.longitude : ""))
      .then(function (detail) {
        document.getElementById("detailPhone").textContent = detail.phone || "정보 없음";
        document.getElementById("detailHours").textContent = renderHours(detail.businessHours);
        if (callBtn) callBtn.setAttribute("href", detail.phone ? "tel:" + detail.phone : "tel:");
        renderMenus(detail.menus);
      })
      .catch(function () {});

    Api.request("/api/restaurants/" + encodeURIComponent(item.restaurantId) + "/reviews", { auth: false })
      .then(renderReviewsTab)
      .catch(function () { renderReviewsTab([]); });

    if (item.latitude != null && item.longitude != null) {
      loadParking(item.latitude, item.longitude, 2000);
    }
  }

  document.getElementById("detailCloseBtn").addEventListener("click", function () {
    detailPanel.classList.remove("is-open");
    detailPanel.setAttribute("aria-hidden", "true");
    currentDetail = null;
    if (directionsLine) { directionsLine.setMap(null); directionsLine = null; }
  });

  document.getElementById("favoriteBtn").addEventListener("click", function () {
    if (!currentDetail) return;
    if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
    var btn = this;
    var item = currentDetail;
    var method = item.favorite ? "DELETE" : "POST";
    btn.disabled = true;
    Api.request("/api/restaurants/" + encodeURIComponent(item.restaurantId) + "/favorite", {
      method: method,
      body: { name: item.name, address: item.address, roadAddress: item.roadAddress, latitude: item.latitude, longitude: item.longitude },
    }).then(function (res) {
      item.favorite = res.favorite;
      btn.setAttribute("aria-pressed", item.favorite ? "true" : "false");
      btn.classList.toggle("is-active", !!item.favorite);
    }).catch(function (err) { Eatty.toast(err.message || "즐겨찾기 처리에 실패했습니다.", "error"); })
      .finally(function () { btn.disabled = false; });
  });

  // ---- 길찾기(자동차 경로만 실제 지원 — NCP Direction 5 한계) ----
  document.getElementById("directionBtn").addEventListener("click", function () {
    if (!currentDetail) return;
    var resultEl = document.getElementById("directionsResult");
    resultEl.hidden = false;
    document.getElementById("directionsLoading").hidden = false;
    document.getElementById("directionsBody").hidden = true;
    document.getElementById("directionsError").hidden = true;

    if (!navigator.geolocation) {
      document.getElementById("directionsLoading").hidden = true;
      document.getElementById("directionsError").hidden = false;
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      Api.request("/api/directions?startLat=" + pos.coords.latitude + "&startLng=" + pos.coords.longitude +
        "&goalLat=" + currentDetail.latitude + "&goalLng=" + currentDetail.longitude, { method: "GET" })
        .then(function (data) {
          document.getElementById("directionsLoading").hidden = true;
          document.getElementById("directionsBody").hidden = false;
          var km = (data.distanceM / 1000).toFixed(1);
          var min = Math.round(data.durationMs / 60000);
          document.getElementById("routeDuration").textContent = min + "분";
          document.getElementById("routeDistance").textContent = km + "km";
          document.getElementById("routeFare").textContent = data.taxiFare ? Number(data.taxiFare).toLocaleString() + "원(택시)" : "-";
          document.getElementById("routeSummary").textContent = "자동차 기준 경로입니다.";
          var extraWrap = document.getElementById("routeExtraWrap");
          if (extraWrap) extraWrap.hidden = true;

          if (directionsLine) directionsLine.setMap(null);
          var path = (data.path || []).map(function (p) { return new naver.maps.LatLng(p[1], p[0]); });
          if (path.length) {
            directionsLine = new naver.maps.Polyline({ map: map, path: path, strokeColor: "#fd6d4a", strokeWeight: 4 });
            var bounds = new naver.maps.LatLngBounds();
            path.forEach(function (p) { bounds.extend(p); });
            map.fitBounds(bounds);
          }
        })
        .catch(function () {
          document.getElementById("directionsLoading").hidden = true;
          document.getElementById("directionsError").hidden = false;
        });
    }, function () {
      document.getElementById("directionsLoading").hidden = true;
      document.getElementById("directionsError").hidden = false;
    });
  });

  // 대중교통/도보 경로는 실제로 지원하는 API가 없다(NCP Direction 5는 자동차 경로만 지원) — 자동차로
  // 안내하고, 다른 이동수단 버튼은 안내만 하도록 처리.
  var routeModeGroup = document.getElementById("routeModeGroup");
  if (routeModeGroup) {
    routeModeGroup.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-route-mode]");
      if (!btn) return;
      routeModeGroup.querySelectorAll("[data-route-mode]").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      if (btn.getAttribute("data-route-mode") !== "CAR") {
        Eatty.toast("현재는 자동차 경로만 지원합니다.", "default");
      }
    });
  }
  var directionsCloseBtn = document.getElementById("directionsCloseBtn");
  if (directionsCloseBtn) {
    directionsCloseBtn.addEventListener("click", function () {
      document.getElementById("directionsResult").hidden = true;
      if (directionsLine) { directionsLine.setMap(null); directionsLine = null; }
    });
  }

  // ---- 주변 주차장 ----
  function cleanParkingName(name) {
    return String(name == null ? "" : name).replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  }
  function loadParking(lat, lng, radiusM) {
    var listEl = document.getElementById("detailParking");
    if (!listEl) return;
    Api.request("/api/parking-lots/nearby?latitude=" + lat + "&longitude=" + lng + "&radiusM=" + radiusM, { auth: false })
      .then(function (lots) {
        var countBadge = document.getElementById("parkingCountBadge");
        if (countBadge) countBadge.textContent = (lots || []).length + "곳";
        if (!lots || !lots.length) {
          listEl.innerHTML = '<p class="t-sm">주변에 등록된 주차장이 없습니다.</p>';
          return;
        }
        listEl.innerHTML = lots.slice(0, 5).map(function (p) {
          var distText = p.distanceM < 1000 ? Math.round(p.distanceM) + "m" : (p.distanceM / 1000).toFixed(1) + "km";
          return '<div class="e-parking-item flex items-center justify-between gap-3 p-3 rounded-[var(--r)] bg-[var(--bg-soft)]">' +
            '<div class="min-w-0"><p class="text-sm font-bold text-[var(--ink-900)] truncate">' + escapeHtml(cleanParkingName(p.name)) + '</p>' +
            '<p class="t-xs mt-0.5">' + escapeHtml(p.feeSummary || p.feeType || "") + (p.totalSpaces != null ? " · 총 " + p.totalSpaces + "면" : "") + '</p></div>' +
            '<span class="t-xs font-bold text-[var(--brand-600)] flex-none">' + distText + '</span></div>';
        }).join("");
      })
      .catch(function () { listEl.innerHTML = '<p class="t-sm">주차장 정보를 불러오지 못했습니다.</p>'; });
  }
  var parkingRadiusSelect = document.getElementById("parkingRadiusSelect");
  if (parkingRadiusSelect) {
    parkingRadiusSelect.addEventListener("change", function () {
      if (currentDetail && currentDetail.latitude != null) loadParking(currentDetail.latitude, currentDetail.longitude, Number(parkingRadiusSelect.value));
    });
  }

  // ---- 지도 초기화 ----
  function initMap(center) {
    map = new naver.maps.Map("naverMap", { center: new naver.maps.LatLng(center.lat, center.lng), zoom: 15 });
    naver.maps.Event.addListener(map, "dragend", function () { if (researchAreaBtn) researchAreaBtn.parentElement.style.display = ""; });
    naver.maps.Event.addListener(map, "zoom_changed", function () { if (researchAreaBtn) researchAreaBtn.parentElement.style.display = ""; });
    searchArea();
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (pos) { initMap({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      function () { initMap(DEFAULT_CENTER); }
    );
  } else {
    initMap(DEFAULT_CENTER);
  }
})();
