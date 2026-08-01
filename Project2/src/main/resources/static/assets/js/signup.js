(function () {
  var form = document.getElementById("signupStep1Form");
  if (!form) return;

  var emailInput = document.getElementById("signupEmail");
  var emailCodeInput = document.getElementById("signupEmailCode");
  var passwordInput = document.getElementById("signupPassword");
  var passwordConfirmInput = document.getElementById("signupPasswordConfirm");
  var phoneInput = document.getElementById("signupPhone");
  var phoneCodeInput = document.getElementById("signupPhoneCode");
  var agreeError = document.getElementById("agreeError");

  var emailVerified = false;
  var phoneVerified = false;

  // 010XXXXXXXX(숫자만 입력받는 화면) -> 백엔드가 요구하는 010-XXXX-XXXX 형식으로 변환
  function formatPhone(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length !== 11) return v;
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  function setOk(errorEl, okEl, ok, msg) {
    if (errorEl) {
      errorEl.classList.toggle("is-visible", !ok);
      if (msg) errorEl.textContent = msg;
    }
    if (okEl) okEl.classList.toggle("is-visible", !!ok);
  }

  // 이메일 인증
  var sendEmailBtn = document.getElementById("sendEmailCodeBtn");
  var verifyEmailBtn = document.getElementById("verifyEmailCodeBtn");
  var emailCodeRow = document.getElementById("emailCodeRow");
  var emailError = document.getElementById("signupEmailError");
  var emailOk = document.getElementById("signupEmailOk");

  sendEmailBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    if (!email) { setOk(emailError, emailOk, false, "이메일을 입력해주세요."); return; }
    sendEmailBtn.disabled = true;
    Api.request("/api/mail/send-code", { method: "POST", auth: false, body: { email: email } })
      .then(function () {
        emailCodeRow.hidden = false;
        var timer = document.getElementById("emailCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증 메일을 발송했습니다.", "success");
      })
      .catch(function (err) { setOk(emailError, emailOk, false, err.message || "인증메일 발송에 실패했습니다."); })
      .finally(function () { sendEmailBtn.disabled = false; });
  });

  verifyEmailBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    var code = emailCodeInput.value.trim();
    Api.request("/api/mail/verify-code", { method: "POST", auth: false, body: { email: email, code: code } })
      .then(function () {
        emailVerified = true;
        setOk(emailError, emailOk, true);
        Eatty.toast("이메일 인증이 완료되었습니다.", "success");
      })
      .catch(function (err) { setOk(emailError, emailOk, false, err.message || "인증코드가 올바르지 않습니다."); });
  });

  // 이메일/닉네임 중복확인은 실제로 별도 조회 API가 없음(가입 시 서버가 자동으로 검증) — 지어낸
  // 응답을 흉내내지 않고 안내만 한다.
  var dupBtn = document.getElementById("checkEmailDupBtn");
  if (dupBtn) dupBtn.addEventListener("click", function () {
    Eatty.toast("가입 완료 시 서버에서 자동으로 중복 여부를 확인합니다.", "default");
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
  var phoneError = document.getElementById("signupPhoneError");
  var phoneOk = document.getElementById("signupPhoneOk");

  sendPhoneBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    if (!phone) { setOk(phoneError, phoneOk, false, "전화번호를 입력해주세요."); return; }
    sendPhoneBtn.disabled = true;
    Api.request("/api/phone/send-code", { method: "POST", auth: false, body: { email: email, phone: phone } })
      .then(function () {
        phoneCodeRow.hidden = false;
        var timer = document.getElementById("phoneCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증번호를 발송했습니다.", "success");
      })
      .catch(function (err) { setOk(phoneError, phoneOk, false, err.message || "인증번호 발송에 실패했습니다."); })
      .finally(function () { sendPhoneBtn.disabled = false; });
  });

  verifyPhoneBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    var code = phoneCodeInput.value.trim();
    Api.request("/api/phone/verify-code", { method: "POST", auth: false, body: { email: email, phone: phone, code: code } })
      .then(function () {
        phoneVerified = true;
        setOk(phoneError, phoneOk, true);
        Eatty.toast("전화번호 인증이 완료되었습니다.", "success");
      })
      .catch(function (err) { setOk(phoneError, phoneOk, false, err.message || "인증번호가 올바르지 않습니다."); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var requiredAgrees = document.querySelectorAll("[data-agree-item='signupTerms'][required]");
    var allAgreed = Array.prototype.every.call(requiredAgrees, function (el) { return el.checked; });
    agreeError.classList.toggle("is-visible", !allAgreed);
    if (!allAgreed) return;

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
    window.location.href = "signup-info";
  });
})();
