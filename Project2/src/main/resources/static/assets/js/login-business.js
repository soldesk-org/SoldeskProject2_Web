(function () {
  var form = document.getElementById("bizLoginForm");
  if (!form) return;

  var emailInput = document.getElementById("bizLoginEmail");
  var passwordInput = document.getElementById("bizLoginPassword");
  var rememberInput = document.getElementById("bizRememberMe");
  var submitBtn = document.getElementById("bizLoginSubmitBtn");
  var alertBox = document.getElementById("bizLoginAlert");
  var alertText = document.getElementById("bizLoginAlertText");
  var emailError = document.getElementById("bizLoginEmailError");
  var passwordError = document.getElementById("bizLoginPasswordError");

  // 사업자/일반 회원 로그인은 백엔드에서 같은 API(/api/members/login)를 쓰고, role 클레임으로
  // 구분한다(별도의 "/business" 로그인 엔드포인트는 없음).
  var ERROR_MESSAGES = {
    INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
    ACCOUNT_LOCKED: "로그인 5회 실패로 계정이 30분간 잠겼습니다.",
    ACCOUNT_SUSPENDED: "정지된 계정입니다.",
    ACCOUNT_WITHDRAWN: "탈퇴한 계정입니다.",
    INVALID_INPUT: "입력값을 확인해주세요.",
  };

  function showAlert(msg) {
    if (!alertBox) return;
    if (!msg) { alertBox.hidden = true; return; }
    alertText.textContent = msg;
    alertBox.hidden = false;
  }

  function setFieldError(input, errorEl, show) {
    if (!errorEl) return;
    errorEl.classList.toggle("is-visible", !!show);
    if (input) input.classList.toggle("is-invalid", !!show);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showAlert("");

    var email = emailInput.value.trim();
    var password = passwordInput.value;
    var hasError = false;
    if (!email) { setFieldError(emailInput, emailError, true); hasError = true; }
    else setFieldError(emailInput, emailError, false);
    if (!password) { setFieldError(passwordInput, passwordError, true); hasError = true; }
    else setFieldError(passwordInput, passwordError, false);
    if (hasError) return;

    submitBtn.disabled = true;
    Api.login(email, password, !!(rememberInput && rememberInput.checked))
      .then(function () {
        if (Api.getRole() !== "BUSINESS") {
          showAlert("일반 회원 계정입니다. 일반 로그인을 이용해주세요.");
          Api.clearSession();
          return;
        }
        window.location.href = "business-mypage.html";
      })
      .catch(function (err) {
        showAlert(ERROR_MESSAGES[err.code] || err.message || "로그인에 실패했습니다.");
      })
      .finally(function () { submitBtn.disabled = false; });
  });

  var socialButtons = document.querySelectorAll("[data-social]");
  socialButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var provider = btn.getAttribute("data-social");
      window.location.href = "/api/auth/" + provider + "/authorize";
    });
  });
})();
