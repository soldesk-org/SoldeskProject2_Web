(function () {
  var tab = document.body.getAttribute("data-initial-tab") || "personal";
  var remember = false;

  var personalTabBtn = document.getElementById("tab-personal");
  var businessTabBtn = document.getElementById("tab-business");
  var personalOnly = document.querySelectorAll("[data-tab-only='personal']");
  var businessOnly = document.querySelectorAll("[data-tab-only='business']");
  var rememberCheck = document.getElementById("remember-toggle");
  var rememberCheckBox = document.getElementById("remember-check-box");
  var rememberIcon = document.getElementById("remember-icon");
  var toPersonalBtn = document.getElementById("to-personal");
  var form = document.getElementById("login-form");
  var errorEl = document.getElementById("login-error");
  var submitBtn = document.getElementById("login-submit-btn");

  function render() {
    var business = tab === "business";
    personalTabBtn.querySelector("span").className =
      "text-[18px] font-medium tracking-[-0.9px] " + (!business ? "text-[#fd6d4a]" : "text-[rgba(37,55,75,0.7)]");
    personalTabBtn.querySelector(".tab-underline").className =
      "tab-underline mt-2 h-[3px] w-full " + (!business ? "bg-[#fd6d4a]" : "bg-[rgba(37,55,75,0.7)]");
    businessTabBtn.querySelector("span").className =
      "text-[18px] font-medium tracking-[-0.9px] " + (business ? "text-[#fd6d4a]" : "text-[rgba(37,55,75,0.7)]");
    businessTabBtn.querySelector(".tab-underline").className =
      "tab-underline mt-2 h-[3px] w-full " + (business ? "bg-[#fd6d4a]" : "bg-[rgba(37,55,75,0.7)]");

    personalOnly.forEach(function (el) { el.style.display = business ? "none" : ""; });
    businessOnly.forEach(function (el) { el.style.display = business ? "" : "none"; });
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  }

  personalTabBtn.addEventListener("click", function () { tab = "personal"; render(); });
  businessTabBtn.addEventListener("click", function () { tab = "business"; render(); });
  if (toPersonalBtn) toPersonalBtn.addEventListener("click", function () { tab = "personal"; render(); });

  rememberCheck.addEventListener("click", function () {
    remember = !remember;
    rememberCheckBox.className =
      "flex size-[25px] items-center justify-center rounded-[7px] border " +
      (remember ? "border-[#fd6d4a] bg-[#fd6d4a] text-white" : "border-[rgba(37,55,75,0.7)] bg-white");
    rememberIcon.style.display = remember ? "" : "none";
  });

  var ERROR_MESSAGES = {
    INVALID_CREDENTIALS: "이메일 또는 비밀번호가 올바르지 않습니다.",
    ACCOUNT_LOCKED: "로그인 5회 실패로 계정이 30분간 잠겼습니다.",
    ACCOUNT_SUSPENDED: "정지된 계정입니다.",
    ACCOUNT_WITHDRAWN: "탈퇴한 계정입니다.",
    INVALID_INPUT: "입력값을 확인해주세요.",
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");
    var email = document.getElementById("login-email").value.trim();
    var password = document.getElementById("login-password").value;
    if (!email || !password) { showError("이메일과 비밀번호를 입력해주세요."); return; }

    submitBtn.disabled = true;
    Api.login(email, password, remember)
      .then(function () {
        window.location.href = Api.landingPageForRole();
      })
      .catch(function (err) {
        showError(ERROR_MESSAGES[err.code] || err.message || "로그인에 실패했습니다.");
      })
      .finally(function () { submitBtn.disabled = false; });
  });

  var kakaoBtn = document.getElementById("login-kakao");
  var naverBtn = document.getElementById("login-naver");
  var googleBtn = document.getElementById("login-google");
  if (kakaoBtn) kakaoBtn.addEventListener("click", function () { window.location.href = "/api/auth/kakao/authorize"; });
  if (naverBtn) naverBtn.addEventListener("click", function () { window.location.href = "/api/auth/naver/authorize"; });
  if (googleBtn) googleBtn.addEventListener("click", function () { window.location.href = "/api/auth/google/authorize"; });

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
      showError(errorMessage || "소셜 로그인에 실패했습니다.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  })();

  render();
})();
