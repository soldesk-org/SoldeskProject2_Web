(function () {
  var form = document.getElementById("bizSignupStep1Form");
  if (!form) return;

  // 사업자등록증명원 OCR+원본확인+진위확인(2026-08-04 실제 연동) — Python(FastAPI) 사업자 인증 서버의
  // POST /verify 하나가 OCR/원본확인/진위확인을 한 번에 수행하고, 사업자등록번호도 문서에서 직접 추출한다
  // (수동 입력 항목이 아니다). 그래서 "진위확인"/"OCR 인식" 두 버튼 모두 같은 검증을 실행하며, 성공하면
  // 인식된 사업자등록번호로 #bizRegNo1~3을 자동으로 채운다. 파일을 먼저 업로드해야 호출할 수 있다.
  // 이 화면의 검증은 어디까지나 제출 전 미리보기이고, 실제 회원가입 제출 시 서버가 다시 독립적으로
  // 검증하므로(MemberServiceImpl.signUpBusiness) 이 결과를 조작해서 보내는 건 의미가 없다.
  var licenseInput = document.getElementById("bizLicenseInput");
  var ocrResult = document.getElementById("bizOcrResult");
  var regNoCheckBtn = document.getElementById("bizRegNoCheckBtn");
  var ocrRunBtn = document.getElementById("bizOcrRunBtn");

  function runBusinessVerify(triggerBtn) {
    var file = licenseInput.files && licenseInput.files[0];
    if (!file) {
      Eatty.toast("먼저 사업자등록증명원 파일을 업로드해주세요.", "error");
      return;
    }
    ocrResult.hidden = true;

    var originalText = triggerBtn.textContent;
    triggerBtn.disabled = true;
    triggerBtn.textContent = "확인 중...";

    var formData = new FormData();
    formData.append("file", file);

    Api.request("/api/business/verify-license", { method: "POST", auth: false, isForm: true, body: formData })
      .then(function (data) {
        var parts = [data.businessNumber.slice(0, 3), data.businessNumber.slice(3, 5), data.businessNumber.slice(5, 10)];
        document.getElementById("bizRegNo1").value = parts[0];
        document.getElementById("bizRegNo2").value = parts[1];
        document.getElementById("bizRegNo3").value = parts[2];
        document.getElementById("bizRegNoCombined").value = data.businessNumber;

        document.getElementById("ocrCompanyName").value = data.companyName || "";
        document.getElementById("ocrOwnerName").value = data.representativeName || "";
        document.getElementById("ocrRegNo").value = parts.join("-");
        document.getElementById("ocrOpenDate").value = data.openDate || "";
        document.getElementById("ocrAddress").value = data.address || "";
        ocrResult.hidden = false;

        // 인증이 끝나면 사업자등록번호는 더 이상 손댈 값이 아니므로 수정 못 하게 잠그고, 이미 완료된
        // "진위확인"/"OCR 인식" 버튼 및 증명원 업로드 UI 전체를 화면에서 없앤다(2026-08-04 추가) —
        // 결과 카드만 남기고, 파일 자체는 #bizLicenseInput에 그대로 남아있어 제출에는 지장이 없다.
        ["bizRegNo1", "bizRegNo2", "bizRegNo3"].forEach(function (id) {
          document.getElementById(id).disabled = true;
        });
        if (regNoCheckBtn) regNoCheckBtn.hidden = true;
        if (ocrRunBtn) ocrRunBtn.hidden = true;
        var licenseField = document.getElementById("bizLicenseField");
        if (licenseField) licenseField.hidden = true;

        Eatty.toast("사업자 인증이 완료되었습니다.", "success");
      })
      .catch(function (err) {
        Eatty.toast(err.message || "사업자등록증명원 검증에 실패했습니다.", "error");
      })
      .finally(function () {
        triggerBtn.disabled = false;
        triggerBtn.textContent = originalText;
      });
  }

  if (regNoCheckBtn) regNoCheckBtn.addEventListener("click", function () { runBusinessVerify(regNoCheckBtn); });
  if (ocrRunBtn) ocrRunBtn.addEventListener("click", function () { runBusinessVerify(ocrRunBtn); });

  var ocrConfirmBtn = document.getElementById("bizOcrConfirmBtn");
  if (ocrConfirmBtn) ocrConfirmBtn.addEventListener("click", function () {
    if (ocrResult) ocrResult.hidden = true;
  });
  var licenseDrop = document.getElementById("bizLicenseDrop");
  var removeBtn = document.getElementById("bizLicenseRemoveBtn");

  // 업로드가 끝나면 드롭존은 숨기고 "업로드된 증명원" 목록만 보여준다(2026-08-04 추가) —
  // 제거 버튼을 누르면 다시 드롭존을 보여줘서 재업로드할 수 있게 한다.
  if (licenseDrop) {
    licenseDrop.addEventListener("eatty:filepicked", function () {
      licenseDrop.hidden = true;
    });
  }

  if (removeBtn) removeBtn.addEventListener("click", function () {
    if (licenseInput) licenseInput.value = "";
    var preview = document.getElementById("bizLicensePreview");
    if (preview) preview.hidden = true;
    var fname = document.getElementById("bizLicenseFileName");
    if (fname) fname.textContent = "선택된 파일이 없습니다";
    if (licenseDrop) licenseDrop.hidden = false;
    if (ocrResult) ocrResult.hidden = true;

    // 파일을 지우면 이전 인증 결과도 더 이상 유효하지 않으므로, 잠갔던 입력칸과 숨겼던 버튼을
    // 다시 풀어서 새 파일로 재인증할 수 있게 한다(2026-08-04 추가).
    ["bizRegNo1", "bizRegNo2", "bizRegNo3"].forEach(function (id) {
      var el = document.getElementById(id);
      el.disabled = false;
      el.value = "";
    });
    document.getElementById("bizRegNoCombined").value = "";
    if (regNoCheckBtn) regNoCheckBtn.hidden = false;
    if (ocrRunBtn) ocrRunBtn.hidden = false;
  });

  // 이메일 인증
  var emailInput = document.getElementById("bizSignupEmail");
  var emailCodeInput = document.getElementById("bizSignupEmailCode");
  var emailVerified = false;

  var sendEmailBtn = document.getElementById("bizSendEmailCodeBtn");
  var emailCodeRow = document.getElementById("bizEmailCodeRow");

  sendEmailBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    if (!email) { Eatty.toast("이메일을 입력해주세요.", "error"); return; }
    sendEmailBtn.disabled = true;
    Api.request("/api/mail/send-code", { method: "POST", auth: false, body: { email: email } })
      .then(function () {
        emailCodeInput.value = "";
        emailCodeRow.hidden = false;
        var timer = document.getElementById("bizEmailCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증 메일을 발송했습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증메일 발송에 실패했습니다.", "error"); })
      .finally(function () { sendEmailBtn.disabled = false; });
  });

  document.getElementById("bizVerifyEmailCodeBtn").addEventListener("click", function () {
    var email = emailInput.value.trim();
    var code = emailCodeInput.value.trim();
    Api.request("/api/mail/verify-code", { method: "POST", auth: false, body: { email: email, code: code } })
      .then(function () {
        emailVerified = true;
        // 이메일/전화번호 모두 인증 완료되면 인증코드 입력 UI는 더 이상 필요 없다(2026-08-04 추가,
        // 일반 회원가입 signup.js와 동일한 패턴).
        emailCodeRow.hidden = true;
        emailInput.disabled = true;
        sendEmailBtn.disabled = true;
        Eatty.toast("이메일 인증이 완료되었습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증코드가 올바르지 않습니다.", "error"); });
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
  var phoneCodeRow = document.getElementById("bizPhoneCodeRow");
  var sendPhoneBtn = document.getElementById("bizSendPhoneCodeBtn");
  var phoneVerified = false;

  function formatPhone(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length !== 11) return v;
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  // 일반 회원가입(signup.js)과 동일하게, 입력 중에도 숫자만 남기고 자릿수에 맞춰 "-"를 자동으로 붙여준다.
  function formatPhoneLive(digits) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + "-" + digits.slice(3);
    return digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7);
  }

  phoneInput.addEventListener("input", function () {
    var digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
    phoneInput.value = formatPhoneLive(digits);
  });

  sendPhoneBtn.addEventListener("click", function () {
    var email = emailInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    sendPhoneBtn.disabled = true;
    Api.request("/api/phone/send-code", { method: "POST", auth: false, body: { email: email, phone: phone } })
      .then(function () {
        phoneCodeInput.value = "";
        phoneCodeRow.hidden = false;
        var timer = document.getElementById("bizPhoneCodeTimer");
        if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증번호를 발송했습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "인증번호 발송에 실패했습니다.", "error"); })
      .finally(function () { sendPhoneBtn.disabled = false; });
  });

  document.getElementById("bizVerifyPhoneCodeBtn").addEventListener("click", function () {
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

  var submitBtn = document.getElementById("bizSignupNextBtn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var requiredAgrees = document.querySelectorAll("[data-agree-item='bizTerms'][required]");
    var allAgreed = Array.prototype.every.call(requiredAgrees, function (el) { return el.checked; });
    if (!allAgreed) { Eatty.toast("필수 약관에 모두 동의해주세요.", "error"); return; }

    if (!emailVerified) { Eatty.toast("이메일 인증을 완료해주세요.", "error"); return; }
    if (!phoneVerified) { Eatty.toast("전화번호 인증을 완료해주세요.", "error"); return; }

    var password = document.getElementById("bizSignupPassword").value;
    var passwordConfirm = document.getElementById("bizSignupPasswordConfirm").value;
    if (password !== passwordConfirm) {
      Eatty.toast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    var licenseFile = licenseInput.files && licenseInput.files[0];
    if (!licenseFile) { Eatty.toast("사업자등록증명원 파일을 업로드해주세요.", "error"); return; }

    // 가게명(storeName)은 2026-08-07부터 이 화면에서 받지 않는다 — STEP2(매장 정보)에서 입력받고
    // 거기서 POST /api/business/claim-restaurant로 매장 귀속까지 처리한다.

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
      .then(function (data) {
        sessionStorage.setItem("biz_signup_email", email);
        // signup-business-info가 "STEP1을 방금 마쳤는지" 판단할 때 쓰는 값(2026-08-04 추가) —
        // 값의 존재만으로는 예전에 테스트하다 남은 오래된 sessionStorage와 구분이 안 된다.
        sessionStorage.setItem("biz_signup_at", String(Date.now()));

        // 매장 자동귀속이 모호했을 때(2026-08-07 추가) — 회원가입 자체는 성공했으므로 그대로 다음
        // 단계로 보내되, 로그인 후 사업자 마이페이지에서 수동으로 매장을 연결해야 함을 안내한다
        // (BusinessDashboardController.claimRestaurant, business-mypage.js에서 후속 처리).
        if (data && data.restaurantClaimStatus && data.restaurantClaimStatus !== "CLAIMED") {
          Eatty.toast("매장이 자동으로 연결되지 않았습니다. 로그인 후 마이페이지에서 매장을 직접 연결해주세요.", "info");
        }
        window.location.href = "signup-business-info";
      })
      .catch(function (err) { Eatty.toast(err.message || "사업자 회원가입에 실패했습니다.", "error"); })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
