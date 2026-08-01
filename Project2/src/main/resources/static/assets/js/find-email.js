(function () {
  var form = document.getElementById("findEmailForm");
  if (!form) return;

  var nicknameInput = document.getElementById("findName");
  var phoneInput = document.getElementById("findPhone");
  var nicknameError = document.getElementById("findNameError");
  var phoneError = document.getElementById("findPhoneError");
  var alertBox = document.getElementById("findEmailAlert");
  var submitBtn = document.getElementById("findEmailNextBtn");

  function formatPhone(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length !== 11) return v;
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    alertBox.hidden = true;
    nicknameError.classList.remove("is-visible");
    phoneError.classList.remove("is-visible");

    var nickname = nicknameInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    var hasError = false;
    if (!nickname) { nicknameError.classList.add("is-visible"); hasError = true; }
    if (!phone) { phoneError.classList.add("is-visible"); hasError = true; }
    if (hasError) return;

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
      .then(function () { window.location.href = "find-email-verify.html"; })
      .catch(function (err) {
        if (err.code === "MEMBER_NOT_FOUND") {
          alertBox.hidden = false;
        } else {
          Eatty.toast(err.message || "요청에 실패했습니다.", "error");
        }
      })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
