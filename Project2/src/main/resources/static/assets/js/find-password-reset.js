(function () {
  var form = document.getElementById("fpr-form");
  var errorEl = document.getElementById("fpr-error");
  var submitBtn = document.getElementById("fpr-submit-btn");
  var token = new URLSearchParams(window.location.search).get("token");

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  }

  if (!token) showError("유효하지 않은 재설정 링크입니다. 이메일의 링크를 다시 확인해주세요.");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");
    if (!token) { showError("유효하지 않은 재설정 링크입니다."); return; }

    var newPassword = document.getElementById("fpr-password").value;
    var newPasswordConfirm = document.getElementById("fpr-password-confirm").value;
    if (newPassword !== newPasswordConfirm) { showError("비밀번호가 일치하지 않습니다."); return; }

    submitBtn.disabled = true;
    Api.request("/api/members/password-reset/confirm", {
      method: "POST",
      auth: false,
      body: { token: token, newPassword: newPassword, newPasswordConfirm: newPasswordConfirm },
    })
      .then(function () { window.location.href = "find-password-done"; })
      .catch(function (err) { showError(err.message || "비밀번호 변경에 실패했습니다."); })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
