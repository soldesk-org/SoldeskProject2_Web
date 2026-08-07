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
    Api.request("/api/mail/send-code", { method: "POST", auth: false, body: { email: email } })
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
    Api.request("/api/mail/verify-code", { method: "POST", auth: false, body: { email: email, code: code } })
      .then(function () {
        emailVerified = true;
        emailCodeRow.hidden = true;
        emailInput.disabled = true;
        sendEmailBtn.disabled = true;
        Eatty.toast("이메일 인증이 완료되었습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증코드가 올바르지 않습니다.", "error"); });
  });

  // 비밀번호 강도 표시(순수 UI)
  var pw = passwordInput;
  pw.addEventListener("input", function () {
    var v = pw.value, score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^\w\s]/.test(v)) score++;
    var labels = ["-", "약함", "보통", "양호", "안전"];
    var bar = document.getElementById("pwStrengthBar");
    var txt = document.getElementById("pwStrengthText");
    if (bar) bar.style.width = (score * 25) + "%";
    if (txt) txt.textContent = v ? labels[score] : "-";
  });

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
    Api.request("/api/phone/send-code", { method: "POST", auth: false, body: { email: email, phone: phone } })
      .then(function () {
        phoneCodeInput.value = "";
        phoneCodeRow.hidden = false;
        var timer = document.getElementById("phoneCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증번호를 발송했습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증번호 발송에 실패했습니다.", "error"); })
      .finally(function () { sendPhoneBtn.disabled = false; });
  });

  verifyPhoneBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    var code = phoneCodeInput.value.trim();
    Api.request("/api/phone/verify-code", { method: "POST", auth: false, body: { email: email, phone: phone, code: code } })
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
    sessionStorage.setItem("signup_marketing", document.getElementById("agreeMarketing").checked ? "1" : "0");
    // STEP2(signup-info)가 "방금 STEP1을 마쳤는지"를 판단할 때 값의 존재만으로는 예전에 테스트하다
    // 남은 오래된 값과 구분이 안 된다 — 이 시각을 함께 남겨서 일정 시간 이내인지도 같이 확인한다.
    sessionStorage.setItem("signup_verified_at", String(Date.now()));
    window.location.href = "signup-info";
  });
})();
