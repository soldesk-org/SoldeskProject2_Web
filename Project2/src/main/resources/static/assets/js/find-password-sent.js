(function () {
  var email = sessionStorage.getItem("fp_email");
  var emailEl = document.getElementById("sentToEmail");
  if (emailEl && email) emailEl.textContent = email;

  var resendBtn = document.getElementById("resendResetMailBtn");
  if (resendBtn) {
    resendBtn.addEventListener("click", function () {
      if (!email) { window.location.href = "find-password.html"; return; }
      resendBtn.disabled = true;
      Api.request("/api/members/password-reset/request", { method: "POST", auth: false, body: { email: email } })
        .then(function () {
          var t = document.getElementById("linkExpireTimer");
          if (t) t.dispatchEvent(new Event("eatty:timer-restart"));
          Eatty.toast("재설정 메일을 다시 보냈습니다.", "success");
        })
        .catch(function (err) { Eatty.toast(err.message || "재발송에 실패했습니다.", "error"); })
        .finally(function () { resendBtn.disabled = false; });
    });
  }
})();
