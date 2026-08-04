(function () {
  // 백엔드에 매장 정보(상호명/카테고리/주소/영업시간 등)를 가입 시점에 저장하는 API가 아직 없다
  // (BusinessSignUpRequestDto는 email/password/nickname/phone만 받음, 실제 사업자 계정 생성은 이미
  // signup-business 제출 시 끝났다). 그래서 이 화면은 입력만 받고 서버에는 아직 보내지 않는다.
  // 주소 검색만은 백엔드 없이 다음(카카오) 우편번호 서비스를 그대로 붙일 수 있어 실제로 연동한다.
  var addressBtn = document.getElementById("searchAddressBtn");
  if (addressBtn) {
    addressBtn.addEventListener("click", function () {
      if (typeof daum === "undefined" || !daum.Postcode) {
        Eatty.toast("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.", "error");
        return;
      }
      new daum.Postcode({
        oncomplete: function (data) {
          document.getElementById("shopZipcode").value = data.zonecode;
          document.getElementById("shopAddress1").value = data.roadAddress || data.jibunAddress;
          document.getElementById("shopAddress2").focus();
        },
      }).open();
    });
  }

  var form = document.getElementById("bizSignupStep2Form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      Eatty.toast("매장 정보 저장 기능은 아직 준비 중입니다. 사업자 계정 심사가 접수되었습니다.", "default");
      window.location.href = "signup-business-done";
    });
  }
})();
