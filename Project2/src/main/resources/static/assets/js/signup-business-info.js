(function () {
  // STEP1(signup-business)을 거치지 않고 이 URL로 바로 들어오면 STEP1로 돌려보낸다(2026-08-04 추가) —
  // find-password-sent.js 등과 동일한 패턴. 값의 존재만으로는 예전에 테스트하다 남은 오래된
  // sessionStorage와 구분이 안 되므로, biz_signup_at이 최근(30분 이내)인지도 함께 확인한다.
  var STEP1_GATE_ENABLED = true;
  var STEP1_VALID_MS = 30 * 60 * 1000;
  var bizSignupAt = Number(sessionStorage.getItem("biz_signup_at"));
  var step1Fresh = bizSignupAt && (Date.now() - bizSignupAt) < STEP1_VALID_MS;
  if (STEP1_GATE_ENABLED && (!sessionStorage.getItem("biz_signup_email") || !step1Fresh)) {
    sessionStorage.removeItem("biz_signup_email");
    sessionStorage.removeItem("biz_signup_at");
    window.location.replace("signup-business");
    return;
  }

  // 백엔드에 매장 정보(상호명/카테고리/주소/영업시간 등)를 가입 시점에 저장하는 API가 아직 없다
  // (BusinessSignUpRequestDto는 email/password/nickname/phone만 받음, 실제 사업자 계정 생성은 이미
  // signup-business 제출 시 끝났다). 그래서 이 화면은 입력만 받고 서버에는 아직 보내지 않는다.

  // 행정안전부 도로명주소 팝업 API(business.juso.go.kr) 승인키(2026-08-04 발급) — ncpKeyId(프론트
  // maps.js 스크립트 태그)와 같은 성격의 "브라우저에서 그대로 노출되는 공개 연동키"라 다른 프론트
  // 전용 키들과 동일하게 코드에 직접 둔다(서버 전용 비밀키가 아님). 발급 시 등록 URL은 eattyway.com이라,
  // localhost에서 테스트할 때는 팝업이 도메인 불일치로 막힐 수 있다.
  var JUSO_CONFIRM_KEY = "U01TX0FVVEgyMDI2MDgwNDE0MTYwMzExOTkwNDA=";

  var zipcodeInput = document.getElementById("shopZipcode");
  var address1Input = document.getElementById("shopAddress1");
  var address2Input = document.getElementById("shopAddress2");
  var latInput = document.getElementById("shopLat");
  var lngInput = document.getElementById("shopLng");
  var mapArea = document.getElementById("shopMapArea");

  var map = null;
  var marker = null;
  // 카테고리별 지도 마커(explore.js)와 같은 이미지 세트 자리에 두는, "매장 위치 지정" 전용 마커
  // (2026-08-04 추가) — 잇티웨이 브랜드 색상(--brand-500 #fd6d4a)으로 재색칠한 핀.
  var SHOP_MARKER_ICON = {
    url: "img/markers/marker-shop-location.png",
    size: new naver.maps.Size(32, 42),
    scaledSize: new naver.maps.Size(32, 42),
    anchor: new naver.maps.Point(16, 42),
  };

  function showOnMap(lat, lng) {
    if (!mapArea || typeof naver === "undefined") return;
    var position = new naver.maps.LatLng(lat, lng);
    if (!map) {
      map = new naver.maps.Map(mapArea, { center: position, zoom: 16 });
      marker = new naver.maps.Marker({ position: position, map: map, icon: SHOP_MARKER_ICON });
    } else {
      map.setCenter(position);
      marker.setPosition(position);
    }
  }

  // 주소 문자열을 좌표로 바꿔서 지도에 표시한다(NCP Geocoding, 2026-08-04 추가) — Juso 팝업 결과에는
  // 지도에 바로 쓸 수 있는 좌표가 들어있지 않아, 도로명주소를 우리 서버(GET /api/geocode)에 넘겨
  // 다시 좌표로 변환한다.
  function geocodeAndShow(address) {
    Api.request("/api/geocode?query=" + encodeURIComponent(address), { method: "GET", auth: false })
      .then(function (res) {
        latInput.value = res.latitude;
        lngInput.value = res.longitude;
        showOnMap(res.latitude, res.longitude);
      })
      .catch(function (err) {
        Eatty.toast(err.message || "주소의 좌표를 찾지 못했습니다. 지도에는 표시되지 않지만 주소는 그대로 저장됩니다.", "error");
      });
  }

  // Juso 팝업이 사용자가 주소를 선택하면 opener(현재 창)의 이 함수를 직접 호출한다(2026-08-04 추가,
  // resultType=4 = JS 콜백 모드). 파라미터 순서는 business.juso.go.kr 공식 연동 가이드의 고정 시그니처.
  window.jusoCallBack = function (roadFullAddr, roadAddrPart1, addrDetail, roadAddrPart2, engAddr, jibunAddr, zipNo) {
    zipcodeInput.value = zipNo;
    address1Input.value = roadAddrPart1;
    // Juso 팝업의 "상세주소입력" 화면에서 사용자가 입력한 값(addrDetail)을 그대로 넘겨받아 채운다
    // (2026-08-04 추가) — 입력 안 했으면 빈 값이라 focus만 해서 이어서 입력하게 둔다.
    address2Input.value = addrDetail || "";
    address2Input.focus();
    geocodeAndShow(roadFullAddr || roadAddrPart1);
  };

  var addressBtn = document.getElementById("searchAddressBtn");
  if (addressBtn) {
    addressBtn.addEventListener("click", function () {
      // 팝업이 차단되면 target="jusoPopup"으로 지정한 form.submit()이 새 창 대신 현재 탭 전체를
      // POST로 덮어써버려서 화면이 깨진다(2026-08-04 실사용 중 발견) — 팝업 오픈 성공 여부를 먼저
      // 확인해서, 차단된 경우 안내만 하고 submit 자체를 하지 않는다.
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
      // Juso 팝업은 주소를 고르면 opener.jusoCallBack()을 cross-origin에서 직접 부르는 게 아니라,
      // 팝업 자신을 returnUrl로 POST 이동시킨다(2026-08-04 실사용 중 발견) — 그래서 returnUrl은 현재
      // 페이지가 아니라, 그 POST를 받아서 opener.jusoCallBack()을 대신 호출해주는 전용 엔드포인트로
      // 지정해야 한다(같은 origin이라 cross-origin 함수 접근 제한에 걸리지 않는다).
      hidden("confmKey", JUSO_CONFIRM_KEY);
      hidden("returnUrl", window.location.origin + "/api/juso-callbacks");
      hidden("resultType", "4");

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    });
  }

  // 매장 사진 업로드(2026-08-04 추가) — #shopPhotoList의 기존 마크업은 화면 시안용 정적 예시였을 뿐,
  // 실제로 선택한 파일을 반영하는 로직이 없었다(eatty-ui.js의 공용 드롭존 핸들러는 이 존에
  // data-dropzone-preview가 없어서 파일명 갱신 외에는 아무 것도 하지 않았음). 실제 선택 파일로
  // 썸네일 목록을 렌더링하고, 첫 장을 "대표"로 표시하며, 장별 삭제와 최대 5장 제한을 처리한다.
  var shopPhotoDrop = document.getElementById("shopPhotoDrop");
  var shopPhotoInput = document.getElementById("shopPhotoInput");
  var shopPhotoList = document.getElementById("shopPhotoList");
  var shopPhotoFileName = document.getElementById("shopPhotoFileName");
  var MAX_SHOP_PHOTOS = 5;
  var selectedShopPhotos = [];

  function renderShopPhotos() {
    if (!shopPhotoList) return;
    shopPhotoList.innerHTML = "";
    selectedShopPhotos.forEach(function (file, idx) {
      var url = URL.createObjectURL(file);
      var item = document.createElement("div");
      item.className = "relative e-ratio-1 rounded-[var(--r)] overflow-hidden";
      item.innerHTML =
        '<img src="' + url + '" class="w-full h-full object-cover" alt="매장 사진 ' + (idx + 1) + '">' +
        (idx === 0 ? '<span class="absolute left-1.5 top-1.5 e-badge e-badge--brand-solid !text-[10px] !px-2 !py-0.5">대표</span>' : "") +
        '<button type="button" class="absolute right-1.5 top-1.5 w-6 h-6 rounded-full bg-black/50 text-white grid place-items-center" aria-label="사진 삭제" data-remove-photo-idx="' + idx + '">' +
        '<svg style="width:12px;height:12px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
      shopPhotoList.appendChild(item);
    });
    if (shopPhotoFileName) {
      shopPhotoFileName.textContent = selectedShopPhotos.length
        ? selectedShopPhotos.length + "장 선택됨"
        : "선택된 파일이 없습니다";
    }
  }

  function addShopPhotos(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    var overflowed = false;
    files.forEach(function (file) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return;
      if (selectedShopPhotos.length >= MAX_SHOP_PHOTOS) { overflowed = true; return; }
      selectedShopPhotos.push(file);
    });
    if (overflowed) Eatty.toast("매장 사진은 최대 5장까지 등록할 수 있습니다.", "default");
    renderShopPhotos();
  }

  // 클릭으로 선택하든 드래그로 놓든, eatty-ui.js의 공용 드롭존 핸들러가 결국 input.files를 채우고
  // "eatty:filepicked"를 쏴준다 — 그 이벤트 하나만 듣고 그 시점의 input.files를 읽으면 두 경로를
  // 각각 따로 처리하다 파일이 중복 추가되는 걸 피할 수 있다.
  if (shopPhotoDrop && shopPhotoInput) {
    shopPhotoDrop.addEventListener("eatty:filepicked", function () {
      addShopPhotos(shopPhotoInput.files);
    });
  }
  if (shopPhotoList) {
    shopPhotoList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-photo-idx]");
      if (!btn) return;
      selectedShopPhotos.splice(Number(btn.getAttribute("data-remove-photo-idx")), 1);
      renderShopPhotos();
    });
  }
  renderShopPhotos();

  // signup-business-done이 "STEP2를 방금 마쳤는지" 판단할 때 쓰는 값(2026-08-04 추가).
  function goToDone() {
    sessionStorage.setItem("biz_info_done_at", String(Date.now()));
    window.location.href = "signup-business-done";
  }

  // 매장명 검색(2026-08-07 추가, 2026-08-07 팝업창 방식으로 재변경) — #shopName을 readonly로 바꿔
  // 직접 타이핑을 막고, 별도 브라우저 창(store-search-popup.html)을 띄워 카카오맵 실시간 검색
  // (GET /api/restaurants/search?type=shop) 결과 중에서만 고르게 한다 — 이 파일의 도로명주소 검색
  // (Juso) 팝업과 동일한 "새 창 + opener 콜백" 패턴. readonly 입력은 HTML5 constraint validation에서
  // 자동으로 제외되므로(required가 먹지 않음) 제출 시 별도로 값을 확인한다.
  // 고른 매장의 카카오 place 정보 — 제출할 때 매장 귀속(claim)에 그대로 넘긴다(2026-08-07).
  var selectedStore = null;

  // 매장 선택 시 카테고리 자동 입력(2026-08-14 추가) — 이미 카카오 검색 결과(item.category)에
  // 우리 쪽이 분류해둔 카테고리가 있으므로, 사업자가 다시 고르게 하지 않고 그대로 채우고 잠근다.
  // select의 옵션 값을 공식 음식점 카테고리 코드(restaurant_categories.category_code)와 동일하게
  // 맞춰뒀기 때문에(2026-08-14, 예전엔 korean/chicken/meat 같은 별도 문자열이라 1:1로 안 맞았다) 11개
  // 전부 그대로 매칭된다. 매칭되는 값이 없으면(카카오가 카테고리명을 안 준 경우) 잠그지 않고 직접
  // 고르게 두고, 그 선택값은 제출 시 categoryOverride로 서버에 저장돼 실제 고객 화면/마커에도 반영된다
  // (RestaurantServiceImpl.classifyItem() 3차 폴백).
  var CATEGORY_NAME_TO_VALUE = {
    "한식": "KOREAN", "양식": "WESTERN", "중식": "CHINESE", "일식": "JAPANESE",
    "분식": "SNACK", "패스트푸드": "FAST_FOOD", "아시안": "ASIAN", "술집": "BAR",
    "뷔페": "BUFFET", "카페/디저트": "CAFE_DESSERT", "카페 · 디저트": "CAFE_DESSERT", "그 외": "ETC"
  };
  var shopCategorySelect = document.getElementById("shopCategory");
  function applyAutoCategory(categoryName) {
    if (!shopCategorySelect) return;
    var value = categoryName ? CATEGORY_NAME_TO_VALUE[categoryName] : null;
    if (value) {
      shopCategorySelect.value = value;
      shopCategorySelect.disabled = true;
    } else {
      shopCategorySelect.disabled = false;
    }
  }

  (function () {
    var shopNameInput = document.getElementById("shopName");
    if (!shopNameInput) return;

    window.eattyStoreSearchCallback = function (item) {
      shopNameInput.value = item.name;
      selectedStore = item;
      applyAutoCategory(item.category);
    };

    shopNameInput.addEventListener("click", function () {
      var popup = window.open("store-search-popup", "storeSearchPopup", "width=480,height=600,scrollbars=yes");
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        Eatty.toast("팝업이 차단되었습니다. 브라우저 주소창의 팝업 차단 아이콘에서 허용한 뒤 다시 시도해주세요.", "error");
      }
    });
  })();

  var form = document.getElementById("bizSignupStep2Form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // "나중에 입력하기" 건너뛰기를 없앤 만큼(2026-08-04), 필수 항목 입력 자체를 실제로 강제한다 —
      // 이전엔 e.preventDefault()가 브라우저의 기본 required 검증 팝업까지 막아버려서 사실상
      // 아무 것도 안 채워도 다음 단계로 넘어갈 수 있었다.
      var shopNameEl = document.getElementById("shopName");
      if (shopNameEl && !shopNameEl.value.trim()) {
        Eatty.toast("매장명을 검색해서 선택해주세요.", "error");
        return;
      }
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // 매장 귀속(2026-08-07) — 가게명을 STEP1에서 STEP2로 옮기면서, 회원가입 시점에 하던 자동귀속을
      // 여기서 대신 처리한다. 서버가 사업장 주소와 실제로 일치하는지 다시 검증하므로, 주소가 안 맞거나
      // 이미 다른 사업자가 가져간 매장이면 실패할 수 있다 — 그래도 STEP2 자체는 통과시킨다(귀속은
      // 부가 기능이고, 나중에 내 매장 화면에서 다시 시도할 수 있음).
      if (!selectedStore || !selectedStore.restaurantId) {
        goToDone();
        return;
      }
      Api.request("/api/restaurant-claims", {
        method: "POST",
        body: {
          restaurantId: selectedStore.restaurantId,
          address: selectedStore.address || "",
          roadAddress: selectedStore.roadAddress || "",
        },
      })
        .then(function () {
          // 자동 분류가 안 돼서 사업자가 직접 고른 카테고리(2026-08-14 추가)는 claim 성공 후 별도로
          // 저장한다 — extras 저장 API가 description/amenities/priceRange까지 한 번에 덮어쓰는데
          // 이 화면은 그 값들을 아직 안 받으므로 null로 보내도 안전하다(귀속 직후라 기존 값이 없음).
          if (shopCategorySelect && !shopCategorySelect.disabled && shopCategorySelect.value) {
            return Api.request("/api/restaurants/" + encodeURIComponent(selectedStore.restaurantId) + "/extras", {
              method: "PATCH",
              body: { categoryOverride: shopCategorySelect.value },
            }).catch(function () {});
          }
        })
        .then(function () { goToDone(); })
        .catch(function (err) {
          Eatty.toast(err.message || "매장 연결에 실패했습니다. 내 매장 화면에서 다시 시도할 수 있어요.", "error");
          goToDone();
        });
    });
  }
})();
