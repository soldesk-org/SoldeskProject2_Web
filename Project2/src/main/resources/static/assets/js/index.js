/* 인기 검색 칩 클릭 시 검색창 채우기 */
document.addEventListener('click', function (e) {
  var chip = e.target.closest('[data-keyword]');
  if (!chip) return;
  var input = document.getElementById('heroSearchInput');
  if (input) { input.value = chip.getAttribute('data-keyword'); input.focus(); }
});

/* 헤더 드롭다운/드로어의 닉네임(헤드)·이메일(드로어)·음식 취향 찾기 배지는 2026-08-12부터 api.js
   initNavAuthUI()가 모든 페이지 공통으로 채운다(중복 GET /api/members/me 호출을 피하기 위해 이전
   해왔던 이 페이지 전용 로직은 제거) — index.js는 헤더 관련 로직을 더 이상 담당하지 않는다. */

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
      // 좌표가 거의 같은 가게(같은 건물 다른 층 등)가 있으면 마커가 완전히 겹쳐서 하나만 보이는 문제
      // (2026-08-10 발견) — 실제 위치를 임의로 바꾸는 대신, 이미 사용한 좌표와 너무 가까우면 시각적으로만
      // 떨어뜨려서 표시한다. 소개용 미니 지도라 이 정도 오차는 실사용에 영향 없음.
      // (2026-08-14 3차 수정) — 실제 원인은 "겹침으로 판정하는 기준(11m)" 자체가 이 지도의 축소 배율에
      // 비해 너무 좁았던 것이었다. 이 미니 지도는 검색 범위가 넓어(반경 약 880m) fitBounds가 상당히
      // 축소된 배율로 맞추는데, 그 배율에서는 11m 떨어진 서로 다른 가게도 화면에서는 마커 핀 하나 너비
      // (27px) 안쪽으로 겹쳐 보인다 — 그래서 "같은 건물"이 아니라 "같은 블록의 다른 가게"까지도 겹쳐
      // 보이는데 판정 기준을 통과 못 해 밀어내기가 아예 발동을 안 했다. 판정 기준을 약 65m로 크게 늘리고,
      // 밀어내는 거리도 그보다 확실히 크게(약 90~200m) 잡아서 실제로 벌어지게 한다.
      var usedPositions = [];
      var NEAR_THRESHOLD = 0.0006; // 위도/경도 약 65m — 이 지도의 축소 배율에서 마커 핀이 겹쳐 보이는 대략적인 거리
      function isNearAny(lat, lng) {
        return usedPositions.some(function (p) {
          return Math.abs(p.lat - lat) < NEAR_THRESHOLD && Math.abs(p.lng - lng) < NEAR_THRESHOLD;
        });
      }
      function nudgeIfOverlapping(lat, lng) {
        var attempt = 0;
        while (isNearAny(lat, lng) && attempt < 5) {
          var radius = 0.0009 + attempt * 0.0004;
          var angle = Math.random() * Math.PI * 2;
          lat += Math.cos(angle) * radius;
          lng += Math.sin(angle) * radius;
          attempt++;
        }
        usedPositions.push({ lat: lat, lng: lng });
        return { lat: lat, lng: lng };
      }
      list.forEach(function (item) {
        var adjusted = nudgeIfOverlapping(item.latitude, item.longitude);
        var pos = new naver.maps.LatLng(adjusted.lat, adjusted.lng);
        new naver.maps.Marker({ position: pos, map: map, title: item.name, icon: markerIcon(item.category) });
        // 지도 범위(bounds)는 밀어낸 위치가 아니라 원래 좌표 기준으로 잡는다(2026-08-14 수정) — 밀어낸
        // 위치까지 bounds에 포함시키면 fitBounds()가 그만큼 더 축소(zoom out)돼서, 밀어내는 거리를 늘려도
        // 화면 픽셀상 간격은 그대로인 문제가 있었다. 실제 가게 분포는 그대로 유지하고, 마커만 시각적으로
        // 떨어뜨려 보이게 하는 게 목적이라 bounds 계산에선 원래 좌표를 써야 맞다.
        bounds.extend(new naver.maps.LatLng(item.latitude, item.longitude));
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
