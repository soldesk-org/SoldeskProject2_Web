(function () {
  var form = document.getElementById("bizLoginForm");
  if (!form) return;

  var emailInput = document.getElementById("bizLoginEmail");
  var passwordInput = document.getElementById("bizLoginPassword");
  var rememberInput = document.getElementById("bizRememberMe");
  var submitBtn = document.getElementById("bizLoginSubmitBtn");
  var emailError = document.getElementById("bizLoginEmailError");
  var passwordError = document.getElementById("bizLoginPasswordError");

  // 사업자/일반 회원 로그인은 백엔드에서 같은 API(/api/members/login)를 쓰고, memberType("business")을
  // 함께 보내 role과 일치하는지 서버가 비밀번호 확인 이후 검증한다(2026-08-10 — 예전엔 이 검증이 아예
  // 없어서 일반 회원 로그인 탭에서 사업자 계정으로도 그냥 로그인이 됐다).
  var ERROR_MESSAGES = {
    INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
    ACCOUNT_LOCKED: "로그인 5회 실패로 계정이 30분간 잠겼습니다.",
    ACCOUNT_SUSPENDED: "정지된 계정입니다.",
    ACCOUNT_WITHDRAWN: "탈퇴한 계정입니다.",
    INVALID_INPUT: "입력값을 확인해주세요.",
    MEMBER_TYPE_MISMATCH: "일반 회원 계정입니다. 일반 로그인을 이용해주세요.",
  };

  function showAlert(msg) {
    if (!msg) return;
    Eatty.toast(msg, "error");
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
    Api.login(email, password, !!(rememberInput && rememberInput.checked), "business")
      .then(function () {
        window.location.href = "business-mypage";
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
      window.location.href = "/api/oauth-providers/" + provider + "/authorization";
    });
  });
})();
