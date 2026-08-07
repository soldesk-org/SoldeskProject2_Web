/* 인기 검색 칩 클릭 시 검색창 채우기 */
document.addEventListener('click', function (e) {
  var chip = e.target.closest('[data-keyword]');
  if (!chip) return;
  var input = document.getElementById('heroSearchInput');
  if (input) { input.value = chip.getAttribute('data-keyword'); input.focus(); }
});

/* 헤더 드롭다운/드로어의 닉네임·이메일·음식 취향 찾기는 api.js가 못 채우는 중복 표시 영역이라 여기서 채운다. */
if (window.Api && Api.isLoggedIn()) {
  Api.request('/api/members/me').then(function (me) {
    ['headerNicknameHead', 'drawerNickname'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = me.nickname || '';
    });
    var drawerEmail = document.getElementById('drawerEmail');
    if (drawerEmail) drawerEmail.textContent = me.email || '';
    if (me.foodBti) {
      ['headerFoodBtiBadge', 'drawerFoodBtiBadge'].forEach(function (id) {
        var el = document.getElementById(id);
        // 배지에는 유형 코드만 보여준다(2026-08-07) — 앞에 "음식 취향 찾기 ·" 같은 라벨을 붙이면
        // 좁은 드롭다운에서 배지가 길어져 닉네임/이메일 줄을 밀어낸다.
        if (el) { el.textContent = me.foodBti; el.hidden = false; }
      });
    }
  }).catch(function () {});
}

/* 지도 탐색 소개 섹션의 미니 지도 — 실제 NCP Maps + 실제 음식점 3곳(강남역 인근) */
(function () {
  var mapEl = document.getElementById('heroMap');
  if (!mapEl || typeof naver === 'undefined') return;

  var CENTER = { lat: 37.4979, lng: 127.0276 }; // 강남역
  var map = new naver.maps.Map('heroMap', {
    center: new naver.maps.LatLng(CENTER.lat, CENTER.lng),
    zoom: 16,
    scaleControl: false,
    mapTypeControl: false,
    zoomControl: false,
  });

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

  var d = 0.004; // 강남역 바로 근처(약 400m 남짓)로 좁힌 바운딩 박스
  var qs = 'minLat=' + (CENTER.lat - d) + '&maxLat=' + (CENTER.lat + d) +
    '&minLng=' + (CENTER.lng - d) + '&maxLng=' + (CENTER.lng + d) + '&page=0&size=10';

  fetch('/api/restaurants/filter?' + qs)
    .then(function (res) { return res.ok ? res.json() : { restaurants: [] }; })
    .then(function (data) {
      var list = (data.restaurants || []).filter(function (r) { return r.latitude != null && r.longitude != null; }).slice(0, 10);
      if (!list.length) return;
      var bounds = new naver.maps.LatLngBounds();
      list.forEach(function (item) {
        var pos = new naver.maps.LatLng(item.latitude, item.longitude);
        new naver.maps.Marker({ position: pos, map: map, title: item.name, icon: markerIcon(item.category) });
        bounds.extend(pos);
      });
      map.fitBounds(bounds);
    })
    .catch(function () {});
})();

/* ---- 맨 위로 버튼(2026-08-07 추가) ----
   일정 이상(400px) 내려갔을 때만 보여준다. scroll 이벤트는 자주 발생하므로 requestAnimationFrame으로
   묶어서 프레임당 한 번만 계산한다. */
(function () {
  var btn = document.getElementById('backToTopBtn');
  if (!btn) return;

  var SHOW_AFTER = 400;
  var ticking = false;

  function update() {
    ticking = false;
    btn.classList.toggle('is-visible', window.scrollY > SHOW_AFTER);
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  btn.addEventListener('click', function () {
    // html의 scroll-behavior: smooth가 이미 걸려 있지만, 사용자가 "동작 줄이기"를 켠 환경까지
    // 고려해 여기서도 behavior를 명시한다.
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  update();
})();
