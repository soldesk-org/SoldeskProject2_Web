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
    MEMBER_TYPE_MISMATCH: "사업자 회원 계정입니다. 사업자 회원 로그인을 이용해주세요.",
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
    Api.login(email, password, !!(rememberInput && rememberInput.checked), "normal")
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
      // 2026-08-09 추가 — 소셜로그인은 체크박스가 없는 리다이렉트 플로우라 "로그인 상태 유지"를
      // 선택할 방법이 없었고, 서버도 항상 14일 유지로 고정 발급하고 있었다. 같은 화면의 rememberMe
      // 체크박스 값을 그대로 실어 보낸다(/api/auth/{provider}/authorize?rememberMe=true|false).
      var remember = !!(rememberInput && rememberInput.checked);
      // 2026-08-21 — iOS 앱에서는 앱 안 WebView에서 열지 않고 네이티브에 넘겨 시스템 브라우저
      // (ASWebAuthenticationSession)로 띄운다. 네이티브가 인가 주소를 직접 열기 때문에 로그인 창은
      // 카카오/네이버/구글 공식 화면부터 시작한다. 브릿지가 없거나 호출이 실패하면 아래 기존 방식으로 폴백.
      if (window.EattyWayApp && window.EattyWayApp.isInIosApp && window.EattyWayApp.isInIosApp()) {
        if (window.EattyWayApp.startSocialLogin(provider, remember)) return;
      }
      window.location.href = "/api/oauth-providers/" + provider + "/authorization?rememberMe=" + remember;
    });
  });

  (function handleOAuthRedirectParams() {
    var params = new URLSearchParams(window.location.search);
    var accessToken = params.get("accessToken");
    var refreshToken = params.get("refreshToken");
    var memberId = params.get("memberId");
    var remember = params.get("rememberMe") === "true";
    var error = params.get("error");
    var errorMessage = params.get("errorMessage");

    // 참고(2026-08-21) — iOS 앱에서 시작한 소셜로그인은 서버 콜백이 이 페이지가 아니라 앱 커스텀
    // 스킴(eattyway://oauth-callback)으로 바로 302하므로 여기까지 오지 않는다(AuthController의
    // app-redirect-url 참고). 그래서 이 아래는 웹 전용 경로 그대로 두면 된다.
    if (accessToken && refreshToken && memberId) {
      Api.setSession({ accessToken: accessToken, refreshToken: refreshToken, memberId: memberId }, remember);
      window.location.replace(Api.landingPageForRole());
      return;
    }
    if (error) {
      showAlert(errorMessage || "소셜 로그인에 실패했습니다.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  })();
})();
