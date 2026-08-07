(function () {
  var form = document.getElementById("bizSignupStep1Form");
  if (!form) return;

  // 실제 백엔드(BusinessSignUpRequestDto)는 사업자등록번호/OCR 인식 결과를 별도 필드로 받지 않는다 —
  // 증명원 파일만 함께 보내면 서버가 자동으로 진위확인+OCR을 수행한다. 그래서 이 화면의 "진위확인"/
  // "OCR 인식" 버튼은 실제로 호출할 별도 API가 없고, 실제 검증은 아래 제출 시점에 한 번에 이뤄진다.
  var regNoCheckBtn = document.getElementById("bizRegNoCheckBtn");
  if (regNoCheckBtn) regNoCheckBtn.addEventListener("click", function () {
    var v = ["bizRegNo1", "bizRegNo2", "bizRegNo3"]
      .map(function (id) { var el = document.getElementById(id); return el ? el.value : ""; }).join("-");
    var combined = document.getElementById("bizRegNoCombined");
    if (combined) combined.value = v;
    Eatty.toast("사업자등록번호 진위확인은 가입 제출 시 증명원 파일과 함께 자동으로 처리됩니다.", "default");
  });

  var ocrRunBtn = document.getElementById("bizOcrRunBtn");
  if (ocrRunBtn) ocrRunBtn.addEventListener("click", function () {
    Eatty.toast("증명원 OCR 인식은 가입 제출 시 서버에서 자동으로 처리됩니다.", "default");
  });
  var ocrConfirmBtn = document.getElementById("bizOcrConfirmBtn");
  if (ocrConfirmBtn) ocrConfirmBtn.addEventListener("click", function () {
    var result = document.getElementById("bizOcrResult");
    if (result) result.hidden = true;
  });

  var licenseInput = document.getElementById("bizLicenseInput");
  var removeBtn = document.getElementById("bizLicenseRemoveBtn");
  if (removeBtn) removeBtn.addEventListener("click", function () {
    if (licenseInput) licenseInput.value = "";
    var preview = document.getElementById("bizLicensePreview");
    if (preview) preview.hidden = true;
    var fname = document.getElementById("bizLicenseFileName");
    if (fname) fname.textContent = "선택된 파일이 없습니다";
  });

  // 이메일 인증
  var emailInput = document.getElementById("bizSignupEmail");
  var emailCodeInput = document.getElementById("bizSignupEmailCode");
  var emailError = document.getElementById("bizSignupEmailError");
  var emailOk = document.getElementById("bizSignupEmailOk");
  var emailVerified = false;

  function setOk(errorEl, okEl, ok, msg) {
    if (errorEl) { errorEl.classList.toggle("is-visible", !ok); if (msg) errorEl.textContent = msg; }
    if (okEl) okEl.classList.toggle("is-visible", !!ok);
  }

  var dupBtn = document.getElementById("bizCheckEmailDupBtn");
  if (dupBtn) dupBtn.addEventListener("click", function () {
    Eatty.toast("가입 완료 시 서버에서 자동으로 중복 여부를 확인합니다.", "default");
  });

  document.getElementById("bizSendEmailCodeBtn").addEventListener("click", function () {
    var email = emailInput.value.trim();
    if (!email) { setOk(emailError, emailOk, false, "이메일을 입력해주세요."); return; }
    Api.request("/api/mail/send-code", { method: "POST", auth: false, body: { email: email } })
      .then(function () {
        document.getElementById("bizEmailCodeRow").hidden = false;
        var timer = document.getElementById("bizEmailCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증 메일을 발송했습니다.", "success");
      })
      .catch(function (err) { setOk(emailError, emailOk, false, err.message || "인증메일 발송에 실패했습니다."); });
  });

  document.getElementById("bizVerifyEmailCodeBtn").addEventListener("click", function () {
    var email = emailInput.value.trim();
    var code = emailCodeInput.value.trim();
    Api.request("/api/mail/verify-code", { method: "POST", auth: false, body: { email: email, code: code } })
      .then(function () { emailVerified = true; setOk(emailError, emailOk, true); Eatty.toast("이메일 인증이 완료되었습니다.", "success"); })
      .catch(function (err) { setOk(emailError, emailOk, false, err.message || "인증코드가 올바르지 않습니다."); });
  });

  var pw = document.getElementById("bizSignupPassword");
  pw.addEventListener("input", function () {
    var v = pw.value, score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^\w\s]/.test(v)) score++;
    var labels = ["-", "약함", "보통", "양호", "안전"];
    document.getElementById("bizPwStrengthBar").style.width = (score * 25) + "%";
    document.getElementById("bizPwStrengthText").textContent = v ? labels[score] : "-";
  });

  // 전화번호 인증
  var phoneInput = document.getElementById("bizPhone");
  var phoneCodeInput = document.getElementById("bizSignupPhoneCode");
  var phoneVerified = false;

  function formatPhone(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length !== 11) return v;
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  document.getElementById("bizSendPhoneCodeBtn").addEventListener("click", function () {
    var email = emailInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    Api.request("/api/phone/send-code", { method: "POST", auth: false, body: { email: email, phone: phone } })
      .then(function () {
        document.getElementById("bizPhoneCodeRow").hidden = false;
        var timer = document.getElementById("bizPhoneCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증번호를 발송했습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증번호 발송에 실패했습니다.", "error"); });
  });

  document.getElementById("bizVerifyPhoneCodeBtn").addEventListener("click", function () {
    var email = emailInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    var code = phoneCodeInput.value.trim();
    Api.request("/api/phone/verify-code", { method: "POST", auth: false, body: { email: email, phone: phone, code: code } })
      .then(function () { phoneVerified = true; Eatty.toast("전화번호 인증이 완료되었습니다.", "success"); })
      .catch(function (err) { Eatty.toast(err.message || "인증번호가 올바르지 않습니다.", "error"); });
  });

  var submitBtn = document.getElementById("bizSignupNextBtn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var requiredAgrees = document.querySelectorAll("[data-agree-item='bizTerms'][required]");
    var allAgreed = Array.prototype.every.call(requiredAgrees, function (el) { return el.checked; });
    document.getElementById("bizAgreeError").classList.toggle("is-visible", !allAgreed);
    if (!allAgreed) return;

    if (!emailVerified) { Eatty.toast("이메일 인증을 완료해주세요.", "error"); return; }
    if (!phoneVerified) { Eatty.toast("전화번호 인증을 완료해주세요.", "error"); return; }

    var password = document.getElementById("bizSignupPassword").value;
    var passwordConfirm = document.getElementById("bizSignupPasswordConfirm").value;
    if (password !== passwordConfirm) {
      document.getElementById("bizSignupPasswordConfirmError").classList.add("is-visible");
      return;
    }

    var licenseFile = licenseInput.files && licenseInput.files[0];
    if (!licenseFile) { Eatty.toast("사업자등록증명원 파일을 업로드해주세요.", "error"); return; }

    // 백엔드에 담당자 성명을 담을 필드가 없어 닉네임 전용 입력칸도 이 화면엔 없다 — 이메일 아이디
    // 부분에서 닉네임 규칙(한글/영문/숫자 2~10자)에 맞게 자동으로 만들어 사용한다.
    var email = emailInput.value.trim();
    var nickname = email.split("@")[0].replace(/[^a-zA-Z0-9가-힣]/g, "").slice(0, 10) || "사장님";
    var phone = formatPhone(phoneInput.value.trim());

    var formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("passwordConfirm", passwordConfirm);
    formData.append("nickname", nickname);
    formData.append("phone", phone);
    formData.append("businessLicenseFile", licenseFile);

    submitBtn.disabled = true;
    Api.request("/api/members/signup/business", { method: "POST", auth: false, isForm: true, body: formData })
      .then(function () {
        sessionStorage.setItem("biz_signup_email", email);
        window.location.href = "signup-business-info";
      })
      .catch(function (err) { Eatty.toast(err.message || "사업자 회원가입에 실패했습니다.", "error"); })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
