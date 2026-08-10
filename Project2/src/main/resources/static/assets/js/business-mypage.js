(function () {
  if (!Api.requireRole("BUSINESS")) return;

  // "리뷰 반응" 탭(통계/태그 분포/별점 분포/최근 리뷰)은 2026-08-06에 실제 API로 연동됐다
  // (BusinessDashboardController — GET /api/business/me/stats, GET /api/business/me/reviews).
  // 매장 정보 수정/메뉴 관리/사진 관리 탭은 여전히 뒷받침하는 백엔드가 없다 — 카카오 로컬 API
  // 이용약관상 음식점 정보를 우리 DB에 저장/수정하지 않기로 확정했고(07 참고), 사업자 계정이
  // "내 매장"을 소유·관리하는 그 기능 자체가 아직 안 만들어졌다. 이번 범위는 리뷰 관련 수치만이라
  // 그 탭들은 손대지 않는다(안내 배너는 사용자 요청으로 제거).

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function formatDate(iso) {
    if (!iso) return "-";
    return String(iso).slice(0, 10);
  }
  function starsHtml(rating) {
    var html = "";
    for (var i = 1; i <= 5; i++) {
      html += '<svg viewBox="0 0 24 24" fill="currentColor" class="' + (i <= rating ? "is-on" : "") + '">' +
        '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>';
    }
    return html;
  }

  var els = {
    statReviewCount: document.getElementById("statReviewCount"),
    statAvgRating: document.getElementById("statAvgRating"),
    statFavoriteCount: document.getElementById("statFavoriteCount"),
    statVisitCert: document.getElementById("statVisitCert"),
    tabCount: document.getElementById("bizReviewTabCount"),
    tagRatioPositive: document.getElementById("tagRatioPositive"),
    tagRatioNegative: document.getElementById("tagRatioNegative"),
    ratioBarPositive: document.getElementById("ratioBarPositive"),
    ratioBarNegative: document.getElementById("ratioBarNegative"),
    positiveTagList: document.getElementById("positiveTagList"),
    negativeTagList: document.getElementById("negativeTagList"),
    ratingSummaryAvg: document.getElementById("ratingSummaryAvg"),
    ratingSummaryStars: document.getElementById("ratingSummaryStars"),
    ratingSummaryCount: document.getElementById("ratingSummaryCount"),
    ratingDistList: document.getElementById("ratingDistList"),
    reviewList: document.getElementById("bizReviewList"),
    reviewEmpty: document.getElementById("bizReviewEmpty"),
    loadMoreBtn: document.getElementById("bizReviewLoadMoreBtn")
  };
  if (!els.statReviewCount) return;

  var PAGE_SIZE = 5;
  var currentPage = 0;

  function loadStats() {
    Api.request("/api/business/me/stats").then(function (data) {
      els.statReviewCount.textContent = data.totalReviewCount;
      if (els.tabCount) els.tabCount.textContent = data.totalReviewCount;
      els.statAvgRating.textContent = data.totalReviewCount > 0 ? Number(data.avgRating || 0).toFixed(1) : "-";
      els.statFavoriteCount.textContent = data.favoriteCount;
      els.statVisitCert.textContent = data.visitCertThisMonth;
    }).catch(function (err) {
      if (err && err.code === "BUSINESS_RESTAURANT_NOT_CLAIMED") {
        els.statReviewCount.textContent = "0";
        if (els.tabCount) els.tabCount.textContent = "0";
        els.statAvgRating.textContent = "-";
        els.statFavoriteCount.textContent = "0";
        els.statVisitCert.textContent = "0";
        return;
      }
      Eatty.toast((err && err.message) || "매장 통계를 불러오지 못했습니다.", "error");
    });
  }

  function tagRowHtml(tag, maxCount, negative) {
    var pct = maxCount > 0 ? Math.max(6, Math.round(tag.count / maxCount * 100)) : 0;
    var barStyle = "width:" + pct + "%" + (negative ? ";background:var(--ink-400)" : "");
    return (
      '<div>' +
        '<div class="flex items-center justify-between mb-1">' +
          '<span class="t-xs font-bold text-[var(--ink-700)]">' + escapeHtml(tag.keyword) + '</span>' +
          '<span class="t-xs t-num">' + tag.count + '</span>' +
        '</div>' +
        '<div class="e-progress e-progress-sm"><div class="e-progress-bar" style="' + barStyle + '"></div></div>' +
      '</div>'
    );
  }

  function renderReviewSummary(data) {
    els.tagRatioPositive.textContent = data.positiveRatio;
    els.tagRatioNegative.textContent = data.negativeRatio;
    els.ratioBarPositive.style.width = data.positiveRatio + "%";
    els.ratioBarNegative.style.width = data.negativeRatio + "%";

    var posMax = data.positiveTags.length ? data.positiveTags[0].count : 0;
    els.positiveTagList.innerHTML = data.positiveTags.length
      ? data.positiveTags.map(function (t) { return tagRowHtml(t, posMax, false); }).join("")
      : '<p class="t-xs">아직 긍정 태그가 없습니다.</p>';

    var negMax = data.negativeTags.length ? data.negativeTags[0].count : 0;
    els.negativeTagList.innerHTML = data.negativeTags.length
      ? data.negativeTags.map(function (t) { return tagRowHtml(t, negMax, true); }).join("")
      : '<p class="t-xs">아직 개선 태그가 없습니다.</p>';

    var dist = data.ratingDistribution || {};
    var totalCount = [5, 4, 3, 2, 1].reduce(function (s, k) { return s + (dist[k] || 0); }, 0);
    var avg = totalCount > 0
      ? [5, 4, 3, 2, 1].reduce(function (s, k) { return s + k * (dist[k] || 0); }, 0) / totalCount
      : 0;
    els.ratingSummaryAvg.textContent = totalCount > 0 ? avg.toFixed(1) : "-";
    els.ratingSummaryStars.innerHTML = starsHtml(Math.round(avg));
    els.ratingSummaryCount.textContent = totalCount;

    els.ratingDistList.innerHTML = [5, 4, 3, 2, 1].map(function (score) {
      var count = dist[score] || 0;
      var pct = totalCount > 0 ? Math.round(count / totalCount * 100) : 0;
      var barColor = score <= 2 ? ";background:var(--ink-300)" : "";
      return (
        '<div class="flex items-center gap-2.5">' +
          '<span class="t-xs font-bold w-7 flex-none">' + score + '점</span>' +
          '<div class="e-progress e-progress-sm flex-1"><div class="e-progress-bar" style="width:' + pct + '%' + barColor + '"></div></div>' +
          '<span class="t-xs t-num w-9 text-right flex-none">' + count + '</span>' +
        '</div>'
      );
    }).join("");
  }

  function reportSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4h11l-1 3h6l-1 4 1 4h-8l1-3H4"/></svg>';
  }

  function renderReviewItemHtml(r) {
    var nickname = r.nickname || "탈퇴한 회원";
    var initial = nickname.charAt(0);
    var tagsHtml = (r.keywords || []).map(function (k) {
      var cls = k.sentiment === "NEGATIVE" ? "e-tag--neg" : "e-tag--pos";
      return '<span class="e-tag ' + cls + '">' + escapeHtml(k.keyword) + '</span>';
    }).join("");
    // 2026-08-10 추가 — 고객이 리뷰에 첨부한 사진을 사업자 마이페이지 리뷰 목록에도 노출.
    var imagesHtml = (r.images || []).map(function (img) {
      return '<img src="' + escapeHtml(img.imageUrl) + '" class="w-16 h-16 rounded-[var(--r-md)] object-cover flex-none" alt="리뷰 첨부 사진">';
    }).join("");
    // 작성자 프로필 사진(2026-08-10 추가) — 미설정이면 기존처럼 이니셜 아바타.
    var avatarHtml = r.profileImageUrl
      ? '<img src="' + escapeHtml(r.profileImageUrl) + '" class="e-avatar e-avatar-sm" alt="' + escapeHtml(nickname) + '">'
      : '<span class="e-avatar e-avatar-sm" aria-hidden="true">' + escapeHtml(initial) + '</span>';
    return (
      '<li class="pb-4 border-b border-[var(--line-soft)]">' +
        '<div class="flex items-center gap-2.5">' +
          avatarHtml +
          '<div class="min-w-0 flex-1">' +
            '<p class="text-[13.5px] font-bold text-[var(--ink-900)]">' + escapeHtml(nickname) + '</p>' +
            '<div class="flex items-center gap-2">' +
              '<span class="e-rating">' + starsHtml(r.rating) + '</span>' +
              '<span class="t-xs t-num">' + formatDate(r.createdAt) + '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-xs flex-none" data-report-review data-review-id="' + r.reviewId + '" data-modal-open="bizReportModal">' +
            reportSvg() + ' 신고' +
          '</button>' +
        '</div>' +
        (tagsHtml ? '<div class="flex flex-wrap gap-1.5 mt-3">' + tagsHtml + '</div>' : '') +
        (r.content ? '<p class="t-sm mt-2.5 leading-relaxed">' + escapeHtml(r.content) + '</p>' : '') +
        (imagesHtml ? '<div class="flex gap-2 mt-2.5 overflow-x-auto">' + imagesHtml + '</div>' : '') +
      '</li>'
    );
  }

  // 기간 필터(2026-08-10 실제 구현) — select box는 있었지만 그동안 API에 전달되지 않아 무시되고
  // 있었다. 값은 그대로 쿼리스트링에 실어 보낸다("1m"/"3m"/기본 옵션 없음 -> period 생략=전체 기간).
  var reviewPeriodSelect = document.getElementById("reviewPeriodSelect");

  function loadReviews(page, append) {
    var period = reviewPeriodSelect ? reviewPeriodSelect.value : "";
    var url = "/api/business/me/reviews?page=" + page + "&size=" + PAGE_SIZE
      + (period ? "&period=" + encodeURIComponent(period) : "");
    Api.request(url).then(function (data) {
      currentPage = page;
      if (!append) {
        renderReviewSummary(data);
        els.reviewList.innerHTML = "";
      }
      if (!data.reviews.length) {
        if (!append) els.reviewEmpty.hidden = false;
      } else {
        els.reviewEmpty.hidden = true;
        els.reviewList.insertAdjacentHTML("beforeend", data.reviews.map(renderReviewItemHtml).join(""));
      }
      els.loadMoreBtn.hidden = !data.hasMore;
    }).catch(function (err) {
      if (err && err.code === "BUSINESS_RESTAURANT_NOT_CLAIMED") {
        if (!append) {
          renderReviewSummary({ positiveTags: [], negativeTags: [], positiveRatio: 0, negativeRatio: 0, ratingDistribution: {} });
          els.reviewList.innerHTML = "";
          els.reviewEmpty.hidden = false;
        }
        els.loadMoreBtn.hidden = true;
        return;
      }
      Eatty.toast((err && err.message) || "리뷰를 불러오지 못했습니다.", "error");
    });
  }

  if (els.loadMoreBtn) {
    els.loadMoreBtn.addEventListener("click", function () {
      loadReviews(currentPage + 1, true);
    });
  }

  if (reviewPeriodSelect) {
    reviewPeriodSelect.addEventListener("change", function () { loadReviews(0, false); });
  }

  loadStats();
  loadReviews(0, false);

  // ------------------------------------------------------------------------
  // 매장 정보 탭 — 도로명주소 검색 + 지도 마커(2026-08-06 추가)
  // signup-business-info.js와 동일한 Juso 팝업/NCP Geocoding/네이버 지도 패턴을 그대로 재사용한다.
  // ------------------------------------------------------------------------
  var JUSO_CONFIRM_KEY = "U01TX0FVVEgyMDI2MDgwNDE0MTYwMzExOTkwNDA=";

  var zipcodeInput = document.getElementById("bizZipcode");
  var address1Input = document.getElementById("bizAddress1");
  var address2Input = document.getElementById("bizAddress2");
  var latInput = document.getElementById("bizShopLat");
  var lngInput = document.getElementById("bizShopLng");
  var mapArea = document.getElementById("bizMapArea");
  var addressBtn = document.getElementById("bizSearchAddressBtn");

  var bizMap = null;
  var bizMarker = null;
  var SHOP_MARKER_ICON = {
    url: "img/markers/marker-shop-location.png",
    size: new naver.maps.Size(32, 42),
    scaledSize: new naver.maps.Size(32, 42),
    anchor: new naver.maps.Point(16, 42)
  };

  function showOnMap(lat, lng) {
    if (!mapArea || typeof naver === "undefined") return;
    var position = new naver.maps.LatLng(lat, lng);
    if (!bizMap) {
      bizMap = new naver.maps.Map(mapArea, { center: position, zoom: 16 });
      bizMarker = new naver.maps.Marker({ position: position, map: bizMap, icon: SHOP_MARKER_ICON });
    } else {
      bizMap.setCenter(position);
      bizMarker.setPosition(position);
    }
  }

  function geocodeAndShow(address) {
    Api.request("/api/geocode?query=" + encodeURIComponent(address), { method: "GET", auth: false })
      .then(function (res) {
        if (latInput) latInput.value = res.latitude;
        if (lngInput) lngInput.value = res.longitude;
        showOnMap(res.latitude, res.longitude);
      })
      .catch(function (err) {
        Eatty.toast((err && err.message) || "주소의 좌표를 찾지 못했습니다. 지도에는 표시되지 않지만 주소는 그대로 저장됩니다.", "error");
      });
  }

  window.jusoCallBack = function (roadFullAddr, roadAddrPart1, addrDetail, roadAddrPart2, engAddr, jibunAddr, zipNo) {
    if (zipcodeInput) zipcodeInput.value = zipNo;
    if (address1Input) address1Input.value = roadAddrPart1;
    if (address2Input) {
      address2Input.value = addrDetail || "";
      address2Input.focus();
    }
    geocodeAndShow(roadFullAddr || roadAddrPart1);
  };

  if (addressBtn) {
    addressBtn.addEventListener("click", function () {
      var popup = window.open("about:blank", "jusoPopup", "width=570,height=420,scrollbars=yes");
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        Eatty.toast("팝업이 차단되었습니다. 브라우저 주소창의 팝업 차단 아이콘에서 허용한 뒤 다시 시도해주세요.", "error");
        return;
      }

      var form = document.createElement("form");
      form.method = "POST";
      form.action = "https://business.juso.go.kr/addrlink/addrLinkUrl.do";
      form.target = "jusoPopup";
      form.style.display = "none";

      function hidden(name, value) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      hidden("confmKey", JUSO_CONFIRM_KEY);
      hidden("returnUrl", window.location.origin + "/juso-callback");
      hidden("resultType", "4");

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    });
  }

  // 매장 정보 탭을 처음 열었을 때 지도가 빈 채로 보이던 문제(2026-08-06) — 주소 검색을 하기 전에도
  // 이미 입력칸에 있는 주소(실제 매장 주소 또는 기본값)를 곧바로 지도에 표시한다. 탭이 hidden 상태일
  // 때 네이버 지도를 초기화하면 컨테이너 크기를 못 잡아 깨지므로, 탭이 실제로 보이게 된 시점에 1회만 실행.
  var infoTabInitialized = false;
  document.querySelectorAll('[data-tab-target="bizTabInfo"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (infoTabInitialized) return;
      infoTabInitialized = true;
      setTimeout(function () {
        if (address1Input && address1Input.value.trim()) {
          geocodeAndShow(address1Input.value.trim());
        }
      }, 50);
    });
  });

  // ------------------------------------------------------------------------
  // 내 매장 restaurantId 확인 + "고객 화면으로 보기" 실제 링크(2026-08-06 추가)
  // explore.js의 기존 ?shopId= 딥링크 모드(공유하기 버튼과 동일한 방식)를 그대로 재사용 —
  // 그 매장 하나만 마커로 보여주고, 카테고리는 name을 넘기면 서버가 실시간으로 분류해준다.
  // ------------------------------------------------------------------------
  var state = { restaurantId: null };
  var viewPublicPageBtn = document.getElementById("viewPublicPageBtn");
  var claimRestaurantBtn = document.getElementById("claimRestaurantBtn");
  var shopNameText = document.getElementById("shopNameText");
  var shopAddressText = document.getElementById("shopAddressText");
  var shopBizNumberText = document.getElementById("shopBizNumberText");
  var shopCategoryText = document.getElementById("shopCategoryText");

  // 매장 헤더(상호명/주소/사업자등록번호)가 계정과 무관하게 항상 같은 고정 시안 값으로 보이던 문제
  // (2026-08-06) — business_profiles의 실제 값으로 채운다. 매장 카테고리는 우리 DB에 저장되지 않고
  // 카카오 검색 결과에서만 실시간으로 나오는 값이라(07 참고) 여기서는 보여줄 실데이터가 없어 숨긴다.
  function updateShopHeader(shop) {
    if (shopNameText) shopNameText.textContent = (shop && shop.businessName) || "연결된 매장이 없습니다";
    if (shopAddressText) shopAddressText.textContent = (shop && shop.businessAddress) || "";
    if (shopBizNumberText) {
      var digits = shop && shop.businessRegistrationNumber;
      shopBizNumberText.textContent = digits
        ? (digits.length === 10 ? digits.slice(0, 3) + "-" + digits.slice(3, 5) + "-" + digits.slice(5) : digits)
        : "-";
    }
    if (shopCategoryText) shopCategoryText.hidden = true;
    // 회원가입 시 자동귀속이 모호했던 계정을 위한 수동 연결 버튼(2026-08-07 추가) — 연결된 매장이
    // 없을 때만 보인다.
    var connected = !!(shop && shop.restaurantId);
    if (claimRestaurantBtn) claimRestaurantBtn.hidden = connected;
    // 2026-08-09 추가 — 연결된 매장이 없어도 "영업중" 배지가 고정 시안 값 그대로 항상 떠 있던 문제.
    // 실제로 영업중/휴업 상태를 서버에 저장하는 API가 아직 없어(이 파일 하단의 "시안 데모 스크립트"
    // 참고) 값 자체를 신뢰할 수 없는 상태라, 매장이 연결됐을 때만 배지를 보여주고 임시휴업 토글도
    // 함께 잠근다.
    var shopOpenStatusEl = document.getElementById("shopOpenStatus");
    var toggleOpenSwitchEl = document.getElementById("toggleOpenSwitch");
    if (shopOpenStatusEl) shopOpenStatusEl.hidden = !connected;
    if (toggleOpenSwitchEl) {
      var toggleLabel = toggleOpenSwitchEl.closest("label");
      if (toggleLabel) toggleLabel.hidden = !connected;
      toggleOpenSwitchEl.disabled = !connected;
    }
    // 2026-08-10 추가 — PATCH /api/restaurants/{id}/open로 실제 저장되는 값이므로 새로고침해도
    // 서버에 저장된 상태(shop.tempClosed) 그대로 배지/토글을 채운다.
    applyOpenStatus(connected && shop.tempClosed);
  }

  function applyOpenStatus(tempClosed) {
    var status = document.getElementById("shopOpenStatus");
    var toggle = document.getElementById("toggleOpenSwitch");
    if (toggle) toggle.checked = !!tempClosed;
    if (!status) return;
    if (tempClosed) {
      status.className = "e-status e-status--off";
      status.textContent = "임시 휴업";
    } else {
      status.className = "e-status e-status--on e-status--live";
      status.textContent = "영업중";
    }
  }

  // 임시 휴업 토글(2026-08-10 실연동) — 예전엔 화면 텍스트만 바꾸고 서버에 저장하지 않아 새로고침하면
  // 원래대로 돌아가고 고객 화면(지도 탐색)에도 전혀 반영되지 않던 "시안 데모"였다. 실패 시 토글을
  // 원래 상태로 되돌린다(낙관적 업데이트 롤백).
  var toggleOpenSwitchElReal = document.getElementById("toggleOpenSwitch");
  if (toggleOpenSwitchElReal) {
    toggleOpenSwitchElReal.addEventListener("change", function () {
      if (!state.restaurantId) return;
      var tempClosed = toggleOpenSwitchElReal.checked;
      applyOpenStatus(tempClosed);
      Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/open",
        { method: "PATCH", body: { tempClosed: tempClosed } })
        .then(function () {
          Eatty.toast(tempClosed ? "임시 휴업으로 전환했습니다. 고객 화면에 표시됩니다." : "영업중으로 전환했습니다.",
            tempClosed ? "default" : "success");
        })
        .catch(function (err) {
          applyOpenStatus(!tempClosed);
          Eatty.toast((err && err.message) || "저장에 실패했습니다.", "error");
        });
    });
  }

  function buildPublicPageUrl(lat, lng) {
    if (!state.restaurantId) return null;
    var params = new URLSearchParams();
    params.set("shopId", state.restaurantId);
    if (shopNameText) params.set("name", shopNameText.textContent.trim());
    if (shopAddressText) {
      params.set("address", shopAddressText.textContent.trim());
      params.set("roadAddress", shopAddressText.textContent.trim());
    }
    if (lat != null && lng != null) {
      params.set("latitude", lat);
      params.set("longitude", lng);
    }
    return "explore?" + params.toString();
  }

  function updatePublicPageLink() {
    if (!viewPublicPageBtn || !shopAddressText) return;
    Api.request("/api/geocode?query=" + encodeURIComponent(shopAddressText.textContent.trim()), { method: "GET", auth: false })
      .then(function (res) {
        viewPublicPageBtn.href = buildPublicPageUrl(res.latitude, res.longitude);
      })
      .catch(function () {
        viewPublicPageBtn.href = buildPublicPageUrl(null, null);
      });
  }

  // ------------------------------------------------------------------------
  // 메뉴 관리 탭(2026-08-06 추가) — 판매중지 메뉴도 함께 보여준다(OwnerMenuResponseDto).
  // ------------------------------------------------------------------------
  var menuList = document.getElementById("menuList");
  var menuEmpty = document.getElementById("menuEmpty");
  var menuTabCount = document.getElementById("bizMenuTabCount");
  var menuModalTitle = document.getElementById("menuModalTitle");
  var menuNameInput = document.getElementById("menuNameInput");
  var menuPriceInput = document.getElementById("menuPriceInput");
  var menuDescInput = document.getElementById("menuDescInput");
  var menuSignatureSwitch = document.getElementById("menuSignatureSwitch");
  var menuSaveBtn = document.getElementById("menuSaveBtn");
  var addMenuBtn = document.getElementById("addMenuBtn");
  var menuImageInput = document.getElementById("menuImageInput");
  var menuPhotoAddBtn = document.getElementById("menuPhotoAddBtn");
  var menuPhotoList = document.getElementById("menuPhotoList");
  var menuPhotoCount = document.getElementById("menuPhotoCount");
  var editingMenuId = null;
  var MENU_PHOTO_LIMIT = 3;
  // 메뉴 사진(2026-08-10, 최대 3장으로 재변경) — 리뷰 사진 피커(receipt-upload.js)와 동일한 구조.
  // existingMenuImages: 수정 모드에서 이미 서버에 저장돼 있는 사진(menuImageId 있음, 삭제 시 즉시 API 호출).
  // menuPhotoFiles: 아직 업로드 안 한 새로 고른 파일(저장 버튼 눌렀을 때 한꺼번에 업로드).
  var existingMenuImages = [];
  var menuPhotoFiles = [];

  function renderMenuPhotos() {
    menuPhotoList.querySelectorAll("[data-menu-photo]").forEach(function (el) { el.remove(); });
    existingMenuImages.forEach(function (img) {
      var item = document.createElement("div");
      item.className = "relative w-20 h-20 rounded-[var(--r-md)] overflow-hidden flex-none";
      item.setAttribute("data-menu-photo", "");
      item.innerHTML =
        '<img src="' + img.imageUrl + '" class="w-full h-full object-cover" alt="메뉴 사진">' +
        '<button type="button" class="absolute right-1 top-1 w-5 h-5 rounded-full bg-black/50 text-white grid place-items-center" data-remove-existing-photo="' + img.menuImageId + '" aria-label="사진 삭제">' +
          '<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>';
      menuPhotoList.insertBefore(item, menuPhotoAddBtn);
    });
    menuPhotoFiles.forEach(function (file, index) {
      var url = URL.createObjectURL(file);
      var item = document.createElement("div");
      item.className = "relative w-20 h-20 rounded-[var(--r-md)] overflow-hidden flex-none";
      item.setAttribute("data-menu-photo", "");
      item.innerHTML =
        '<img src="' + url + '" class="w-full h-full object-cover" alt="첨부할 메뉴 사진 미리보기">' +
        '<button type="button" class="absolute right-1 top-1 w-5 h-5 rounded-full bg-black/50 text-white grid place-items-center" data-remove-pending-photo="' + index + '" aria-label="사진 삭제">' +
          '<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>';
      menuPhotoList.insertBefore(item, menuPhotoAddBtn);
    });
    var total = existingMenuImages.length + menuPhotoFiles.length;
    if (menuPhotoCount) menuPhotoCount.textContent = total;
    if (menuPhotoAddBtn) menuPhotoAddBtn.hidden = total >= MENU_PHOTO_LIMIT;
  }

  if (menuPhotoAddBtn && menuImageInput) {
    menuPhotoAddBtn.addEventListener("click", function () { menuImageInput.click(); });
    menuImageInput.addEventListener("change", function () {
      var picked = Array.prototype.slice.call(menuImageInput.files || []);
      var room = MENU_PHOTO_LIMIT - existingMenuImages.length - menuPhotoFiles.length;
      if (picked.length > room) {
        Eatty.toast("사진은 최대 " + MENU_PHOTO_LIMIT + "장까지 첨부할 수 있어요.", "error");
      }
      menuPhotoFiles = menuPhotoFiles.concat(picked.slice(0, room));
      menuImageInput.value = "";
      renderMenuPhotos();
    });
  }
  if (menuPhotoList) {
    menuPhotoList.addEventListener("click", function (e) {
      var pendingBtn = e.target.closest("[data-remove-pending-photo]");
      if (pendingBtn) {
        menuPhotoFiles.splice(Number(pendingBtn.getAttribute("data-remove-pending-photo")), 1);
        renderMenuPhotos();
        return;
      }
      var existingBtn = e.target.closest("[data-remove-existing-photo]");
      if (existingBtn) {
        if (!state.restaurantId || !editingMenuId) return;
        var menuImageId = existingBtn.getAttribute("data-remove-existing-photo");
        Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/menus/" + editingMenuId + "/images/" + menuImageId,
          { method: "DELETE" })
          .then(function () {
            existingMenuImages = existingMenuImages.filter(function (img) { return String(img.menuImageId) !== menuImageId; });
            renderMenuPhotos();
            loadMenus();
          })
          .catch(function (err) { Eatty.toast((err && err.message) || "사진 삭제에 실패했습니다.", "error"); });
      }
    });
  }

  function menuItemHtml(m) {
    var thumbHtml = m.imageUrl
      ? '<img src="' + escapeHtml(m.imageUrl) + '" class="w-full h-full object-cover" alt="' + escapeHtml(m.menuName) + ' 사진">'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg>';
    return (
      '<li class="e-file-item" data-menu-id="' + m.menuId + '">' +
        // e-shop-thumb는 이 정도 작은 썸네일에서 "NO IMAGE" 플레이스홀더 글자가 커지도록 하는 기존
        // 클래스(eatty.css)를 그대로 재사용(2026-08-10 — 박스 크기는 그대로 두고 글자만 키워달라는 요청).
        '<span class="w-14 h-14 rounded-[10px] e-img-ph e-shop-thumb flex-none overflow-hidden">' +
          thumbHtml +
        '</span>' +
        '<div class="min-w-0 flex-1">' +
          '<div class="flex items-center gap-2">' +
            '<p class="text-sm font-extrabold text-[var(--ink-900)]">' + escapeHtml(m.menuName) + '</p>' +
            (m.signature ? '<span class="e-badge e-badge--brand-solid flex-none">시그니처</span>' : "") +
            (!m.available ? '<span class="e-badge e-badge--gray flex-none">판매중지</span>' : "") +
          '</div>' +
          (m.description ? '<p class="t-xs mt-1">' + escapeHtml(m.description) + '</p>' : "") +
        '</div>' +
        '<span class="text-sm font-extrabold text-[var(--ink-900)] t-num flex-none">' + Number(m.price).toLocaleString() + '원</span>' +
        '<div class="flex gap-1 flex-none">' +
          '<button type="button" class="e-icon-btn !w-8 !h-8" data-edit-menu data-modal-open="menuModal" aria-label="메뉴 수정">' +
            '<svg style="width:15px;height:15px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.2 3.5a2.1 2.1 0 0 1 3 3L7.5 14.2l-3.8 1 1-3.8 7.5-7.9Z"/><path d="M20 21H4"/></svg>' +
          '</button>' +
          '<button type="button" class="e-icon-btn !w-8 !h-8 hover:!text-[var(--danger)]" data-delete-menu aria-label="메뉴 삭제">' +
            '<svg style="width:15px;height:15px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg>' +
          '</button>' +
        '</div>' +
      '</li>'
    );
  }

  var menuCache = [];

  function loadMenus() {
    if (!state.restaurantId) return Promise.resolve([]);
    return Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/menus/mine").then(function (menus) {
      menuCache = menus;
      if (menuTabCount) menuTabCount.textContent = menus.length;
      menuList.innerHTML = "";
      if (!menus.length) {
        menuEmpty.hidden = false;
        return menus;
      }
      menuEmpty.hidden = true;
      menuList.insertAdjacentHTML("beforeend", menus.map(menuItemHtml).join(""));
      return menus;
    }).catch(function (err) {
      if (menuTabCount) menuTabCount.textContent = "0";
      Eatty.toast((err && err.message) || "메뉴를 불러오지 못했습니다.", "error");
      return [];
    });
  }

  if (addMenuBtn) {
    addMenuBtn.addEventListener("click", function () {
      editingMenuId = null;
      menuModalTitle.textContent = "메뉴 추가";
      menuNameInput.value = "";
      menuPriceInput.value = "";
      menuDescInput.value = "";
      menuSignatureSwitch.checked = false;
      if (menuImageInput) menuImageInput.value = "";
      existingMenuImages = [];
      menuPhotoFiles = [];
      renderMenuPhotos();
    });
  }

  // 리뷰 신고(2026-08-10 실제 연결) — 예전엔 data-demo-toast로 "접수됨" 토스트만 띄우고 실제 API 호출이
  // 없던 가짜 버튼이었다. explore.js 고객용 신고 모달과 동일한 패턴(POST /api/reviews/{id}/report).
  var bizReportTargetReviewId = null;
  if (els.reviewList) {
    els.reviewList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-report-review]");
      if (!btn) return;
      bizReportTargetReviewId = btn.getAttribute("data-review-id");
    });
  }
  var bizReportSubmitBtn = document.getElementById("bizReportSubmitBtn");
  if (bizReportSubmitBtn) {
    bizReportSubmitBtn.addEventListener("click", function () {
      var reason = document.getElementById("bizReportReason").value;
      var detail = document.getElementById("bizReportDetail").value.trim();
      if (!reason) { Eatty.toast("신고 사유를 선택해주세요.", "error"); return; }
      if (!bizReportTargetReviewId) return;
      Api.request("/api/reviews/" + bizReportTargetReviewId + "/report", { method: "POST", body: { reasonCode: reason, detail: detail } })
        .then(function () { Eatty.closeModal("bizReportModal"); Eatty.toast("신고가 접수되었습니다.", "success"); })
        .catch(function (err) { Eatty.toast((err && err.message) || "신고에 실패했습니다.", "error"); });
    });
  }

  if (menuList) {
    menuList.addEventListener("click", function (e) {
      var editBtn = e.target.closest("[data-edit-menu]");
      if (editBtn) {
        var id = Number(editBtn.closest("[data-menu-id]").getAttribute("data-menu-id"));
        var menu = menuCache.filter(function (m) { return m.menuId === id; })[0];
        if (!menu) return;
        editingMenuId = id;
        menuModalTitle.textContent = "메뉴 수정";
        menuNameInput.value = menu.menuName;
        menuPriceInput.value = menu.price;
        menuDescInput.value = menu.description || "";
        menuSignatureSwitch.checked = !!menu.isSignature;
        if (menuImageInput) menuImageInput.value = "";
        existingMenuImages = (menu.images || []).slice();
        menuPhotoFiles = [];
        renderMenuPhotos();
        return;
      }
      var delBtn = e.target.closest("[data-delete-menu]");
      if (delBtn) {
        var delId = Number(delBtn.closest("[data-menu-id]").getAttribute("data-menu-id"));
        if (!state.restaurantId) return;
        Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/menus/" + delId, { method: "DELETE" })
          .then(function () { Eatty.toast("메뉴를 삭제했습니다."); loadMenus(); })
          .catch(function (err) { Eatty.toast((err && err.message) || "메뉴 삭제에 실패했습니다.", "error"); });
      }
    });
  }

  if (menuSaveBtn) {
    menuSaveBtn.addEventListener("click", function () {
      var menuName = menuNameInput.value.trim();
      var price = Number(String(menuPriceInput.value).replace(/[^0-9]/g, ""));
      if (!menuName) { Eatty.toast("메뉴명을 입력해주세요.", "error"); return; }
      if (!price) { Eatty.toast("가격을 입력해주세요.", "error"); return; }
      if (!state.restaurantId) { Eatty.toast("매장 정보를 먼저 확인해주세요.", "error"); return; }

      var body = {
        menuName: menuName,
        price: price,
        description: menuDescInput.value.trim(),
        isSignature: menuSignatureSwitch.checked
      };
      var previousIds = menuCache.map(function (m) { return m.menuId; });
      var request = editingMenuId
        ? Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/menus/" + editingMenuId,
            { method: "PATCH", body: Object.assign({}, body, { isAvailable: true }) })
        : Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/menus", { method: "POST", body: body });

      // 메뉴 등록 시점부터 사진 첨부 가능(2026-08-10 변경) — 등록 후 썸네일을 따로 눌러 올리던 방식에서,
      // 모달에서 고른 파일이 있으면 메뉴 저장 직후 이어서 업로드하도록 변경. 생성(POST)은 응답이 메뉴
      // 단건이 아니라 매장 상세 전체라 새로 만들어진 menuId를 직접 못 받으므로, loadMenus()로 다시
      // 받아온 목록을 이전 id 목록과 비교해서 새로 생긴 id를 찾는다.
      var pendingFiles = menuPhotoFiles.slice();
      request.then(function () {
        return loadMenus();
      }).then(function (menus) {
        if (!pendingFiles.length) {
          Eatty.closeModal("menuModal");
          Eatty.toast("메뉴를 저장했습니다.", "success");
          return;
        }
        var targetId = editingMenuId || (menus.filter(function (m) { return previousIds.indexOf(m.menuId) === -1; })[0] || {}).menuId;
        if (!targetId) {
          Eatty.closeModal("menuModal");
          Eatty.toast("메뉴는 저장했지만 사진 등록 대상을 찾지 못했습니다.", "error");
          return;
        }
        var formData = new FormData();
        pendingFiles.forEach(function (file) { formData.append("images", file); });
        return Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/menus/" + targetId + "/images",
          { method: "POST", body: formData, isForm: true })
          .then(function () {
            Eatty.closeModal("menuModal");
            Eatty.toast("메뉴를 저장했습니다.", "success");
            return loadMenus();
          })
          .catch(function (err) {
            Eatty.closeModal("menuModal");
            Eatty.toast("메뉴는 저장했지만 사진 등록에 실패했습니다: " + ((err && err.message) || "알 수 없는 오류"), "error");
          });
      }).catch(function (err) {
        Eatty.toast((err && err.message) || "메뉴 저장에 실패했습니다.", "error");
      });
    });
  }

  // ------------------------------------------------------------------------
  // 사진 관리 탭(2026-08-06 추가) — 최대 4장, 실제 등록한 사진만 노출.
  // ------------------------------------------------------------------------
  var photoGrid = document.getElementById("photoGrid");
  var photoTabCount = document.getElementById("bizPhotoTabCount");
  var photoDrop = document.getElementById("photoDrop");
  var photoInput = document.getElementById("photoInput");
  var shopMainImageBox = document.getElementById("shopMainImageBox");
  var PHOTO_LIMIT = 4;

  // 매장 헤더의 "대표 이미지" 박스 — 사진 관리 탭에서 대표로 지정한 사진을 실제로 보여준다(2026-08-06).
  function updateShopMainImage(url) {
    if (!shopMainImageBox) return;
    if (url) {
      shopMainImageBox.innerHTML = '<img src="' + url + '" class="w-full h-full object-cover" alt="매장 대표 이미지">';
    } else {
      shopMainImageBox.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg>' +
        '<span class="e-img-ph-label">대표 이미지</span>';
    }
  }

  function photoItemHtml(img) {
    return (
      '<div class="relative e-ratio-4-3 rounded-[var(--r-md)] overflow-hidden' + (img.main ? "" : "") + '" data-photo-id="' + img.imageId + '">' +
        '<img src="' + img.imageUrl + '" class="w-full h-full object-cover" alt="매장 사진">' +
        (img.main
          ? '<span class="absolute left-2 top-2 e-badge e-badge--brand-solid !text-[10px] !px-2 !py-0.5">대표</span>'
          : '<button type="button" class="absolute left-2 top-2 btn btn-white btn-xs" data-set-main-photo>대표로</button>') +
        '<button type="button" class="absolute right-2 top-2 w-7 h-7 rounded-full bg-black/50 text-white grid place-items-center" data-delete-photo aria-label="사진 삭제">' +
          '<svg style="width:13px;height:13px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>'
    );
  }

  function loadPhotos() {
    if (!state.restaurantId) return;
    Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/images").then(function (images) {
      if (photoTabCount) photoTabCount.textContent = images.length;
      photoGrid.innerHTML = images.map(photoItemHtml).join("");
      if (photoDrop) photoDrop.hidden = images.length >= PHOTO_LIMIT;
      var mainImage = images.filter(function (img) { return img.main; })[0];
      updateShopMainImage(mainImage ? mainImage.imageUrl : null);
    }).catch(function (err) {
      if (photoTabCount) photoTabCount.textContent = "0";
      Eatty.toast((err && err.message) || "사진을 불러오지 못했습니다.", "error");
    });
  }

  function uploadPhoto(file) {
    if (!state.restaurantId) {
      Eatty.toast("연결된 매장이 없어 사진을 등록할 수 없습니다.", "error");
      return;
    }
    var formData = new FormData();
    formData.append("image", file);
    Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/images",
      { method: "POST", body: formData, isForm: true })
      .then(function () { Eatty.toast("사진을 등록했습니다.", "success"); loadPhotos(); })
      .catch(function (err) { Eatty.toast((err && err.message) || "사진 등록에 실패했습니다.", "error"); });
  }

  if (photoDrop && photoInput) {
    photoDrop.addEventListener("eatty:filepicked", function () {
      var file = photoInput.files && photoInput.files[0];
      if (!file) return;
      uploadPhoto(file);
      photoInput.value = "";
    });
  }

  if (photoGrid) {
    photoGrid.addEventListener("click", function (e) {
      var item = e.target.closest("[data-photo-id]");
      if (!item || !state.restaurantId) return;
      var imageId = item.getAttribute("data-photo-id");
      if (e.target.closest("[data-set-main-photo]")) {
        Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/images/" + imageId + "/main", { method: "PATCH" })
          .then(function () { Eatty.toast("대표 이미지로 변경했습니다.", "success"); loadPhotos(); })
          .catch(function (err) { Eatty.toast((err && err.message) || "대표 지정에 실패했습니다.", "error"); });
        return;
      }
      if (e.target.closest("[data-delete-photo]")) {
        Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/images/" + imageId, { method: "DELETE" })
          .then(function () { Eatty.toast("사진을 삭제했습니다."); loadPhotos(); })
          .catch(function (err) { Eatty.toast((err && err.message) || "사진 삭제에 실패했습니다.", "error"); });
      }
    });
  }

  // ------------------------------------------------------------------------
  // 매장 정보 탭 — 전화번호/영업시간만 실제 API로 저장(2026-08-06). 매장이 처음 귀속된 시점엔
  // 둘 다 비어있고(지어낸 기본값 없음), 사업자가 이 폼에서 실제로 저장해야 채워지는 흐름이다.
  // 나머지 필드(매장명/카테고리/가격대/주소/편의시설/소개)는 저장 API가 없어 화면에만 반영된다
  // (카카오 데이터를 우리 DB에 저장하지 않는다는 원칙, 07 참고 — 이름/주소는 애초에 우리 게 아니다).
  // ------------------------------------------------------------------------
  var DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  var bizInfoForm = document.getElementById("bizInfoForm");
  var bizShopPhoneInput = document.getElementById("bizShopPhone");
  // 전화번호 자동 하이픈(2026-08-10 추가, 2026-08-10 대표번호 보강) — 자릿수/접두사에 맞춰 입력 중
  // 자동으로 "-"를 넣는다. 커서 위치는 보정하지 않는 단순 구현(끝에서 입력하는 일반적인 사용 패턴 기준).
  //   - 1544/1588/1600/1644/1666... 같은 "1"로 시작하는 8자리 대표번호: 지역번호 없이 XXXX-XXXX
  //   - 02(서울): 2자리 지역번호
  //   - 050X(0503~0509, 평생번호/안심번호): 4자리 식별번호, 총 12자리(XXXX-XXXX-XXXX)
  //   - 010/011/016~019, 031~064, 070 등: 3자리 지역/식별번호
  function formatPhoneNumber(value) {
    var digits = (value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits[0] !== "0") {
      // 지역번호 없는 대표번호(1544, 1588, 1600, 1644 등) — 0으로 시작하지 않는 전화번호는 이 형태뿐이다.
      digits = digits.slice(0, 8);
      return digits.length <= 4 ? digits : digits.slice(0, 4) + "-" + digits.slice(4);
    }
    if (digits.startsWith("02")) {
      digits = digits.slice(0, 10);
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return digits.slice(0, 2) + "-" + digits.slice(2);
      if (digits.length <= 9) return digits.slice(0, 2) + "-" + digits.slice(2, 5) + "-" + digits.slice(5);
      return digits.slice(0, 2) + "-" + digits.slice(2, 6) + "-" + digits.slice(6, 10);
    }
    if (/^050\d/.test(digits)) {
      // 0505(평생번호)뿐 아니라 0503/0504/0506~0509(안심번호 등) 전부 같은 4자리 접두사 형식.
      digits = digits.slice(0, 12);
      if (digits.length <= 4) return digits;
      if (digits.length <= 8) return digits.slice(0, 4) + "-" + digits.slice(4);
      return digits.slice(0, 4) + "-" + digits.slice(4, 8) + "-" + digits.slice(8, 12);
    }
    digits = digits.slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + "-" + digits.slice(3);
    if (digits.length <= 10) return digits.slice(0, 3) + "-" + digits.slice(3, 6) + "-" + digits.slice(6);
    return digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7, 11);
  }
  if (bizShopPhoneInput) {
    bizShopPhoneInput.addEventListener("input", function () {
      bizShopPhoneInput.value = formatPhoneNumber(bizShopPhoneInput.value);
    });
  }
  var bizOpenTimeInput = document.getElementById("bizOpenTime");
  var bizCloseTimeInput = document.getElementById("bizCloseTime");
  var bizShopNameInput = document.getElementById("bizShopName");
  var bizAddress1Input = document.getElementById("bizAddress1");
  var bizIntroInput = document.getElementById("bizIntro");
  var bizPriceRangeInput = document.getElementById("bizPriceRange");

  function fillShopInfoForm(shop) {
    // 2026-08-09 추가 — 매장명/주소는 저장 API가 없어(카카오 데이터, 07 참고) 읽기 전용으로 실데이터만
    // 보여준다. 헤더에 이미 나온 값과 같아서 "매장 정보" 탭에 고정 시안값이 뜨는 것처럼 보이던 문제 해결.
    if (bizShopNameInput) bizShopNameInput.value = shop.businessName || "";
    if (bizAddress1Input) bizAddress1Input.value = shop.businessAddress || "";
    if (bizShopPhoneInput) bizShopPhoneInput.value = shop.phone || "";
    // 2026-08-09 추가 — 매장 소개/편의시설도 실제로 저장·조회되게(PATCH /api/restaurants/{id}/extras).
    if (bizIntroInput) {
      bizIntroInput.value = shop.description || "";
      bizIntroInput.dispatchEvent(new Event("input")); // 글자수 카운터(data-counter) 갱신
    }
    var amenities = shop.amenities || [];
    document.querySelectorAll('input[name="amenity"]').forEach(function (cb) {
      cb.checked = amenities.indexOf(cb.value) !== -1;
    });
    if (bizPriceRangeInput) bizPriceRangeInput.value = shop.priceRange || "";
    var hours = shop.businessHours || [];
    document.querySelectorAll('input[name="holiday"]').forEach(function (cb) {
      var entry = hours.filter(function (h) { return DAY_CODES[h.dayOfWeek] === cb.value; })[0];
      cb.checked = !!(entry && entry.closed);
    });
    var openDay = hours.filter(function (h) { return !h.closed && h.openTime; })[0];
    if (openDay) {
      if (bizOpenTimeInput) bizOpenTimeInput.value = openDay.openTime.slice(0, 5);
      if (bizCloseTimeInput) bizCloseTimeInput.value = openDay.closeTime ? openDay.closeTime.slice(0, 5) : "";
    }
  }

  if (bizInfoForm) {
    // "변경 취소" 버튼(type=reset)의 네이티브 동작은 폼을 HTML 기본값(대부분 빈 값)으로 되돌리는데,
    // 영업시간/편의시설/매장소개 같은 필드는 JS가 fillShopInfoForm()으로 채운 값이라 기본값 자체가
    // 비어있다 — 그래서 "변경 취소"를 누르면 실제 저장된 값이 아니라 완전히 빈 폼이 되고, 그 상태로
    // 실수로 저장하면 서버 값까지 지워지는 문제가 있었다(2026-08-10, "영업시간이 영업종료로 나온다"
    // 리포트로 발견). 네이티브 reset을 막고, 서버에서 마지막으로 받아온 값으로 다시 채운다.
    bizInfoForm.addEventListener("reset", function (e) {
      e.preventDefault();
      if (state.lastShop) fillShopInfoForm(state.lastShop);
    });
    bizInfoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!state.restaurantId) {
        Eatty.toast("연결된 매장이 없어 저장할 수 없습니다.", "error");
        return;
      }
      var closedDays = Array.prototype.map.call(
        document.querySelectorAll('input[name="holiday"]:checked'), function (cb) { return cb.value; });
      var openTime = bizOpenTimeInput ? bizOpenTimeInput.value : "";
      var closeTime = bizCloseTimeInput ? bizCloseTimeInput.value : "";
      var businessHours = DAY_CODES.map(function (code, dayOfWeek) {
        var isClosed = closedDays.indexOf(code) !== -1;
        return {
          dayOfWeek: dayOfWeek,
          isClosed: isClosed,
          openTime: isClosed ? null : (openTime || null),
          closeTime: isClosed ? null : (closeTime || null)
        };
      });

      var phone = (bizShopPhoneInput && bizShopPhoneInput.value.trim()) || "";
      var description = (bizIntroInput && bizIntroInput.value.trim()) || "";
      var amenities = Array.prototype.map.call(
        document.querySelectorAll('input[name="amenity"]:checked'), function (cb) { return cb.value; });
      var priceRange = (bizPriceRangeInput && bizPriceRangeInput.value) || "";
      Promise.all([
        Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/phone",
          { method: "PATCH", body: { phone: phone || null } }),
        Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/business-hours",
          { method: "PUT", body: { businessHours: businessHours } }),
        Api.request("/api/restaurants/" + encodeURIComponent(state.restaurantId) + "/extras",
          { method: "PATCH", body: { description: description, amenities: amenities, priceRange: priceRange || null } })
      ]).then(function () {
        Eatty.toast("매장 정보를 저장했습니다.", "success");
      }).catch(function (err) {
        Eatty.toast((err && err.message) || "저장에 실패했습니다.", "error");
      });
    });
  }

  function loadShop() {
    return Api.request("/api/business/me/shop").then(function (shop) {
      state.restaurantId = shop.restaurantId;
      state.lastShop = shop;
      updateShopHeader(shop);
      updateShopMainImage(shop.imageUrl);
      updatePublicPageLink();
      fillShopInfoForm(shop);
      loadMenus();
      loadPhotos();
    }).catch(function () {
      // 아직 자동귀속된 매장이 없는 계정 — 매장 헤더가 다른 계정의 고정 시안 값을 그대로 보여주던 문제
      // (2026-08-06, "다른 계정인데 저렇게 동일한 가게로 떠" 리포트) — 이 상태에서는 헤더도 명시적으로
      // "연결된 매장 없음"으로 비우고, 메뉴/사진 탭도 빈 상태로 둔다(통계 탭과 동일한 처리).
      updateShopHeader(null);
      if (viewPublicPageBtn) viewPublicPageBtn.hidden = true;
      if (menuTabCount) menuTabCount.textContent = "0";
      if (photoTabCount) photoTabCount.textContent = "0";
      menuEmpty.hidden = false;
    });
  }
  loadShop();

  // ------------------------------------------------------------------------
  // 매장 연결(2026-08-07 추가, 2026-08-07 팝업창 방식으로 재변경) — 회원가입 시 자동귀속이 모호했던
  // 계정이 별도 브라우저 창(store-search-popup.html)에서 검색해서 직접 연결한다 — 도로명주소 검색
  // (Juso)과 동일한 "새 창 + opener 콜백" 패턴.
  (function () {
    if (!claimRestaurantBtn) return;

    window.eattyStoreSearchCallback = function (item) {
      claimRestaurantBtn.disabled = true;
      Api.request("/api/business/claim-restaurant", {
        method: "POST",
        body: { restaurantId: item.restaurantId, address: item.address, roadAddress: item.roadAddress }
      }).then(function () {
        Eatty.toast("매장을 연결했습니다.", "success");
        loadShop();
      }).catch(function (err) {
        Eatty.toast((err && err.message) || "매장 연결에 실패했습니다.", "error");
      }).finally(function () {
        claimRestaurantBtn.disabled = false;
      });
    };

    claimRestaurantBtn.addEventListener("click", function () {
      var popup = window.open("store-search-popup", "storeSearchPopup", "width=480,height=600,scrollbars=yes");
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        Eatty.toast("팝업이 차단되었습니다. 브라우저 주소창의 팝업 차단 아이콘에서 허용한 뒤 다시 시도해주세요.", "error");
      }
    });
  })();
})();
