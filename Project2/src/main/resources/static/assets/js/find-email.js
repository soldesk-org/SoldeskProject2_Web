(function () {
  var form = document.getElementById("find-email-form");
  var errorEl = document.getElementById("fe-error");
  var submitBtn = document.getElementById("fe-submit-btn");

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");
    var nickname = document.getElementById("fe-nickname").value.trim();
    var phone = document.getElementById("fe-phone").value.trim();
    if (!nickname || !phone) { showError("닉네임과 전화번호를 입력해주세요."); return; }

    submitBtn.disabled = true;
    Api.request("/api/members/find-email", { method: "POST", auth: false, body: { nickname: nickname, phone: phone } })
      .then(function (data) {
        sessionStorage.setItem("fe_verification_token", data.verificationToken);
        sessionStorage.setItem("fe_phone", phone);
        return Api.request("/api/members/find-email/verify-phone/send-code", {
          method: "POST",
          auth: false,
          body: { verificationToken: data.verificationToken, phone: phone },
        });
      })
      .then(function () { window.location.href = "find-email-verify"; })
      .catch(function (err) { showError(err.message || "요청에 실패했습니다."); })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
