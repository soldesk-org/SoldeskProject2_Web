(function () {
  var emailVerified = false;
  var phoneVerified = false;
  var errorEl = document.getElementById("biz-signup-error");

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  }

  function wireVerifyField(prefix, sendPath, confirmPath, buildSendBody, buildConfirmBody, onVerified) {
    var sendBtn = document.getElementById(prefix + "-send");
    var codeGroup = document.getElementById(prefix + "-code-group");
    var confirmBtn = document.getElementById(prefix + "-confirm");
    var statusEl = document.getElementById(prefix + "-verify-status");

    sendBtn.addEventListener("click", function () {
      showError("");
      sendBtn.disabled = true;
      Api.request(sendPath, { method: "POST", auth: false, body: buildSendBody() })
        .then(function () {
          sendBtn.textContent = "인증코드 재전송";
          codeGroup.style.display = "";
          statusEl.textContent = "인증코드가 발송되었습니다.";
        })
        .catch(function (err) { showError(err.message || "인증코드 전송에 실패했습니다."); })
        .finally(function () { sendBtn.disabled = false; });
    });

    confirmBtn.addEventListener("click", function () {
      showError("");
      Api.request(confirmPath, { method: "POST", auth: false, body: buildConfirmBody() })
        .then(function () {
          statusEl.textContent = "인증되었습니다.";
          sendBtn.style.display = "none";
          codeGroup.style.display = "none";
          onVerified();
        })
        .catch(function (err) { showError(err.message || "인증에 실패했습니다."); });
    });
  }

  wireVerifyField(
    "biz-email",
    "/api/mail/send-code",
    "/api/mail/verify-code",
    function () { return { email: document.getElementById("biz-email").value.trim() }; },
    function () {
      return {
        email: document.getElementById("biz-email").value.trim(),
        code: document.getElementById("biz-email-code").value.trim(),
      };
    },
    function () { emailVerified = true; }
  );

  wireVerifyField(
    "biz-phone",
    "/api/phone/send-code",
    "/api/phone/verify-code",
    function () {
      return {
        email: document.getElementById("biz-email").value.trim(),
        phone: document.getElementById("biz-phone").value.trim(),
      };
    },
    function () {
      return {
        email: document.getElementById("biz-email").value.trim(),
        phone: document.getElementById("biz-phone").value.trim(),
        code: document.getElementById("biz-phone-code").value.trim(),
      };
    },
    function () { phoneVerified = true; }
  );

  var fileInput = document.getElementById("biz-file");
  var filePickBtn = document.getElementById("biz-file-btn");
  var fileLabel = document.getElementById("biz-file-label");
  var verifyBtn = document.getElementById("biz-verify-btn");
  var verifiedBanner = document.getElementById("biz-verified-banner");
  var submitBtn = document.getElementById("submit-btn");

  var fileAttached = false;
  var fileConfirmed = false;

  function renderVerify() {
    verifyBtn.disabled = !fileAttached;
    verifyBtn.style.opacity = verifyBtn.disabled ? "0.5" : "1";
    verifyBtn.style.display = fileConfirmed ? "none" : "";
    verifiedBanner.style.display = fileConfirmed ? "" : "none";
    submitBtn.disabled = !fileConfirmed;
    submitBtn.className =
      "h-[52px] w-full rounded-[10px] bg-gradient-to-r from-[#fd6d4a] to-[#fea255] text-[20px] font-semibold tracking-[-1px] text-white transition-opacity hover:opacity-90" +
      (fileConfirmed ? "" : " opacity-50");
  }

  filePickBtn.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    var name = fileInput.files && fileInput.files[0] ? fileInput.files[0].name : "";
    fileAttached = !!name;
    fileLabel.textContent = name || "파일 선택 (PDF, JPG, PNG)";
    fileConfirmed = false;
    renderVerify();
  });

  verifyBtn.addEventListener("click", function () {
    if (!fileAttached) return;
    verifiedBanner.querySelector("span").textContent = "파일이 첨부되었습니다. 가입 시 실제 진위 확인이 진행됩니다.";
    fileConfirmed = true;
    renderVerify();
  });

  var form = document.getElementById("signup-business-info-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");
    if (!fileConfirmed) return;
    if (!emailVerified) { showError("이메일 인증을 완료해주세요."); return; }
    if (!phoneVerified) { showError("전화번호 인증을 완료해주세요."); return; }

    var password = document.getElementById("biz-password").value;
    var passwordConfirm = document.getElementById("biz-password-confirm").value;
    if (password !== passwordConfirm) { showError("비밀번호가 일치하지 않습니다."); return; }

    var formData = new FormData();
    formData.append("email", document.getElementById("biz-email").value.trim());
    formData.append("password", password);
    formData.append("passwordConfirm", passwordConfirm);
    formData.append("nickname", document.getElementById("biz-nickname").value.trim());
    formData.append("phone", document.getElementById("biz-phone").value.trim());
    formData.append("businessLicenseFile", fileInput.files[0]);

    submitBtn.disabled = true;
    Api.request("/api/members/signup/business", { method: "POST", auth: false, isForm: true, body: formData })
      .then(function () { window.location.href = form.getAttribute("data-next"); })
      .catch(function (err) { showError(err.message || "사업자 회원가입에 실패했습니다."); })
      .finally(function () { submitBtn.disabled = false; });
  });

  renderVerify();
})();
