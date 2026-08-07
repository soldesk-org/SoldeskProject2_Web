(function () {
  var openBtn = document.getElementById("bizStoreSearchOpenBtn");
  var displayInput = document.getElementById("bizStoreNameDisplay");
  var hiddenInput = document.getElementById("bizStoreName");
  if (!openBtn) return;

  // store-search-popup.html이 사용자가 매장을 고르면 이 함수를 호출한다(2026-08-07, 도로명주소
  // 검색(Juso)과 동일한 "새 창 + opener 콜백" 패턴).
  window.eattyStoreSearchCallback = function (item) {
    displayInput.value = item.name;
    hiddenInput.value = item.name;
  };

  openBtn.addEventListener("click", function () {
    var popup = window.open("store-search-popup", "storeSearchPopup", "width=480,height=600,scrollbars=yes");
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      Eatty.toast("팝업이 차단되었습니다. 브라우저 주소창의 팝업 차단 아이콘에서 허용한 뒤 다시 시도해주세요.", "error");
    }
  });
})();
