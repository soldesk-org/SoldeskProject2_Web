(function () {
  var emailEl = document.getElementById("doneBizEmail");
  if (emailEl) {
    var email = sessionStorage.getItem("biz_signup_email");
    if (email) emailEl.textContent = email;
  }

  // 접수번호/매장명/사업자등록번호/접수일시/예상완료일은 실제로 발급·저장하는 백엔드 기능이 없다
  // (사업자 회원가입 API는 계정만 만들 뿐, 별도의 심사 접수 추적 시스템은 아직 없음) — 그럴듯한
  // 가짜 값을 보여주지 않도록 이 카드 자체를 숨긴다.
  var infoCard = document.getElementById("doneRequestNo");
  if (infoCard) {
    var card = infoCard.closest(".e-card");
    if (card) card.hidden = true;
  }

  sessionStorage.removeItem("biz_signup_email");
})();
