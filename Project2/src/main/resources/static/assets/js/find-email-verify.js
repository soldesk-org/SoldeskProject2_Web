(function () {
  var token = sessionStorage.getItem("fe_verification_token");
  var phone = sessionStorage.getItem("fe_phone");
  if (!token || !phone) { window.location.href = "find-email"; return; }

  var maskedPhoneEl = document.getElementById("maskedPhone");
  if (maskedPhoneEl) maskedPhoneEl.textContent = phone.replace(/^(\d{3})-(\d{2})\d{2}-(\d{4})$/, "$1-$2**-$3");

  var codeInput = document.getElementById("verifyCode");
  var errorEl = document.getElementById("verifyCodeError");
  var form = document.getElementById("verifyCodeForm");
  var submitBtn = document.getElementById("verifySubmitBtn");
  var resendBtn = document.getElementById("resendCodeBtn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errorEl.classList.remove("is-visible");

    var code = codeInput.value.trim();
    if (code.length !== 6) { errorEl.classList.add("is-visible"); return; }

    submitBtn.disabled = true;
    Api.request("/api/members/find-email/verify-phone/confirm", {
      method: "POST",
      auth: false,
      body: { verificationToken: token, phone: phone, code: code },
    })
      .then(function () {
        return Api.request("/api/members/find-email/reveal", { method: "POST", auth: false, body: { verificationToken: token } });
      })
      .then(function (data) {
        sessionStorage.setItem("fe_email", data.email);
        window.location.href = "find-email-result";
      })
      .catch(function (err) {
        errorEl.textContent = err.message || "인증번호가 일치하지 않습니다.";
        errorEl.classList.add("is-visible");
      })
      .finally(function () { submitBtn.disabled = false; });
  });

  resendBtn.addEventListener("click", function () {
    Api.request("/api/members/find-email/verify-phone/send-code", { method: "POST", auth: false, body: { verificationToken: token, phone: phone } })
      .then(function () {
        var t = document.getElementById("verifyCodeTimer");
        if (t) t.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증번호를 다시 보냈습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "재전송에 실패했습니다.", "error"); });
  });
})();
