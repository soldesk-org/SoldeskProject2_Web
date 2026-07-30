(function () {
  var emailVerified = false;
  var phoneVerified = false;

  function showError(msg) {
    var el = document.getElementById("signup-error");
    el.textContent = msg;
    el.style.display = msg ? "" : "none";
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
    "email",
    "/api/mail/send-code",
    "/api/mail/verify-code",
    function () { return { email: document.getElementById("signup-email").value.trim() }; },
    function () {
      return {
        email: document.getElementById("signup-email").value.trim(),
        code: document.getElementById("signup-email-code").value.trim(),
      };
    },
    function () { emailVerified = true; }
  );

  wireVerifyField(
    "phone",
    "/api/phone/send-code",
    "/api/phone/verify-code",
    function () {
      return {
        email: document.getElementById("signup-email").value.trim(),
        phone: document.getElementById("signup-phone").value.trim(),
      };
    },
    function () {
      return {
        email: document.getElementById("signup-email").value.trim(),
        phone: document.getElementById("signup-phone").value.trim(),
        code: document.getElementById("signup-phone-code").value.trim(),
      };
    },
    function () { phoneVerified = true; }
  );

  var form = document.getElementById("signup-info-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");

    if (!emailVerified) { showError("이메일 인증을 완료해주세요."); return; }
    if (!phoneVerified) { showError("전화번호 인증을 완료해주세요."); return; }

    var password = document.getElementById("signup-password").value;
    var passwordConfirm = document.getElementById("signup-password-confirm").value;
    if (password !== passwordConfirm) { showError("비밀번호가 일치하지 않습니다."); return; }

    var submitBtn = document.getElementById("signup-submit-btn");
    submitBtn.disabled = true;
    Api.request("/api/members/signup", {
      method: "POST",
      auth: false,
      body: {
        email: document.getElementById("signup-email").value.trim(),
        password: password,
        passwordConfirm: passwordConfirm,
        nickname: document.getElementById("signup-nickname").value.trim(),
        phone: document.getElementById("signup-phone").value.trim(),
      },
    })
      .then(function () { window.location.href = form.getAttribute("data-next"); })
      .catch(function (err) { showError(err.message || "회원가입에 실패했습니다."); })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
