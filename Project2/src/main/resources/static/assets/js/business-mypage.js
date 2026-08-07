(function () {
  if (!Api.requireRole("BUSINESS")) return;

  // 이 페이지(매장 정보 수정/메뉴 관리/사진 관리/리뷰 답글/통계)는 실제로 뒷받침하는 백엔드 API가
  // 없다 — 이 프로젝트는 카카오 로컬 API 이용약관상 음식점 정보를 우리 DB에 저장/수정하지 않기로
  // 확정했고(07.음식점-메뉴-검색 참고), 사업자 계정이 "내 매장"을 소유·관리하는 기능 자체가 아직
  // 만들어지지 않았다(구 디자인의 business-mypage.js도 동일하게 탭 전환만 하는 순수 UI였음).
  // 지어낸 데이터를 실제처럼 보여주지 않도록, 있는 그대로 안내만 추가한다.
  var main = document.getElementById("mainContent");
  if (!main) return;
  var notice = document.createElement("div");
  notice.className = "e-container";
  notice.innerHTML =
    '<div class="e-alert e-alert--info mb-6">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>' +
      '<div>' +
        '<p class="e-alert-title">매장 관리 기능은 아직 준비 중입니다</p>' +
        '<p>매장 정보 수정, 메뉴·사진 관리, 리뷰 답글 기능은 실제 서버 연동 전이라 이 화면의 내용은 예시입니다. 아래 값은 저장되지 않습니다.</p>' +
      '</div>' +
    '</div>';
  main.insertBefore(notice, main.firstChild);
})();
