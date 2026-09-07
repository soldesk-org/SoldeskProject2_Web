(function () {
  var form = document.getElementById("signupStep1Form");
  if (!form) return;

  var emailInput = document.getElementById("signupEmail");
  var emailCodeInput = document.getElementById("signupEmailCode");
  var passwordInput = document.getElementById("signupPassword");
  var passwordConfirmInput = document.getElementById("signupPasswordConfirm");
  var phoneInput = document.getElementById("signupPhone");
  var phoneCodeInput = document.getElementById("signupPhoneCode");

  var emailVerified = false;
  var phoneVerified = false;

  // 010XXXXXXXX(숫자만 입력받는 화면) -> 백엔드가 요구하는 010-XXXX-XXXX 형식으로 변환
  function formatPhone(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length !== 11) return v;
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  // 입력 중에도 숫자 외 문자는 즉시 걸러내고, 11자리를 다 채우지 않아도 자릿수에 맞춰 "-"를 붙여준다.
  function formatPhoneLive(digits) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + "-" + digits.slice(3);
    return digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7);
  }

  phoneInput.addEventListener("input", function () {
    var digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
    phoneInput.value = formatPhoneLive(digits);
  });

  // 이메일 인증
  var sendEmailBtn = document.getElementById("sendEmailCodeBtn");
  var verifyEmailBtn = document.getElementById("verifyEmailCodeBtn");
  var emailCodeRow = document.getElementById("emailCodeRow");

  sendEmailBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    if (!email) { Eatty.toast("이메일을 입력해주세요.", "error"); return; }
    sendEmailBtn.disabled = true;
    Api.request("/api/mail/verification-codes", { method: "POST", auth: false, body: { email: email } })
      .then(function () {
        emailCodeInput.value = "";
        emailCodeRow.hidden = false;
        var timer = document.getElementById("emailCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증 메일을 발송했습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증메일 발송에 실패했습니다.", "error"); })
      .finally(function () { sendEmailBtn.disabled = false; });
  });

  verifyEmailBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    var code = emailCodeInput.value.trim();
    Api.request("/api/mail/verification-codes/confirmation", { method: "POST", auth: false, body: { email: email, code: code } })
      .then(function () {
        emailVerified = true;
        emailCodeRow.hidden = true;
        emailInput.disabled = true;
        sendEmailBtn.disabled = true;
        Eatty.toast("이메일 인증이 완료되었습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증코드가 올바르지 않습니다.", "error"); });
  });

  // 비밀번호 강도 표시(2026-08-13 수정) — 예전엔 "8자 이상/대소문자 혼용/숫자/특수문자" 4개를 각각
  // 1점씩 매겨서, 특수문자 없이 소문자+숫자만 있어도(예: "abcdefg1") "보통"으로 뜨는 경우가 있었다.
  // 근데 서버(SignUpRequestDto) 검증은 "영문+숫자+특수문자를 전부 포함한 8~20자"가 필수라, 그 조건을
  // 못 채우면 강도와 무관하게 무조건 막힌다 — "보통"인데도 다음 단계로 못 넘어가던 원인. 서버가 요구하는
  // 필수 조건을 통과해야만 최소 "보통"부터 주도록 기준을 맞춰서, "보통"/"양호"면 항상 통과되게 한다.
  var PASSWORD_REQUIRED_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;
  var pw = passwordInput;
  pw.addEventListener("input", function () {
    var v = pw.value;
    var meetsRequired = PASSWORD_REQUIRED_PATTERN.test(v);
    var score = 0;
    if (v) {
      if (meetsRequired) {
        score = 2; // 필수 조건(영문+숫자+특수문자, 8~20자)을 채우면 최소 "보통".
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++; // 대소문자 섞으면 "양호"
        if (v.length >= 12) score++; // 12자 이상이면 "안전"
      } else {
        // 뭔가 입력은 했는데 필수 조건을 못 채운 경우(20자 초과로 다시 조건을 벗어난 경우 포함,
        // 2026-08-14 수정) — 예전엔 score가 0으로 떨어지면서 "-"가 떠서 입력 중인데도 마치 아직
        // 아무것도 안 친 것처럼 보이는 버그가 있었다. 입력값이 있으면 최소 "약함"으로 표시한다.
        score = 1;
      }
    }
    var labels = ["-", "약함", "보통", "양호", "안전"];
    var bar = document.getElementById("pwStrengthBar");
    var txt = document.getElementById("pwStrengthText");
    if (bar) bar.className = "e-pw-strength-bars" + (score ? " lv-" + score : "");
    if (txt) {
      txt.className = "e-pw-strength-text" + (score ? " lv-" + score : "");
      txt.textContent = labels[score];
    }
  });

  // 비밀번호 확인 일치 여부 실시간 표시(2026-08-13 추가) — 예전엔 제출을 눌러야만(불일치일 때만)
  // 에러가 떴다. 입력하는 즉시 일치/불일치를 보여주고, 비밀번호 자체를 나중에 고쳐도 다시 맞춰본다.
  var confirmErrorEl = document.getElementById("signupPasswordConfirmError");
  var confirmOkEl = document.getElementById("signupPasswordConfirmOk");
  function checkPasswordMatch() {
    if (!confirmErrorEl || !confirmOkEl) return;
    var confirmVal = passwordConfirmInput.value;
    if (!confirmVal) {
      confirmErrorEl.classList.remove("is-visible");
      confirmOkEl.classList.remove("is-visible");
      return;
    }
    var matches = passwordInput.value === confirmVal;
    confirmErrorEl.classList.toggle("is-visible", !matches);
    confirmOkEl.classList.toggle("is-visible", matches);
  }
  passwordConfirmInput.addEventListener("input", checkPasswordMatch);
  pw.addEventListener("input", checkPasswordMatch);

  // 전화번호 인증
  var sendPhoneBtn = document.getElementById("sendPhoneCodeBtn");
  var verifyPhoneBtn = document.getElementById("verifyPhoneCodeBtn");
  var phoneCodeRow = document.getElementById("phoneCodeRow");

  sendPhoneBtn.addEventListener("click", function () {
    if (!emailVerified) { Eatty.toast("이메일 인증을 먼저 완료해주세요.", "error"); return; }
    var email = emailInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    if (!phone) { Eatty.toast("전화번호를 입력해주세요.", "error"); return; }
    sendPhoneBtn.disabled = true;
    Api.request("/api/phone/verification-codes", { method: "POST", auth: false, body: { email: email, phone: phone } })
      .then(function () {
        phoneCodeInput.value = "";
        phoneCodeRow.hidden = false;
        var timer = document.getElementById("phoneCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증번호를 발송했습니다.", "success");
      })
      .catch(function (err) {
        var msg = err.code === "SMS_SEND_FAIL" ? "SMS 서버와 통신할 수 없습니다" : (err.message || "인증번호 발송에 실패했습니다.");
        Eatty.toast(msg, "error");
      })
      .finally(function () { sendPhoneBtn.disabled = false; });
  });

  verifyPhoneBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    var code = phoneCodeInput.value.trim();
    Api.request("/api/phone/verification-codes/confirmation", { method: "POST", auth: false, body: { email: email, phone: phone, code: code } })
      .then(function () {
        phoneVerified = true;
        phoneCodeRow.hidden = true;
        phoneInput.disabled = true;
        sendPhoneBtn.disabled = true;
        Eatty.toast("전화번호 인증이 완료되었습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증번호가 올바르지 않습니다.", "error"); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var requiredAgrees = document.querySelectorAll("[data-agree-item='signupTerms'][required]");
    var allAgreed = Array.prototype.every.call(requiredAgrees, function (el) { return el.checked; });
    if (!allAgreed) { Eatty.toast("필수 약관에 모두 동의해주세요.", "error"); return; }

    if (!emailVerified) { Eatty.toast("이메일 인증을 완료해주세요.", "error"); return; }
    if (!phoneVerified) { Eatty.toast("전화번호 인증을 완료해주세요.", "error"); return; }
    if (passwordInput.value !== passwordConfirmInput.value) {
      document.getElementById("signupPasswordConfirmError").classList.add("is-visible");
      return;
    }

    sessionStorage.setItem("signup_email", emailInput.value.trim());
    sessionStorage.setItem("signup_password", passwordInput.value);
    sessionStorage.setItem("signup_phone", formatPhone(phoneInput.value.trim()));
    // 마케팅 동의 항목은 2026-08-07부터 화면에서 보류(주석 처리)됨 — 엘리먼트가 없으면 미동의로 처리.
    var agreeMarketingEl = document.getElementById("agreeMarketing");
    sessionStorage.setItem("signup_marketing", agreeMarketingEl && agreeMarketingEl.checked ? "1" : "0");
    // STEP2(signup-info)가 "방금 STEP1을 마쳤는지"를 판단할 때 값의 존재만으로는 예전에 테스트하다
    // 남은 오래된 값과 구분이 안 된다 — 이 시각을 함께 남겨서 일정 시간 이내인지도 같이 확인한다.
    sessionStorage.setItem("signup_verified_at", String(Date.now()));
    window.location.href = "signup-info";
  });
})();
