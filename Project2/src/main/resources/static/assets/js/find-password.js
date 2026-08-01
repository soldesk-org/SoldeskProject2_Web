(function () {
  var form = document.getElementById("findPasswordForm");
  if (!form) return;

  var emailInput = document.getElementById("findPwEmail");
  var emailError = document.getElementById("findPwEmailError");
  var submitBtn = document.getElementById("findPwSubmitBtn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    emailError.classList.remove("is-visible");

    var email = emailInput.value.trim();
    if (!email) { emailError.classList.add("is-visible"); return; }

    submitBtn.disabled = true;
    // 이 API는 가입 여부와 무관하게 항상 200으로 응답한다(계정 존재 여부 비노출, 의도된 동작).
    Api.request("/api/members/password-reset/request", { method: "POST", auth: false, body: { email: email } })
      .then(function () {
        sessionStorage.setItem("fp_email", email);
        window.location.href = "find-password-sent";
      })
      .catch(function (err) {
        if (err.code === "INVALID_INPUT") {
          emailError.textContent = err.message || "올바른 이메일 형식을 입력해주세요.";
          emailError.classList.add("is-visible");
          return;
        }
        // 형식 오류 외에는 항상 성공으로 응답하는 API라 이 분기는 사실상 발생하지 않지만,
        // 만약을 대비해 계정 존재 여부 비노출 원칙에 맞춰 동일하게 발송 완료 화면으로 보낸다.
        sessionStorage.setItem("fp_email", email);
        window.location.href = "find-password-sent";
      })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
