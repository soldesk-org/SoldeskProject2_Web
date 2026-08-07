(function () {
  var form = document.getElementById("loginForm");
  if (!form) return;

  var emailInput = document.getElementById("loginEmail");
  var passwordInput = document.getElementById("loginPassword");
  var rememberInput = document.getElementById("rememberMe");
  var submitBtn = document.getElementById("loginSubmitBtn");
  var emailError = document.getElementById("loginEmailError");
  var passwordError = document.getElementById("loginPasswordError");

  var ERROR_MESSAGES = {
    INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
    ACCOUNT_LOCKED: "로그인 5회 실패로 계정이 30분간 잠겼습니다.",
    ACCOUNT_SUSPENDED: "정지된 계정입니다.",
    ACCOUNT_WITHDRAWN: "탈퇴한 계정입니다.",
    INVALID_INPUT: "입력값을 확인해주세요.",
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
    Api.login(email, password, !!(rememberInput && rememberInput.checked))
      .then(function () {
        window.location.href = Api.landingPageForRole();
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

  (function handleOAuthRedirectParams() {
    var params = new URLSearchParams(window.location.search);
    var accessToken = params.get("accessToken");
    var refreshToken = params.get("refreshToken");
    var memberId = params.get("memberId");
    var error = params.get("error");
    var errorMessage = params.get("errorMessage");

    if (accessToken && refreshToken && memberId) {
      Api.setSession({ accessToken: accessToken, refreshToken: refreshToken, memberId: memberId });
      window.location.replace(Api.landingPageForRole());
      return;
    }
    if (error) {
      showAlert(errorMessage || "소셜 로그인에 실패했습니다.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  })();
})();
