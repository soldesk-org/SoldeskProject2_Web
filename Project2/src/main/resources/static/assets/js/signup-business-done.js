(function () {
  // STEP1→STEP2를 차근차근 거치지 않고 이 URL로 바로 들어오면 STEP1로 돌려보낸다(2026-08-04 추가) —
  // signup-business-info.js가 STEP2 제출 시 남기는 값을 확인한다.
  var STEP2_GATE_ENABLED = false; // TODO: 임시로 STEP2 통과 없이 바로 진입 허용 (테스트용, 나중에 true로 복구)
  var STEP2_VALID_MS = 30 * 60 * 1000;
  var infoDoneAt = Number(sessionStorage.getItem("biz_info_done_at"));
  var step2Fresh = infoDoneAt && (Date.now() - infoDoneAt) < STEP2_VALID_MS;
  if (STEP2_GATE_ENABLED && !step2Fresh) {
    sessionStorage.removeItem("biz_signup_email");
    sessionStorage.removeItem("biz_signup_at");
    sessionStorage.removeItem("biz_info_done_at");
    window.location.replace("signup-business");
    return;
  }

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
  sessionStorage.removeItem("biz_signup_at");
  sessionStorage.removeItem("biz_info_done_at");
})();
