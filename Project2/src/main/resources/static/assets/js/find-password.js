(function () {
  var form = document.getElementById("findPasswordForm");
  if (!form) return;

  var emailInput = document.getElementById("findPwEmail");
  var submitBtn = document.getElementById("findPwSubmitBtn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var email = emailInput.value.trim();
    if (!email) { Eatty.toast("이메일을 입력해주세요.", "error"); return; }
    var memberTypeEl = document.querySelector('input[name="memberType"]:checked');
    var memberType = memberTypeEl ? memberTypeEl.value : "normal";

    // 다른 탭(이메일 링크)에서 인증 완료를 감지하기 위한 상관관계 키(2026-08-04 추가) —
    // 요청 전에 생성해서 서버로 같이 보내고, find-password-sent.html이 폴링할 때 재사용한다.
    var pollKey = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : (Date.now().toString(36) + Math.random().toString(36).slice(2));

    function goToSent() {
      sessionStorage.setItem("fp_email", email);
      sessionStorage.setItem("fp_poll_key", pollKey);
      sessionStorage.setItem("fp_sent_at", String(Date.now()));
      window.location.href = "find-password-sent";
    }

    submitBtn.disabled = true;
    // 이 API는 가입 여부와 무관하게 항상 200으로 응답한다(계정 존재 여부 비노출, 의도된 동작).
    Api.request("/api/password-reset-tokens", { method: "POST", auth: false, body: { email: email, pollKey: pollKey, memberType: memberType } })
      .then(goToSent)
      .catch(function (err) {
        if (err.code === "INVALID_INPUT") {
          Eatty.toast(err.message || "올바른 이메일 형식을 입력해주세요.", "error");
          return;
        }
        // 형식 오류 외에는 항상 성공으로 응답하는 API라 이 분기는 사실상 발생하지 않지만,
        // 만약을 대비해 계정 존재 여부 비노출 원칙에 맞춰 동일하게 발송 완료 화면으로 보낸다.
        goToSent();
      })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
