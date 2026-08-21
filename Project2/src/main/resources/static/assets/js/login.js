(function () {
  /* ===== iOS 앱 소셜 로그인(ASWebAuthenticationSession) 연동용 (2026-08-21 추가) ==================
     자세한 흐름 설명은 api.js의 "iOS 앱 전용 브릿지" 주석 참고. 여기서 담당하는 건 두 가지다.
       (A) 네이티브가 브라우저 시트로 이 페이지를 열었을 때(?appOAuth=1) → 앱 흐름임을 표시하고
           곧바로 인가 요청으로 넘긴다.
       (B) 서버 콜백이 이 페이지로 토큰을 실어 돌아왔을 때 → (A)의 표시가 있으면 커스텀 스킴
           (eattyway://oauth-callback)으로 이동해서 시트를 닫고 앱으로 복귀시킨다.
     표시는 sessionStorage에만 남긴다 — localStorage에 남기면 브라우저 시트가 Safari와 저장소를
     공유하는 경우 나중에 사용자가 Safari에서 직접 로그인할 때도 앱 스킴으로 튈 수 있다.
     혹시 표시가 유실되면 그냥 평소 웹 동작(브라우저에 로그인된 페이지가 뜸)이 되고 앱은 취소로
     처리하므로, 잘못된 상태로 빠지지는 않는다. */
  var APP_OAUTH_FLAG = "ew_app_oauth_started_at";
  var APP_OAUTH_TTL_MS = 10 * 60 * 1000;
  var APP_CALLBACK_URL = "eattyway://oauth-callback";

  function markAppOAuthStart() {
    try { sessionStorage.setItem(APP_OAUTH_FLAG, String(Date.now())); } catch (e) {}
  }
  function isAppOAuthFlow() {
    try {
      var startedAt = parseInt(sessionStorage.getItem(APP_OAUTH_FLAG) || "0", 10);
      return !!startedAt && Date.now() - startedAt < APP_OAUTH_TTL_MS;
    } catch (e) {
      return false;
    }
  }
  function clearAppOAuthFlag() {
    try { sessionStorage.removeItem(APP_OAUTH_FLAG); } catch (e) {}
  }

  // (A) 앱이 시스템 브라우저로 이 페이지를 연 경우 — 로그인 화면을 그릴 필요 없이 바로 넘긴다.
  var appStartParams = new URLSearchParams(window.location.search);
  if (appStartParams.get("appOAuth") === "1") {
    var appStartProvider = appStartParams.get("provider") || "";
    if (/^[a-z]+$/.test(appStartProvider)) {
      markAppOAuthStart();
      window.location.replace(
        "/api/oauth-providers/" + appStartProvider +
        "/authorization?rememberMe=" + (appStartParams.get("rememberMe") === "true")
      );
      return;
    }
  }

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
      // (ASWebAuthenticationSession)로 띄운다. 브릿지가 없거나 호출이 실패하면 아래 기존 방식으로 폴백.
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

    // (B) 앱이 시작한 흐름이면 여기서 세션을 저장하지 않는다 — 이 페이지는 앱이 아니라 시스템
    // 브라우저 시트 안이라서, 여기 저장해도 앱 WebView에는 아무 영향이 없다. 결과를 그대로 커스텀
    // 스킴에 실어 넘기면 네이티브가 시트를 닫고 앱 WebView 쪽에서 세션을 저장한다(성공/실패 모두).
    if ((accessToken && refreshToken && memberId) || error) {
      if (isAppOAuthFlow()) {
        clearAppOAuthFlag();
        window.location.replace(APP_CALLBACK_URL + "?" + params.toString());
        return;
      }
    }

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
