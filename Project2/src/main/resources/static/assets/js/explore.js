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

  // ===========================================================================
  // 공유 — 카카오 메시지 템플릿 (2026-08-24 재구성)
  // ---------------------------------------------------------------------------
  // 동작 갈래:
  //   iOS 앱 → #shareChoiceModal 로 선택("카카오톡으로 공유 / 링크 복사 / 다른 앱으로 공유")
  //   그 외   → 예전 그대로 곧바로 링크 복사. **모바일 브라우저도 여기 포함**
  //             (README "확정된 공유 동작" — 웹에는 공유 시트를 띄우지 않는다는 결정을 유지한다)
  //
  // ⚠️ 왜 선택 모달이 필요한가: iOS 기본 공유 시트(UIActivityViewController)에서 사용자가 카카오톡을
  // 고르는 순간부터는 **카카오톡의 공유 익스텐션**이 처리하므로 우리가 개입할 수 없다. 즉 "공유 시트에서
  // 카카오톡을 선택했을 때 템플릿으로 보내기"는 원리적으로 불가능하다. 메시지 템플릿을 쓰려면 카카오톡만
  // 공유 시트를 우회해서 카카오 공유 API를 직접 불러야 하고, 그 선택을 받는 UI가 이 모달이다.
  //
  // ⚠️ 네이티브 재빌드가 필요 없는 이유: 카카오 JS SDK는 카카오톡을 열 때 kakaolink:// 커스텀 스킴으로
  // 이동한다. Capacitor의 WebViewDelegationHandler.decidePolicyFor가 "앱 URL도 아니고 allowNavigation에도
  // 없는 최상위 이동"을 UIApplication.shared.open으로 넘기기 때문에 그 스킴이 그대로 열린다
  // (node_modules/@capacitor/ios/.../WebViewDelegationHandler.swift 96~115행에서 확인).
  // 카카오톡이 없는 기기에서는 SDK가 sharer.kakao.com 웹 피커로 폴백하는데, 그 호스트는
  // capacitor.config.json의 allowNavigation에 *.kakao.com으로 이미 들어가 있어 앱 안에서 정상 처리된다.
  // ===========================================================================

  // 카카오 JavaScript 앱 키. 콘솔(카카오 개발자) → 내 애플리케이션 → 앱 키 → **JavaScript 키**.
  // ⚠️ 소셜 로그인에 쓰는 REST API 키(서버의 KAKAO_CLIENT_ID)와는 **다른 값**이다.
  // 브라우저에 노출되는 것이 정상인 공개 키이며(네이버 지도 키를 HTML에 그대로 두는 것과 같은 성격),
  // 콘솔에 등록한 도메인에서만 동작하도록 카카오가 제한한다.
  // ⚠️ 콘솔 → 앱 설정 → 앱 → 플랫폼 키 → JavaScript 키 수정 → **JavaScript SDK 도메인**에
  //    https://eattyway.com 이 등록돼 있어야 한다. 그 화면에 "도메인 정보를 등록하지 않으면
  //    JavaScript 키를 사용할 수 없습니다"라고 명시돼 있다 — 등록 전에는 SDK가 동작하지 않는다.
  // 값이 비어 있으면 "카카오톡으로 공유" 버튼이 표시되지 않고 기존 동작으로 떨어진다 —
  // 그래서 키를 채우지 않은 상태로 배포해도 공유 기능이 깨지지 않는다.
  // 앱 Eattyway(ID 1517447)의 "Default JS Key" — 2026-08-24 등록.
  var KAKAO_JS_KEY = "8909b1d8385d0b648afbe292a9c51a99";

  // 사용자 정의 템플릿 ID. 콘솔 → 도구 → 메시지 템플릿 구성에서 만든 템플릿의 ID다.
  // ⚠️ **콘솔의 템플릿 설정과 아래 templateArgs의 키가 정확히 일치해야 한다.** 어긋나면 에러 없이
  // 빈 칸이나 `${KEY}` 문자열이 그대로 찍힌 메시지가 나간다(조용히 깨지는 종류의 실수다).
  // 템플릿에 넣어야 하는 값 — 왼쪽이 콘솔, 오른쪽이 이 코드가 보내는 키:
  //     제목                        ${TITLE}   → TITLE
  //     설명                        ${DESC}    → DESC
  //     이미지(썸네일) URL           ${THUMB}   → THUMB
  //     링크(모바일 웹 / 웹 URL)     https://eattyway.com/s/${CODE}   → CODE
  //     버튼("자세히 보기") 링크      위 링크와 동일
  // 링크에 **코드만** 인자로 넘기는 이유: 경로 전체를 인자로 넘기면 ?, &, / 가 섞여 카카오 쪽 URL
  // 검증/인코딩에서 어떻게 처리되는지 보장할 수 없다. 도메인과 /s/ 경로를 템플릿에 고정하면
  // 인자는 코드 문자열 하나뿐이라 그 위험이 사라진다.
  // 0으로 두면 사용자 정의 템플릿을 쓰지 않고 아래 기본 템플릿 폴백으로만 동작한다.
  var KAKAO_TEMPLATE_ID = 136530;

  // 템플릿의 이미지를 가게 사진으로 바꿔 보낼지 여부.
  // false = 콘솔에 **업로드해둔 고정 이미지**를 쓴다(기본값).
  //   그렇게 둔 이유가 셋 있다:
  //     1) 빌더의 이미지 칸이 URL/사용자 인자를 받는지 공식 문서로 확인되지 않았다(업로드만 가능할 수도 있다).
  //     2) 업로드 이미지는 카카오가 호스팅하므로 "외부에서 가져갈 수 있는 URL이어야 한다"는 제약이 사라진다.
  //     3) RESTAURANT_DEFAULT_IMAGE_URL이 비어 있어서 imageUrl이 null로 내려오는 가게가 실제로 있다.
  // true = templateArgs에 THUMB를 실어 보낸다.
  //   콘솔의 이미지 칸에 ${THUMB} 를 넣을 수 있는 경우에만 켤 것. 칸이 없는데 켜면 인자만 무시된다.
  var KAKAO_TEMPLATE_SENDS_IMAGE = false;

  // 카카오 공유를 쓸 수 있는 상태인지 확인한다. 최초 호출 때 한 번만 init한다.
  function kakaoShareReady() {
    if (!KAKAO_JS_KEY) return false;
    if (!window.Kakao) return false; // SDK 로드 실패(네트워크 차단, integrity 불일치 등)
    try {
      if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
      return !!(Kakao.isInitialized() && Kakao.Share && Kakao.Share.sendDefault);
    } catch (e) {
      return false;
    }
  }

  // 템플릿 이미지 URL을 고른다.
  // 카카오 서버가 **외부에서 직접 가져갈 수 있는** 절대 URL이어야 한다. 가게 이미지는
  // RESTAURANT_IMAGE_BASE_URL 기반이라 환경에 따라 localhost일 수 있고, RESTAURANT_DEFAULT_IMAGE_URL은
  // 비어 있어서 imageUrl이 null로 내려오는 가게도 있다. 그런 경우는 사이트 로고로 대체한다.
  function shareImageUrl(raw) {
    var fallback = window.location.origin + "/assets/images/logo-full.png";
    if (!raw) return fallback; // ⚠️ new URL(undefined, base)는 ".../undefined"가 되므로 먼저 걸러야 한다
    var abs = null;
    try { abs = new URL(raw, window.location.origin); } catch (e) { return fallback; }
    if (abs.protocol !== "https:" && abs.protocol !== "http:") return fallback;
    var host = abs.hostname;
    if (/^(localhost|127\.0\.0\.1|::1)$/i.test(host)) return fallback;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return fallback; // 사설망
    return abs.href;
  }

  // 설명문. "카테고리 · 별점" 과 "주소"를 sep으로 이어붙인다.
  // sep을 인자로 받는 이유: 기본 템플릿의 description은 \n 줄바꿈이 확실히 먹지만, 사용자 정의
  // 템플릿의 본문에 **사용자 인자 값으로 넣은** \n이 줄바꿈으로 렌더링되는지는 확인되지 않았다.
  // 그래서 사용자 정의 템플릿 경로는 " · "로 한 줄로 보내 애매함을 없앤다.
  function shareDescription(item, sep) {
    var head = [];
    if (item.category) head.push(item.category);
    if (Number(item.averageRating) > 0) {
      var score = "별점 " + Number(item.averageRating).toFixed(1);
      if (Number(item.reviewCount) > 0) score += " (리뷰 " + item.reviewCount + "개)";
      head.push(score);
    }
    var line1 = head.join(" · ");
    var line2 = item.roadAddress || item.address || "";
    var text = (line1 && line2) ? (line1 + sep + line2) : (line1 || line2);
    // 카카오 피드 템플릿 description은 200자 제한이라 넉넉히 잘라둔다.
    return text.length > 190 ? text.slice(0, 190) + "…" : text;
  }

  // 카카오톡으로 메시지 템플릿 전송. 실패는 호출자가 try/catch로 잡는다.
  // share: { url: 공유할 최종 URL, code: 단축링크 코드 또는 null }
  //
  // 두 경로가 있고 **사용자 정의 템플릿이 우선**이다:
  //   1) sendCustom  — 콘솔에서 디자인한 템플릿(KAKAO_TEMPLATE_ID) + 사용자 인자.
  //      단축링크 코드가 있어야 쓸 수 있다(템플릿 링크가 .../s/${CODE}로 고정돼 있으므로).
  //   2) sendDefault — 코드로 조립하는 기본 템플릿. 콘솔 설정과 무관하게 항상 동작한다.
  //      단축링크 발급이 실패해 긴 URL을 써야 할 때의 폴백이다(기본 템플릿은 URL 전체를 그대로 받는다).
  function sendKakaoShare(item, share) {
    var title = item.name || "잇티웨이 맛집";
    var thumb = shareImageUrl(detailImages[0] || item.imageUrl);

    if (KAKAO_TEMPLATE_ID && share.code) {
      // 키는 ${} 없이 넘긴다 — SDK가 내부에서 ${KEY} 형태로 감싼다.
      var args = { TITLE: title, DESC: shareDescription(item, " · "), CODE: share.code };
      if (KAKAO_TEMPLATE_SENDS_IMAGE) args.THUMB = thumb;
      Kakao.Share.sendCustom({ templateId: KAKAO_TEMPLATE_ID, templateArgs: args });
      return;
    }

    var link = { mobileWebUrl: share.url, webUrl: share.url };
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: { title: title, description: shareDescription(item, "\n"), imageUrl: thumb, link: link },
      buttons: [{ title: "가게 보기", link: link }],
    });
  }

  // 선택 모달을 열고 버튼 3개를 지금 환경에 맞게 구성한다.
  // 핸들러는 onclick으로 **덮어쓴다** — 상세 패널을 여러 번 열어도 addEventListener처럼 쌓이지 않는다.
  // sharePromise: { url, code }로 resolve되는 Promise. 모달은 그걸 기다리지 않고 즉시 뜨고,
  //               각 버튼이 눌린 시점에 await한다 — 탭 반응이 즉각적이다.
  function openShareChoice(item, sharePromise, copyLink) {
    var modalId = "shareChoiceModal";
    var kakaoBtn = document.getElementById("shareKakaoBtn");
    var copyBtn = document.getElementById("shareCopyBtn");
    var moreBtn = document.getElementById("shareMoreBtn");
    var descEl = document.getElementById("shareChoiceDesc");
    function copyResolved() { sharePromise.then(function (s) { copyLink(s.url); }); }

    // 구 HTML이 캐시된 상태(모달 마크업 없음)면 예전 동작으로 폴백한다.
    if (!copyBtn) { copyResolved(); return; }

    var canKakao = kakaoShareReady();
    // "다른 앱으로 공유"는 네이티브 공유 시트다. 네이티브가 share 지원을 선언한 빌드에서만 보인다
    // (api.js의 nativeShare가 EattyWayNativeCaps.share를 확인하는 구조와 같은 게이트).
    var canNative = !!(window.EattyWayApp && window.EattyWayNativeCaps && window.EattyWayNativeCaps.share === true);

    // 선택지가 "링크 복사" 하나뿐이면 모달을 띄우는 의미가 없다 → 예전처럼 바로 복사한다.
    // (카카오 키가 비었고 네이티브도 구 빌드인 경우가 여기에 해당한다.)
    if (!canKakao && !canNative) { copyResolved(); return; }

    if (descEl) {
      descEl.textContent = item.name ? item.name + "을(를) 친구에게 알려주세요." : "이 가게를 친구에게 알려주세요.";
    }

    if (kakaoBtn) {
      kakaoBtn.hidden = !canKakao;
      kakaoBtn.onclick = function () {
        sharePromise.then(function (s) {
          try {
            sendKakaoShare(item, s);
            Eatty.closeModal(modalId);
          } catch (e) {
            Eatty.toast("카카오톡 공유를 시작할 수 없습니다.", "error");
          }
        });
      };
    }

    copyBtn.onclick = function () {
      sharePromise.then(function (s) { copyLink(s.url); Eatty.closeModal(modalId); });
    };

    if (moreBtn) {
      moreBtn.hidden = !canNative;
      moreBtn.onclick = function () {
        sharePromise.then(function (s) {
          if (!window.EattyWayApp.nativeShare(s.url, item.name || "잇티웨이")) copyLink(s.url);
          Eatty.closeModal(modalId);
        });
      };
    }

    Eatty.openModal(modalId);
  }

  // 2026-08-20 추가 — 영수증 자동촬영이 실패하면(이미 쓴 영수증, 가게명 불일치 등) receipt-upload.js가
  // 토스트 없이 바로 이 페이지로 돌려보낸다. 그 실패 사유를 sessionStorage에 남겨두면 여기서 한 번만
  // 꺼내 보여주고 지운다(새로고침해도 다시 안 뜨게).
  (function showReceiptFailToast() {
    var reason = sessionStorage.getItem("eatty.receiptFailReason");
    if (!reason) return;
    sessionStorage.removeItem("eatty.receiptFailReason");
    if (window.Eatty && typeof Eatty.toast === "function") Eatty.toast(reason, "error");
  })();

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // 2026-08-12 추가 — mypage-reviews.js와 동일한 판정(1분 넘게 차이나면 실제 수정으로 간주). 고객
  // 상세 화면 리뷰 목록에는 이 표시가 빠져 있어서 "내가 쓴 리뷰"에서만 보인다는 지적으로 추가.
  function isEdited(r) {
    if (!r.updatedAt || !r.createdAt) return false;
    return Math.abs(new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) > 60000;
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
  var openNowOnly = false;
  var currentSearchType = "all";
  var lastKeyword = "";
  var currentDetail = null;
  var directionsLine = null;
  var detailImages = [];
  var detailImageIndex = 0;
  var detailImageBox = document.getElementById("detailImageBox");
  var DETAIL_IMG_PLACEHOLDER =
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg>';

  // 매장 사진 갤러리(2026-08-06 추가) — 대표 이미지가 항상 0번(백엔드가 그렇게 정렬해서 준다). 상세를
  // 새로 열거나 새로고침할 때마다 detailImageIndex를 0으로 되돌려 항상 대표 이미지부터 보여준다.
  function renderDetailImage() {
    if (!detailImageBox) return;
    if (!detailImages.length) {
      detailImageBox.innerHTML = DETAIL_IMG_PLACEHOLDER;
      return;
    }
    var showArrows = detailImages.length > 1;
    detailImageBox.innerHTML =
      '<img src="' + escapeHtml(detailImages[detailImageIndex]) + '" class="size-full object-cover" alt="">' +
      (showArrows ?
        '<button type="button" class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 grid place-items-center shadow-[var(--sh-sm)] hover:bg-white" data-detail-img-prev aria-label="이전 사진">' +
          '<svg style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>' +
        '</button>' +
        '<button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 grid place-items-center shadow-[var(--sh-sm)] hover:bg-white" data-detail-img-next aria-label="다음 사진">' +
          '<svg style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>' +
        '</button>' +
        '<div class="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center gap-1.5">' +
          detailImages.map(function (_, i) {
            return '<span class="w-1.5 h-1.5 rounded-full ' + (i === detailImageIndex ? "bg-white" : "bg-white/50") + '"></span>';
          }).join("") +
        '</div>'
        : "");
  }

  if (detailImageBox) {
    detailImageBox.addEventListener("click", function (e) {
      if (e.target.closest("[data-detail-img-prev]")) {
        detailImageIndex = (detailImageIndex - 1 + detailImages.length) % detailImages.length;
        renderDetailImage();
      } else if (e.target.closest("[data-detail-img-next]")) {
        detailImageIndex = (detailImageIndex + 1) % detailImages.length;
        renderDetailImage();
      }
    });
  }

  var searchForm = document.getElementById("exploreSearchForm");
  var searchInput = document.getElementById("exploreSearchInput");
  var resultList = document.getElementById("resultList");
  var resultCount = document.getElementById("resultCount");
  var resultEmpty = document.getElementById("resultEmpty");
  var resultLoading = document.getElementById("resultLoading");
  var researchAreaBtn = document.getElementById("researchAreaBtn");
  var detailPanel = document.getElementById("shopDetailPanel");

  function getBounds() {
    var b = map.getBounds();
    var sw = b.getSW(), ne = b.getNE();
    return { minLat: sw.lat(), maxLat: ne.lat(), minLng: sw.lng(), maxLng: ne.lng() };
  }

  // 지도 중심에서 화면 가장자리까지의 대략적인 거리(하버사인 공식)를 "반경"으로 표시
  var searchRadiusBadge = document.getElementById("searchRadiusBadge");
  function haversineMeters(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function updateRadiusBadge() {
    if (!map || !searchRadiusBadge) return;
    var bounds = getBounds();
    var center = map.getCenter();
    var meters = haversineMeters(center.y, center.x, bounds.maxLat, bounds.maxLng);
    var label = meters < 1000 ? Math.round(meters / 50) * 50 + "m" : (meters / 1000).toFixed(1) + "km";
    searchRadiusBadge.textContent = "현재 지도 반경 " + label;
  }

  function markerIcon(categoryName) {
    var url = CATEGORY_MARKER[categoryName];
    return { url: url, size: new naver.maps.Size(27, 35), scaledSize: new naver.maps.Size(27, 35), anchor: new naver.maps.Point(13.5, 35) };
  }
  function clearMarkers() {
    markers.forEach(function (m) { m.setMap(null); });
    markers = [];
  }
  // 마커 겹침 방지 로직(2026-08-18 추가~제거) — 같은 건물에 여러 매장이 있을 때 마커가 겹치는 걸
  // 완화해보려고 좌표를 살짝 밀어내는 로직을 시도했는데(65m→8m→2m로 기준을 계속 좁혀봤지만), 최대
  // 줌으로 확대하면 진짜 안 겹치는 마커까지 원래 좌표에서 벗어나 보인다는 리포트가 계속 나와서
  // 완전히 제거했다. 마커는 항상 실제 좌표 그대로 표시한다 — 겹치더라도 위치를 임의로 바꾸지 않는다.
  function renderMarkers(list, alwaysShow) {
    clearMarkers();
    list.forEach(function (item) {
      if (item.latitude == null || item.longitude == null) return;
      var classified = !!CATEGORY_MARKER[item.category];
      // 카테고리 분류가 안 된 매장은 지도 전체 브라우징 중엔 기본 마커 대신 생략하지만(마커 바다 방지),
      // alwaysShow(공유 링크로 들어와 그 가게 하나만 보여줄 때)는 미분류라도 네이버 기본 마커로 보여준다.
      if (!classified && !alwaysShow) return;
      var marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(item.latitude, item.longitude),
        map: map, title: item.name,
      });
      if (classified) marker.setIcon(markerIcon(item.category));
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

  function showLoading() {
    resultList.querySelectorAll(".e-shop-card").forEach(function (el) { el.remove(); });
    resultEmpty.hidden = true;
    var lm = document.getElementById("loadMoreBtn");
    if (lm) lm.hidden = true;
    resultLoading.hidden = false;
  }

  function renderResults(list, alwaysShowMarkers) {
    resultsCache = list;
    resultLoading.hidden = true;
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
    renderMarkers(list, alwaysShowMarkers);
  }

  // 2026-08-12 추가 — 상세 필터 모달의 "최소 별점"은 백엔드 /filter, /search 어느 쪽도 지원하는
  // 파라미터가 아니라서(카테고리/가격/영업중만 뿐), 응답으로 받은 목록을 클라이언트에서 한 번 더 거른다.
  // averageRating은 실제 리뷰 기반 값이라 지어낸 데이터는 아니다.
  var minRatingFilter = 0;
  function applyMinRatingFilter(list) {
    if (!minRatingFilter) return list;
    return list.filter(function (item) { return (item.averageRating || 0) >= minRatingFilter; });
  }

  function searchArea() {
    if (!map) return;
    closeDetail();
    var bounds = getBounds();
    updateRadiusBadge();
    if (researchAreaBtn) researchAreaBtn.parentElement.style.display = "none";
    showLoading();
    fetchList("/api/restaurants/filter", {
      minLat: bounds.minLat, maxLat: bounds.maxLat, minLng: bounds.minLng, maxLng: bounds.maxLng,
      categoryId: selectedCategoryId,
      minPrice: priceMin > 0 ? priceMin : null,
      maxPrice: priceMax >= 50000 ? null : priceMax,
      openNow: openNowOnly ? true : null,
      page: 0, size: 50,
    }).then(function (data) { renderResults(applyMinRatingFilter(data.restaurants || [])); }).catch(function () { renderResults([]); });
  }

  function searchKeyword(keyword) {
    lastKeyword = keyword;
    closeDetail();
    var bounds = map ? getBounds() : {};
    showLoading();
    fetchList("/api/restaurants/search", {
      keyword: keyword,
      minLat: bounds.minLat, maxLat: bounds.maxLat, minLng: bounds.minLng, maxLng: bounds.maxLng,
      openNow: openNowOnly ? true : null,
      type: currentSearchType,
      page: 0, size: 50,
    }).then(function (data) {
      var filtered = applyMinRatingFilter(data.restaurants || []);
      renderResults(filtered);
      var first = filtered[0];
      if (first && first.latitude != null) map.setCenter(new naver.maps.LatLng(first.latitude, first.longitude));
      updateRadiusBadge();
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
  // 검색 대상 세그먼트(전체/가게명/메뉴명) — 탭 자체의 선택 표시(is-active/aria-selected)는
  // eatty-ui.js의 공용 [data-tabs] 핸들러가 처리하고, 여기서는 실제 검색 조건만 갱신한다.
  var searchTypeGroup = document.getElementById("searchTypeGroup");
  if (searchTypeGroup) {
    searchTypeGroup.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-search-type]");
      if (!btn) return;
      currentSearchType = btn.getAttribute("data-search-type");
      if (searchInput && searchInput.value.trim()) searchKeyword(searchInput.value.trim());
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
    function renderCategoryChips(categories) {
      (categories || []).filter(function (c) { return c.categoryName !== "그 외"; }).forEach(function (c) {
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
    }
    // 카테고리 목록(2026-08-18 캐시 추가) — 우리 DB가 갖고 있는 고정 마스터 데이터라(카카오 실시간
    // 데이터와 달리 캐시 금지 제약 없음, 07 문서 참고) 매번 새로 불러올 필요가 없다. sessionStorage에
    // 담아 같은 탭에서 재방문할 때는 네트워크 왕복 없이 즉시 칩을 그린다(브라우저/탭을 닫으면 자연히
    // 비워져서 카테고리가 실제로 바뀌어도 오래 안 남는다).
    var CATEGORY_CACHE_KEY = "eatty.restaurantCategories";
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(CATEGORY_CACHE_KEY) || "null"); } catch (e) { cached = null; }
    if (cached) {
      renderCategoryChips(cached);
    } else {
      Api.request("/api/restaurants/categories").then(function (categories) {
        renderCategoryChips(categories);
        try { sessionStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(categories)); } catch (e) { /* 용량 초과 무시 */ }
      }).catch(function () {});
    }

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
  if (priceFilterList) {
    priceFilterList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-price]");
      if (!btn) return;
      priceMin = Number(btn.getAttribute("data-price-min") || 0);
      priceMax = Number(btn.getAttribute("data-price-max") || 50000);
      syncMoreFilterPriceUI();
      searchArea();
    });
  }

  var filterResetBtn = document.getElementById("filterResetBtn");
  if (filterResetBtn) {
    filterResetBtn.addEventListener("click", function () {
      selectedCategoryId = null; priceMin = 0; priceMax = 50000; openNowOnly = false;
      searchInput.value = "";
      if (categoryFilterList) {
        categoryFilterList.querySelectorAll("[data-category-id], [data-category='all']").forEach(function (b) {
          b.setAttribute("aria-pressed", b.getAttribute("data-category") === "all" ? "true" : "false");
        });
      }
      document.querySelectorAll('[data-price]').forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-price") === "all" ? "true" : "false"); });
      if (openNowSwitch) openNowSwitch.checked = false;
      minRatingFilter = 0;
      resetMoreFilterUI();
      searchArea();
    });
  }

  // ==========================================================
  // 상세 필터 모달(2026-08-12 추가) — 지금까지 화면에만 있고 뒤에 아무 JS도 없어서 슬라이더를
  // 움직여도 값 표시가 그대로였고 "적용하기"도 실제로 검색에 반영되지 않던 걸 발견해서 구현.
  // ==========================================================
  var priceMinHandle = document.getElementById("priceMinHandle");
  var priceMaxHandle = document.getElementById("priceMaxHandle");
  var priceRangeFill = document.getElementById("priceRangeFill");
  var priceMinValue = document.getElementById("priceMinValue");
  var priceMaxValue = document.getElementById("priceMaxValue");
  var priceRangeLabel = document.getElementById("priceRangeLabel");
  var filterMinRating = document.getElementById("filterMinRating");
  var filterMinRatingText = document.getElementById("filterMinRatingText");
  var filterDistance = document.getElementById("filterDistance");
  var filterDistanceText = document.getElementById("filterDistanceText");
  var moreFilterApplyBtn = document.getElementById("moreFilterApplyBtn");
  var moreFilterResetBtn = document.getElementById("moreFilterResetBtn");
  var PRICE_HANDLE_MAX = 50000;
  var DISTANCE_MIN = 300, DISTANCE_MAX = 3000;

  function formatWon(v) {
    return v >= PRICE_HANDLE_MAX ? "5만원+" : Number(v).toLocaleString() + "원";
  }
  function formatDistance(v) {
    return v < 1000 ? v + "m" : (v / 1000).toFixed(1).replace(/\.0$/, "") + "km";
  }

  function renderPriceRangeUI(min, max) {
    if (priceMinValue) priceMinValue.textContent = formatWon(min);
    if (priceMaxValue) priceMaxValue.textContent = formatWon(max);
    if (priceRangeLabel) priceRangeLabel.textContent = (min <= 0 && max >= PRICE_HANDLE_MAX) ? "전체" : formatWon(min) + " ~ " + formatWon(max);
    if (priceRangeFill) {
      var left = (min / PRICE_HANDLE_MAX) * 100;
      var right = 100 - (max / PRICE_HANDLE_MAX) * 100;
      priceRangeFill.style.left = left + "%";
      priceRangeFill.style.right = right + "%";
    }
  }

  function syncMoreFilterPriceUI() {
    if (priceMinHandle) priceMinHandle.value = priceMin;
    if (priceMaxHandle) priceMaxHandle.value = priceMax;
    renderPriceRangeUI(priceMin, priceMax);
  }

  if (priceMinHandle && priceMaxHandle) {
    priceMinHandle.addEventListener("input", function () {
      var v = Math.min(Number(priceMinHandle.value), Number(priceMaxHandle.value));
      priceMinHandle.value = v;
      renderPriceRangeUI(v, Number(priceMaxHandle.value));
    });
    priceMaxHandle.addEventListener("input", function () {
      var v = Math.max(Number(priceMaxHandle.value), Number(priceMinHandle.value));
      priceMaxHandle.value = v;
      renderPriceRangeUI(Number(priceMinHandle.value), v);
    });
  }

  if (filterMinRating) {
    filterMinRating.addEventListener("input", function () {
      var v = Number(filterMinRating.value);
      if (filterMinRatingText) filterMinRatingText.textContent = v > 0 ? v.toFixed(1) + " 이상" : "전체";
    });
  }

  // 검색은 지도에 보이는 영역(bbox) 기준이라 반경 파라미터 자체가 없다 — 대신 "적용하기"를 누르면
  // 요청한 반경만큼 지도를 확대/축소해서 실제로 그 범위를 검색하게 만든다(아래 moreFilterApplyBtn).
  if (filterDistance) {
    filterDistance.addEventListener("input", function () {
      if (filterDistanceText) filterDistanceText.textContent = formatDistance(Number(filterDistance.value));
    });
  }

  function resetMoreFilterUI() {
    if (priceMinHandle) priceMinHandle.value = 0;
    if (priceMaxHandle) priceMaxHandle.value = PRICE_HANDLE_MAX;
    renderPriceRangeUI(0, PRICE_HANDLE_MAX);
    if (filterMinRating) filterMinRating.value = 0;
    if (filterMinRatingText) filterMinRatingText.textContent = "전체";
    if (filterDistance) filterDistance.value = 1000;
    if (filterDistanceText) filterDistanceText.textContent = "1km";
  }

  if (moreFilterResetBtn) moreFilterResetBtn.addEventListener("click", resetMoreFilterUI);

  if (moreFilterApplyBtn) {
    moreFilterApplyBtn.addEventListener("click", function () {
      if (priceMinHandle && priceMaxHandle) {
        priceMin = Number(priceMinHandle.value);
        priceMax = Number(priceMaxHandle.value);
        document.querySelectorAll("[data-price]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      }
      minRatingFilter = filterMinRating ? Number(filterMinRating.value) : 0;
      if (map && filterDistance) {
        var radiusMeters = Number(filterDistance.value);
        var center = map.getCenter();
        var dLat = radiusMeters / 111000;
        var dLng = radiusMeters / (111000 * Math.cos(center.y * Math.PI / 180));
        map.fitBounds(new naver.maps.LatLngBounds(
          new naver.maps.LatLng(center.y - dLat, center.x - dLng),
          new naver.maps.LatLng(center.y + dLat, center.x + dLng)
        ));
      }
      searchArea();
    });
  }

  // 초기 렌더 값(HTML 기본값)과 라벨을 맞춘다.
  renderPriceRangeUI(0, PRICE_HANDLE_MAX);

  // "영업중만" 토글(2026-08-03) — 사업자가 영업시간을 등록한 가게만 대상으로 서버(openNow 파라미터)가
  // 실제로 필터링한다. 영업시간 미등록 가게는 열려있는지 알 방법이 없어 결과에서 함께 빠진다.
  var openNowSwitch = document.getElementById("openNowSwitch");
  if (openNowSwitch) {
    openNowSwitch.addEventListener("change", function () {
      openNowOnly = openNowSwitch.checked;
      searchArea();
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
  // 2026-08-09 추가 — "현재 위치로 이동"만 하고 실제로 그 위치가 어딘지 지도 위에 표시가 안 되던 문제.
  // 처음엔 네이버 지도의 기본(빨간 핀) 마커를 그대로 썼는데, "네이버 지도 앱이 실제로 쓰는 파란 점
  // 스타일로 해달라"는 피드백으로 흰 테두리가 있는 파란 원(점) 아이콘을 직접 그려서 대체했다. 그 주변에
  // 2026-08-21 — GPS 정확도 반경(미터 단위 Circle)을 그리던 방식을 버리고, 토스 매장 지도
  // (store.tossplace.com)를 Playwright로 직접 열어 확인한 실제 구현으로 교체했다: 점 마커 뒤에
  // 화면 고정 픽셀 크기(44px)의 halo가 CSS 애니메이션(scale(1)->scale(2)->scale(1), 투명도 고정)으로
  // 펄스친다. 지도 줌/미터 단위와 무관하게 항상 같은 화면 크기로 뛴다는 게 토스 쪽과의 핵심 차이점 —
  // naver.maps.Marker의 icon.content에 halo용 div를 점과 함께 넣어서, 순수 CSS 애니메이션
  // (.e-mylocation-halo, eatty.css)으로 움직이게 한다(JS로 프레임마다 갱신하던 이전 버전보다 가볍고,
  // 실제 토스 구현과 동일한 방식).
  var MY_LOCATION_DOT_ICON = {
    content: '<div style="position:relative;width:44px;height:44px;">' +
      '<div class="e-mylocation-halo"></div>' +
      '<div style="position:absolute;left:50%;top:50%;width:20px;height:20px;margin-left:-10px;' +
      'margin-top:-10px;border-radius:50%;background:#4285F4;border:4px solid #fff;' +
      'box-shadow:0 2px 4px rgba(0,25,54,.31);"></div>' +
      '</div>',
    size: new naver.maps.Size(44, 44),
    anchor: new naver.maps.Point(22, 22),
  };
  var myLocationMarker = null;
  function clearMyLocationOverlay() {
    if (myLocationMarker) { myLocationMarker.setMap(null); myLocationMarker = null; }
  }
  var myLocationBtn = document.getElementById("myLocationBtn");
  if (myLocationBtn) {
    myLocationBtn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        Eatty.toast("이 브라우저에서는 위치 정보를 사용할 수 없습니다.", "error");
        return;
      }
      navigator.geolocation.getCurrentPosition(function (pos) {
        var here = new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        map.setCenter(here);
        // 2026-08-09 추가/수정 — 이동만 하고 확대는 안 해서 반경 원이 화면에 작게 나오던 문제.
        // 처음엔 16으로 했는데, 넓은 데스크탑 창에서는 줌 16이어도 화면에 보이는 반경이 1km를
        // 넘어가 원이 여전히 작아 보였다("이렇게 크게 해줘야" 피드백) — 17로 한 단계 더 확대한다.
        // 지금 줌이 이미 그보다 가까우면(사용자가 이미 확대해서 보고 있던 경우) 더 확대하지 않는다.
        if (map.getZoom() < 17) map.setZoom(17);
        clearMyLocationOverlay();
        myLocationMarker = new naver.maps.Marker({
          position: here, map: map, title: "현재 위치", zIndex: 200, icon: MY_LOCATION_DOT_ICON,
        });
      }, function () {
        // 2026-08-09 추가 — 위치 권한을 거부한 상태에서 버튼을 누르면 아무 반응이 없어 혼란스럽다는
        // 지적으로, 실패 콜백에 안내 토스트를 추가했다(권한 거부/타임아웃/기기 미지원 등 사유 불문 동일 문구).
        Eatty.toast("위치 권한이 없습니다.", "error");
      });
    });
  }

  // ---- 상세 패널 ----
  function renderMenus(menus) {
    var el = document.getElementById("detailTabMenu");
    if (!el) return;
    if (!menus || !menus.length) { el.innerHTML = '<p class="t-sm py-4 text-center">등록된 메뉴 정보가 없습니다.</p>'; return; }
    // 2026-08-10 발견/수정 — MenuResponseDto의 실제 JSON 필드는 menuName인데 여기선 m.name(존재하지
    // 않는 필드)을 읽고 있어서 메뉴명이 항상 빈 문자열로 표시되고 있었다.
    // 2026-08-10 재수정 — 사진이 붙은 카드형 리스트로 디자인 개선(요청: "네이버 지도 메뉴 탭처럼").
    el.innerHTML = '<div class="space-y-3">' + menus.map(function (m) {
      var thumbHtml = m.imageUrl
        ? '<img src="' + escapeHtml(m.imageUrl) + '" class="w-full h-full object-cover" alt="' + escapeHtml(m.menuName) + ' 사진">'
        : '<div class="w-full h-full grid place-items-center" style="color:var(--ink-200)">' +
            '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/>' +
            '</svg></div>';
      return (
        '<div class="flex items-start gap-3.5 p-3.5 rounded-[var(--r)] border border-[var(--line-soft)]">' +
          '<div class="min-w-0 flex-1">' +
            // 사업자 쪽 "시그니처 메뉴로 지정" 문구와 용어 통일(2026-08-10 — "대표"는 다른 뜻으로 보일 수 있음).
            (m.signature ? '<span class="e-badge e-badge--brand-solid mb-1.5">시그니처</span>' : "") +
            '<p class="text-[15px] font-extrabold text-[var(--ink-900)] leading-snug">' + escapeHtml(m.menuName) + '</p>' +
            (m.description ? '<p class="t-xs mt-1 leading-relaxed" style="color:var(--ink-500)">' + escapeHtml(m.description) + '</p>' : "") +
            '<p class="text-sm font-bold text-[var(--ink-800)] mt-2">' + (m.price != null ? Number(m.price).toLocaleString() + "원" : "") + '</p>' +
          '</div>' +
          '<div class="w-20 h-20 rounded-[var(--r-md)] overflow-hidden flex-none" style="background:var(--bg-muted)">' + thumbHtml + '</div>' +
        '</div>'
      );
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
        // 리뷰 사진(2026-08-10 추가) — 최대 3장, 등록 순서대로. 클릭 시 크게 보기(2026-08-18 추가,
        // eatty-ui.js의 공용 라이트박스 재사용) — data-lightbox 속성만 붙이면 클릭 위임이 처리한다.
        var photos = (r.images || []).map(function (img) {
          return '<img src="' + escapeHtml(img.imageUrl) + '" class="w-16 h-16 rounded-[var(--r-md)] object-cover flex-none cursor-pointer" alt="리뷰 사진" data-lightbox="' + escapeHtml(img.imageUrl) + '">';
        }).join("");
        // OCR 인식 메뉴(2026-08-18 추가) — 작성자가 "공개"로 설정한 경우에만 menuItems가 채워져서 옴.
        // 2026-08-18 수정 — 전체를 태그로 나열하면 메뉴가 많을 때 리뷰 카드가 너무 길어져서, 첫 번째
        // 메뉴명 하나만 대표로 보여주고 나머지는 "외 N개"로 축약한다.
        var menuItems = "";
        if (r.menuItems && r.menuItems.length) {
          var firstMenuName = escapeHtml(r.menuItems[0].name);
          var restMenuCount = r.menuItems.length - 1;
          menuItems = '<span class="e-tag">' + firstMenuName + (restMenuCount > 0 ? ' 외 ' + restMenuCount + '개' : '') + '</span>';
        }
        // 작성자 프로필 사진(2026-08-10 추가) — 미설정이면 닉네임 첫 글자 이니셜 아바타로 대체.
        var avatarHtml = r.profileImageUrl
          ? '<img src="' + escapeHtml(r.profileImageUrl) + '" class="e-avatar e-avatar-sm" alt="' + escapeHtml(r.nickname) + '">'
          : '<span class="e-avatar e-avatar-sm" aria-hidden="true">' + escapeHtml((r.nickname || "?").charAt(0)) + '</span>';
        // 2026-08-10 — 메뉴 탭과 통일감 있게 각 리뷰를 박스(카드)로 감싸도록 디자인 변경(기존엔
        // 구분선만 있는 이어붙인 리스트였음).
        return '<li class="p-3.5 rounded-[var(--r)] border border-[var(--line-soft)]">' +
          '<div class="flex items-center justify-between gap-2">' +
          '<div class="flex items-center gap-2">' + avatarHtml +
          '<span class="text-sm font-extrabold text-[var(--ink-900)]">' + escapeHtml(r.nickname) + '</span>' +
          (isEdited(r) ? '<span class="t-xs" style="color:var(--ink-400)">수정됨</span>' : "") +
          '</div>' +
          '<span class="e-rating">' + starsHtml(r.rating) + '<span class="e-rating-score">' + Number(r.rating).toFixed(1) + '</span></span>' +
          '</div>' +
          (keywords ? '<div class="flex flex-wrap gap-1 mt-2">' + keywords + '</div>' : "") +
          '<p class="t-sm mt-2.5 leading-relaxed">' + escapeHtml(r.content) + '</p>' +
          (menuItems ? '<div class="flex flex-wrap gap-1 mt-2">' + menuItems + '</div>' : "") +
          (photos ? '<div class="flex flex-wrap gap-2 mt-2.5">' + photos + '</div>' : "") +
          '<div class="flex items-center gap-1 mt-2">' +
          // "도움됨"(2026-08-12 추가) — 본인 리뷰인지는 이 응답만으로는 알 수 없어(작성자 memberId를
          // 안 내려줌) 버튼은 항상 보여주고, 본인 리뷰를 눌렀을 때만 서버가 REVIEW_HELPFUL_SELF_NOT_ALLOWED로
          // 거부하면 그 메시지를 토스트로 보여준다.
          '<button type="button" class="btn btn-ghost btn-xs inline-flex items-center gap-1' + (r.helpfulByMe ? " is-active" : "") + '" ' +
            'data-toggle-helpful="' + r.reviewId + '" aria-pressed="' + (r.helpfulByMe ? "true" : "false") + '" style="' + (r.helpfulByMe ? "color:var(--brand-600)" : "") + '">' +
            '<svg style="width:13px;height:13px" viewBox="0 0 24 24" fill="' + (r.helpfulByMe ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 22V11M2 13v7a2 2 0 0 0 2 2h12.6a2 2 0 0 0 2-1.7l1.2-8a2 2 0 0 0-2-2.3H14V4a2 2 0 0 0-2-2h-.5a1 1 0 0 0-1 .8L9 8.5 7 11"/></svg>' +
            '<span>도움돼요</span> <span data-helpful-count>' + (r.helpfulCount || 0) + '</span>' +
          '</button>' +
          '<button type="button" class="btn btn-ghost btn-xs inline-flex items-center gap-1" data-report-review="' + r.reviewId + '">' +
            '<svg style="width:13px;height:13px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4h11l-1 3h6l-1 4 1 4h-8l1-3H4"/></svg>' +
            '신고' +
          '</button>' +
          '</div>' +
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

    el.querySelectorAll("[data-toggle-helpful]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
        var reviewId = btn.getAttribute("data-toggle-helpful");
        btn.disabled = true;
        Api.request("/api/reviews/" + reviewId + "/helpful-votes", { method: "POST" })
          .then(function (res) {
            btn.setAttribute("aria-pressed", res.helpfulByMe ? "true" : "false");
            btn.classList.toggle("is-active", res.helpfulByMe);
            btn.style.color = res.helpfulByMe ? "var(--brand-600)" : "";
            btn.querySelector("svg").setAttribute("fill", res.helpfulByMe ? "currentColor" : "none");
            btn.querySelector("[data-helpful-count]").textContent = res.helpfulCount;
          })
          .catch(function (err) { Eatty.toast(err.message || "처리에 실패했습니다.", "error"); })
          .finally(function () { btn.disabled = false; });
      });
    });
  }

  var reportTargetReviewId = null;
  var reportSubmitBtn = document.getElementById("reportSubmitBtn");
  if (reportSubmitBtn) {
    reportSubmitBtn.addEventListener("click", function () {
      var reason = document.getElementById("reportReasonSelect").value;
      var detail = document.getElementById("reportDetail").value.trim();
      if (!reason) { Eatty.toast("신고 사유를 선택해주세요.", "error"); return; }
      Api.request("/api/reviews/" + reportTargetReviewId + "/reports", { method: "POST", body: { reasonCode: reason, detail: detail } })
        .then(function () { Eatty.closeModal("reportModal"); Eatty.toast("신고가 접수되었습니다.", "success"); })
        .catch(function (err) { Eatty.toast(err.message || "신고에 실패했습니다.", "error"); });
    });
  }

  function weekdayLabel(n) {
    return ["일", "월", "화", "수", "목", "금", "토"][n] || "";
  }
  var AMENITY_LABELS = {
    parking: "주차 가능", wifi: "와이파이", pet: "반려동물", kids: "유아 의자",
    delivery: "배달", takeout: "포장", group: "단체석", barrierFree: "휠체어 접근"
  };
  // "HH:mm:ss" -> "HH:mm" (백엔드가 LocalTime을 초 단위까지 그대로 내려준다).
  function hhmm(t) {
    return t ? t.slice(0, 5) : "";
  }
  function toMinutes(t) {
    if (!t) return null;
    var parts = t.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  // 네이버지도 앱처럼 "영업 중 · 22:00에 영업 종료" 요약 한 줄 + 클릭 시 월~일 목록 펼침(2026-08-10).
  // 필드명 주의: BusinessHourResponseDto.isClosed()는 Jackson이 "closed"로 직렬화한다(is 접두어 제거).
  var MON_TO_SUN = [1, 2, 3, 4, 5, 6, 0];
  function renderHours(businessHours, tempClosed) {
    var summaryEl = document.getElementById("detailHoursSummary");
    var caretEl = document.getElementById("detailHoursCaret");
    var listEl = document.getElementById("detailHoursList");
    var toggleBtn = document.getElementById("detailHoursToggle");
    if (!summaryEl || !listEl || !toggleBtn) return;

    // 사업자가 "임시 휴업" 토글을 켠 경우 영업시간표와 무관하게 항상 휴업으로 표시한다(2026-08-10).
    if (tempClosed) {
      summaryEl.textContent = "임시 휴업 중";
      if (caretEl) caretEl.hidden = true;
      listEl.hidden = true;
      listEl.innerHTML = "";
      toggleBtn.onclick = null;
      return;
    }

    if (!businessHours || !businessHours.length) {
      summaryEl.textContent = "영업시간 정보가 없습니다.";
      if (caretEl) caretEl.hidden = true;
      listEl.hidden = true;
      listEl.innerHTML = "";
      toggleBtn.onclick = null;
      return;
    }

    var byDay = {};
    businessHours.forEach(function (h) { byDay[h.dayOfWeek] = h; });
    var now = new Date();
    var today = now.getDay(); // 0=일 ~ 6=토, dayOfWeek와 동일한 기준
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var todayHours = byDay[today];

    var summary;
    if (!todayHours || todayHours.closed) {
      summary = "오늘 휴무";
    } else {
      var openMin = toMinutes(todayHours.openTime);
      var closeMin = toMinutes(todayHours.closeTime);
      // 요일이 "휴무 아님"으로 저장돼 있어도 아직 시간을 등록 안 했으면(openTime/closeTime 둘 다 null)
      // "영업 종료"라고 단정할 근거가 없다 — 등록 자체가 안 된 걸로 안내한다.
      if (openMin == null || closeMin == null) {
        summary = "영업시간 정보가 없습니다.";
      } else if (nowMin >= openMin && nowMin < closeMin) {
        summary = "영업 중 · " + hhmm(todayHours.closeTime) + "에 영업 종료";
      } else if (nowMin < openMin) {
        summary = "영업 전 · " + hhmm(todayHours.openTime) + "에 영업 시작";
      } else {
        summary = "영업 종료";
      }
    }
    summaryEl.textContent = summary;
    if (caretEl) caretEl.hidden = false;

    listEl.innerHTML = MON_TO_SUN.map(function (dayOfWeek) {
      var h = byDay[dayOfWeek];
      var isToday = dayOfWeek === today;
      var text;
      if (!h || h.closed) {
        text = "정기휴무";
      } else if (h.openTime && h.closeTime) {
        text = hhmm(h.openTime) + " - " + hhmm(h.closeTime);
      } else {
        text = "시간 미등록";
      }
      return '<li class="flex gap-2' + (isToday ? " font-bold text-[var(--ink-900)]" : "") + '">' +
        '<span class="w-4 flex-none">' + escapeHtml(weekdayLabel(dayOfWeek)) + '</span>' +
        '<span>' + escapeHtml(text) + '</span></li>';
    }).join("");

    listEl.hidden = true;
    toggleBtn.setAttribute("aria-expanded", "false");
    if (caretEl) caretEl.style.transform = "";
    toggleBtn.onclick = function () {
      var expanded = toggleBtn.getAttribute("aria-expanded") === "true";
      listEl.hidden = expanded;
      toggleBtn.setAttribute("aria-expanded", expanded ? "false" : "true");
      if (caretEl) caretEl.style.transform = expanded ? "" : "rotate(180deg)";
    };
  }

  function openDetail(item) {
    currentDetail = item;
    detailPanel.hidden = false;
    detailPanel.classList.add("is-open");
    detailPanel.setAttribute("aria-hidden", "false");
    document.getElementById("directionsResult").hidden = true;
    if (directionsLine) { directionsLine.setMap(null); directionsLine = null; }
    var tagDistWrap = document.getElementById("detailTagDistWrap");
    if (tagDistWrap) tagDistWrap.hidden = true;
    renderHours(null);

    document.getElementById("detailShopName").textContent = item.name;
    var categoryEl = document.getElementById("detailCategory");
    categoryEl.textContent = item.category || "";
    categoryEl.hidden = !item.category;
    document.getElementById("detailRating").innerHTML = starsHtml(item.averageRating) +
      '<span class="e-rating-score">' + (item.averageRating != null ? Number(item.averageRating).toFixed(1) : "-") + '</span>';
    document.getElementById("detailReviewCount").textContent = item.reviewCount || 0;
    // 리뷰 작성이 영수증 인증 필수라서(2026-07-23 정책) 전체 리뷰 수 = 영수증 인증 리뷰 수다.
    var receiptBadgeEl = document.getElementById("detailReceiptReviewCount");
    if (receiptBadgeEl) receiptBadgeEl.textContent = item.reviewCount || 0;
    var reviewTabCountEl = document.getElementById("detailReviewTabCount");
    if (reviewTabCountEl) reviewTabCountEl.textContent = item.reviewCount || 0;
    document.getElementById("detailAddress").textContent = item.roadAddress || item.address || "";

    // 상세 갤러리 — 목록에서 이미 알고 있는 대표 이미지로 우선 보여주고(즉시 표시), 아래 상세 조회가
    // 끝나면 전체 갤러리(여러 장)로 다시 채운다. 매번 0번(대표)부터 시작한다.
    detailImages = item.imageUrl ? [item.imageUrl] : [];
    detailImageIndex = 0;
    renderDetailImage();

    var favBtn = document.getElementById("favoriteBtn");
    favBtn.setAttribute("aria-pressed", item.favorite ? "true" : "false");
    favBtn.classList.toggle("is-active", !!item.favorite);
    document.getElementById("favoriteLabel").textContent = item.favorite ? "저장됨" : "저장";

    var callBtn = document.getElementById("callBtn");
    var writeReviewBtn = document.getElementById("writeReviewBtn");
    if (writeReviewBtn) {
      // restaurantId만 URL에 남기고(딥링크/새로고침용 식별자일 뿐), 가게 이름/주소/좌표 같은 실제
      // 표시 정보는 URL이 아니라 이 시점에 sessionStorage에 통째로 심어두는 스냅샷에서만 읽는다
      // (2026-08-05 강화) — restaurantId는 그대로 두고 name 등 다른 파라미터만 주소창에서 바꿔서
      // 엉뚱한 가게 이름으로 리뷰를 남기려는 시도를 막기 위함. receipt-upload.js는 URL의 name/address
      // 등은 아예 신뢰하지 않는다.
      writeReviewBtn.setAttribute("href", "receipt-upload?restaurantId=" + encodeURIComponent(item.restaurantId));
      writeReviewBtn.onclick = function () {
        sessionStorage.setItem("ru_entry_restaurant", JSON.stringify({
          restaurantId: item.restaurantId,
          name: item.name || "",
          address: item.address || "",
          roadAddress: item.roadAddress || "",
          latitude: item.latitude != null ? item.latitude : null,
          longitude: item.longitude != null ? item.longitude : null,
          category: item.category || null,
        }));
        sessionStorage.setItem("ru_entry_at", String(Date.now()));
      };
    }

    var shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.onclick = function () {
        var shareParams = new URLSearchParams();
        shareParams.set("shopId", item.restaurantId);
        if (item.name) shareParams.set("name", item.name);
        if (item.category) shareParams.set("category", item.category);
        if (item.address) shareParams.set("address", item.address);
        if (item.roadAddress) shareParams.set("roadAddress", item.roadAddress);
        if (item.latitude != null) shareParams.set("latitude", item.latitude);
        if (item.longitude != null) shareParams.set("longitude", item.longitude);
        var longPath = "explore?" + shareParams.toString();
        var longUrl = window.location.origin + "/" + longPath;

        function fallbackCopy(text) {
          var textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          var ok = false;
          try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
          document.body.removeChild(textarea);
          return ok;
        }
        function copyLink(text) {
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function () {
              Eatty.toast("링크를 복사했습니다.", "success");
            }).catch(function () {
              var copied = fallbackCopy(text);
              Eatty.toast(copied ? "링크를 복사했습니다." : "링크 복사에 실패했습니다.", copied ? "success" : "error");
            });
          } else if (fallbackCopy(text)) {
            Eatty.toast("링크를 복사했습니다.", "success");
          } else {
            Eatty.toast("링크 복사에 실패했습니다.", "error");
          }
        }

        // 공유 동작(2026-08-24 변경 — 그전에는 앱에서 곧바로 네이티브 공유 시트를 띄웠다).
        //   iOS 앱  → 선택 모달(#shareChoiceModal): 카카오톡 메시지 템플릿 / 링크 복사 / 다른 앱으로 공유
        //   그 외    → 링크를 클립보드에 복사. **모바일 브라우저도 여기에 포함된다.**
        //
        // ⚠️ navigator.share(Web Share API)는 **일부러 쓰지 않는다.** 한때 "앱이 아니면 navigator.share를
        // 먼저 시도"하도록 돼 있었는데, 그러면 모바일 Safari/Chrome에서도 시스템 공유 시트가 떠버린다.
        // 웹에서는 링크 복사로 통일해달라는 요청이라 그 분기를 없앴다(다시 넣지 말 것).
        //
        // 자세한 배경(공유 시트를 가로챌 수 없는 이유, 재빌드가 필요 없는 이유)은 파일 상단
        // "공유 — 카카오 메시지 템플릿" 섹션 주석에 정리해두었다.

        // 2026-08-09 추가 — 원래는 이 긴 쿼리스트링 URL을 그대로 복사했는데("너무 길어서 보기 안 좋다"는
        // 지적) 서버에서 짧은 코드를 발급받아 그걸 공유한다. 발급 실패(네트워크 오류 등)해도 공유 자체가
        // 막히면 안 되니 원래의 긴 URL로 조용히 대체한다(fail-open).
        // code는 카카오 사용자 정의 템플릿에 그대로 넘어간다(템플릿 링크가 .../s/${CODE} 고정).
        // 발급 실패 시 code는 null이고, 그 경우 카카오 공유는 기본 템플릿으로 폴백한다.
        var sharePromise = Api.request("/api/short-links", { method: "POST", auth: false, body: { path: longPath } })
          .then(function (res) { return { url: window.location.origin + "/s/" + res.code, code: res.code }; })
          .catch(function () { return { url: longUrl, code: null }; });

        // 앱 판별은 브릿지 존재 여부로 한다(api.js의 isInIosApp). 개별 기능 지원 여부는
        // openShareChoice 안에서 EattyWayNativeCaps로 따로 확인한다.
        var inApp = !!(window.EattyWayApp && window.EattyWayApp.isInIosApp && window.EattyWayApp.isInIosApp());
        if (!inApp) {
          sharePromise.then(function (s) { copyLink(s.url); });
          return;
        }
        openShareChoice(item, sharePromise, copyLink);
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
        renderHours(detail.businessHours, detail.businessStatus === "TEMP_CLOSED");
        // 2026-08-21 수정 — 전화번호가 없는 가게는 href="tel:"(빈 번호)라 iOS에서 "잘못된 요청"류
        // 팝업조차 안 뜨고 조용히 실패하던 문제. 실제 없는 번호(010-0000-0000)로 걸게 해서, iOS
        // 통화 앱이 "없는 번호입니다" 안내를 정상적으로 띄우게 한다.
        if (callBtn) callBtn.setAttribute("href", "tel:" + (detail.phone || "010-0000-0000"));
        renderMenus(detail.menus);

        detailImages = (detail.images && detail.images.length) ? detail.images : (detail.imageUrl ? [detail.imageUrl] : []);
        detailImageIndex = 0;
        renderDetailImage();

        var tagsWrap = document.getElementById("detailTagsWrap");
        var tagsEl = document.getElementById("detailTags");
        if (tagsWrap && tagsEl) {
          var amenities = detail.amenities || [];
          if (amenities.length) {
            tagsEl.innerHTML = amenities.map(function (a) {
              return '<span class="e-tag">' + escapeHtml(AMENITY_LABELS[a] || a) + '</span>';
            }).join("");
            tagsWrap.hidden = false;
          } else {
            tagsEl.innerHTML = "";
            tagsWrap.hidden = true;
          }
        }

        var introWrap = document.getElementById("detailIntroWrap");
        var introEl = document.getElementById("detailIntro");
        if (introWrap && introEl) {
          if (detail.description) {
            introEl.textContent = detail.description;
            introWrap.hidden = false;
          } else {
            introEl.textContent = "";
            introWrap.hidden = true;
          }
        }
      })
      .catch(function () {});

    Api.request("/api/restaurants/" + encodeURIComponent(item.restaurantId) + "/reviews", { auth: false })
      .then(renderReviewsTab)
      .catch(function () { renderReviewsTab([]); });

    if (item.latitude != null && item.longitude != null) {
      loadParking(item.latitude, item.longitude, 2000);
    }
  }

  function closeDetail() {
    detailPanel.classList.remove("is-open");
    detailPanel.setAttribute("aria-hidden", "true");
    detailPanel.hidden = true;
    currentDetail = null;
    if (directionsLine) { directionsLine.setMap(null); directionsLine = null; }
  }

  document.getElementById("detailCloseBtn").addEventListener("click", closeDetail);

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
      document.getElementById("favoriteLabel").textContent = item.favorite ? "저장됨" : "저장";
    }).catch(function (err) { Eatty.toast(err.message || "즐겨찾기 처리에 실패했습니다.", "error"); })
      .finally(function () { btn.disabled = false; });
  });

  // ---- 길찾기(자동차 경로만 실제 지원 — NCP Direction 5 한계) ----
  // 2026-08-20 수정 — 실패 시 화면에 계속 남는 경고 박스 대신 토스트로 안내하고 결과 영역은
  // 다시 숨긴다. 또한 실패 원인(위치 정보 자체를 못 가져온 것인지, API 호출이 실패한 것인지)을
  // 구분해서 토스트 문구를 다르게 보여준다 — 예전엔 둘 다 "위치 권한을 확인하세요"로 뭉뚱그려서,
  // 실제로는 위치 권한을 이미 허용했는데도(iOS 앱 등) 같은 문구가 떠서 원인 파악이 어려웠다.
  // 2026-08-20 추가 — iOS 앱(WKWebView)에서 위치 권한을 방금 허용했거나 앱을 막 열었을 때,
  // 첫 getCurrentPosition 호출이 시스템 쪽 초기화 타이밍 문제로 실패하는 경우가 있었다(권한은
  // 켜져 있는데도 실패). PERMISSION_DENIED/POSITION_UNAVAILABLE이면 무조건 포기하지 않고
  // 한 번 더 조용히 재요청해보고, 그래도 안 되면 그때 토스트로 알린다.
  function getLocationWithRetry(onSuccess, onFail, triedOnce) {
    navigator.geolocation.getCurrentPosition(onSuccess, function (geoErr) {
      if (!triedOnce && (geoErr.code === 1 || geoErr.code === 2)) {
        getLocationWithRetry(onSuccess, onFail, true);
        return;
      }
      onFail(geoErr);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  document.getElementById("directionBtn").addEventListener("click", function () {
    if (!currentDetail) return;
    var resultEl = document.getElementById("directionsResult");
    resultEl.hidden = false;
    document.getElementById("directionsLoading").hidden = false;
    document.getElementById("directionsBody").hidden = true;

    if (!navigator.geolocation) {
      resultEl.hidden = true;
      Eatty.toast("이 브라우저에서는 위치 정보를 지원하지 않습니다.", "error");
      return;
    }
    getLocationWithRetry(function (pos) {
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
        .catch(function (err) {
          resultEl.hidden = true;
          Eatty.toast((err && err.message) || "경로를 찾지 못했습니다. 잠시 후 다시 시도해주세요.", "error");
        });
    }, function (geoErr) {
      resultEl.hidden = true;
      // geoErr.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT — 여기 오는 시점엔
      // 이미 getLocationWithRetry가 한 번 재시도한 뒤라는 뜻.
      var msg = geoErr && geoErr.code === 1
        ? "위치 권한이 꺼져있어요. 권한을 허용한 뒤 다시 시도해주세요."
        : "현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.";
      Eatty.toast(msg, "error");
    });
  });

  // 대중교통/도보 경로는 실제로 지원하는 API가 없다(NCP Direction 5는 자동차 경로만 지원) — 자동차 결과만 보여준다.
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
          listEl.innerHTML = '<p class="t-sm py-4 text-center">주변에 등록된 주차장이 없습니다.</p>';
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
    var mapLoadingOverlay = document.getElementById("mapLoadingOverlay");
    naver.maps.Event.addListener(map, "dragend", function () { if (researchAreaBtn) researchAreaBtn.parentElement.style.display = ""; updateRadiusBadge(); });
    naver.maps.Event.addListener(map, "zoom_changed", function () { if (researchAreaBtn) researchAreaBtn.parentElement.style.display = ""; updateRadiusBadge(); });

    var qp = new URLSearchParams(window.location.search);
    var sharedShopId = qp.get("shopId");
    var initialKeyword = qp.get("q");
    var handoff = readRecommendHandoff();
    if (handoff) {
      if (researchAreaBtn) researchAreaBtn.parentElement.style.display = "none";
      renderResults(handoff.items, true);
      var bounds = new naver.maps.LatLngBounds();
      handoff.items.forEach(function (it) { bounds.extend(new naver.maps.LatLng(it.latitude, it.longitude)); });
      map.fitBounds(bounds);
      updateRadiusBadge();
      if (mapLoadingOverlay) mapLoadingOverlay.hidden = true;
    } else if (sharedShopId) {
      // 2026-08-20 수정 — 여기서 바로 오버레이를 걷어버리면 상세정보 API 응답(비동기)이 오기 전까지
      // 그 사이에 지도/탐색 화면이 그대로 보였다가 상세 패널이 뜨는 깜빡임이 있었다(영수증 리뷰 X
      // 버튼으로 들어올 때 지적받음). openSharedRestaurant()가 끝난 뒤(성공/실패 모두)에 걷도록 미룬다.
      openSharedRestaurant(sharedShopId, qp, mapLoadingOverlay);
    } else if (initialKeyword && initialKeyword.trim()) {
      if (searchInput) searchInput.value = initialKeyword.trim();
      searchKeyword(initialKeyword.trim());
      if (mapLoadingOverlay) mapLoadingOverlay.hidden = true;
    } else {
      searchArea();
      if (mapLoadingOverlay) mapLoadingOverlay.hidden = true;
    }
  }

  // AI 추천 결과 "지도에서 모두 보기"(2026-08-13 추가) — recommend.js가 sessionStorage에 남겨둔 결과를
  // 한 번만 읽어서 쓰고 바로 지운다(단발성, 그 다음 explore 방문부터는 평소처럼 주변 검색).
  function readRecommendHandoff() {
    var KEY = "eatty.recommendMapHandoff";
    var raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    try {
      var data = JSON.parse(raw);
      if (!data || !data.items || !data.items.length) return null;
      if (Date.now() - (data.savedAt || 0) > 10 * 60 * 1000) return null; // 10분 지나면 stale로 간주
      return data;
    } catch (e) { return null; }
  }

  // 공유 링크(?shopId=...)로 들어온 경우 — 카카오는 place id 단건 재조회가 안 되므로 링크에
  // 함께 실어보낸 name/address/roadAddress/latitude/longitude 를 그대로 상세조회 API에 넘긴다.
  // 이 경우 지도/리스트는 주변 전체가 아니라 공유받은 그 가게 하나만 보여준다(searchArea() 미호출).
  function openSharedRestaurant(shopId, qp, mapLoadingOverlay) {
    var name = qp.get("name") || "";
    var categoryQ = qp.get("category") || "";
    var address = qp.get("address") || "";
    var roadAddress = qp.get("roadAddress") || "";
    var latQ = qp.get("latitude");
    var lngQ = qp.get("longitude");
    if (latQ && lngQ) map.setCenter(new naver.maps.LatLng(Number(latQ), Number(lngQ)));
    if (researchAreaBtn) researchAreaBtn.parentElement.style.display = "none";
    showLoading();
    Api.request("/api/restaurants/" + encodeURIComponent(shopId) +
      "?name=" + encodeURIComponent(name) +
      "&address=" + encodeURIComponent(address) +
      "&roadAddress=" + encodeURIComponent(roadAddress) +
      (latQ ? "&latitude=" + latQ : "") +
      (lngQ ? "&longitude=" + lngQ : ""))
      .then(function (detail) {
        var item = {
          restaurantId: detail.restaurantId || shopId,
          name: detail.name || name,
          category: detail.category || categoryQ || null,
          averageRating: detail.averageRating,
          reviewCount: detail.reviewCount,
          address: detail.address || address,
          roadAddress: detail.roadAddress || roadAddress,
          latitude: detail.latitude != null ? Number(detail.latitude) : (latQ ? Number(latQ) : null),
          longitude: detail.longitude != null ? Number(detail.longitude) : (lngQ ? Number(lngQ) : null),
          favorite: detail.favorite,
          imageUrl: detail.imageUrl,
        };
        renderResults([item], true);
        if (item.latitude != null && item.longitude != null) {
          map.setCenter(new naver.maps.LatLng(item.latitude, item.longitude));
        }
        openDetail(item);
      })
      .catch(function () {
        renderResults([]);
        Eatty.toast("공유된 가게 정보를 불러오지 못했습니다.", "error");
      })
      .finally(function () {
        if (mapLoadingOverlay) mapLoadingOverlay.hidden = true;
      });
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
