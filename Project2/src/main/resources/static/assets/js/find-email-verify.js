(function () {
  var token = sessionStorage.getItem("fe_verification_token");
  var phone = sessionStorage.getItem("fe_phone");
  if (!token || !phone) { window.location.href = "find-email"; return; }

  document.getElementById("fev-phone").textContent = phone;

  var inputs = document.querySelectorAll(".otp-input");
  var errorEl = document.getElementById("fev-error");
  var confirmBtn = document.getElementById("fev-confirm-btn");
  var resendBtn = document.getElementById("fev-resend-btn");

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  }

  function code() {
    return Array.prototype.map.call(inputs, function (i) { return i.value; }).join("");
  }

  confirmBtn.addEventListener("click", function () {
    showError("");
    var c = code();
    if (c.length < inputs.length) { showError("인증번호 6자리를 모두 입력해주세요."); return; }

    confirmBtn.disabled = true;
    Api.request("/api/members/find-email/verify-phone/confirm", {
      method: "POST",
      auth: false,
      body: { verificationToken: token, phone: phone, code: c },
    })
      .then(function () {
        return Api.request("/api/members/find-email/reveal", { method: "POST", auth: false, body: { verificationToken: token } });
      })
      .then(function (data) {
        sessionStorage.setItem("fe_email", data.email);
        window.location.href = "find-email-result";
      })
      .catch(function (err) { showError(err.message || "인증에 실패했습니다."); })
      .finally(function () { confirmBtn.disabled = false; });
  });

  resendBtn.addEventListener("click", function () {
    showError("");
    Api.request("/api/members/find-email/verify-phone/send-code", { method: "POST", auth: false, body: { verificationToken: token, phone: phone } })
      .catch(function (err) { showError(err.message || "재전송에 실패했습니다."); });
  });
})();
