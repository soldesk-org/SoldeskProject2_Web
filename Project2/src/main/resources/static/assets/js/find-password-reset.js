(function () {
  var form = document.getElementById("resetPasswordForm");
  if (!form) return;

  var token = new URLSearchParams(window.location.search).get("token");
  var tokenInput = document.getElementById("resetToken");
  var alertBox = document.getElementById("tokenExpiredAlert");
  var passwordInput = document.getElementById("newPassword");
  var passwordConfirmInput = document.getElementById("newPasswordConfirm");
  var passwordError = document.getElementById("newPasswordError");
  var passwordConfirmError = document.getElementById("newPasswordConfirmError");
  var submitBtn = document.getElementById("resetSubmitBtn");

  if (token) tokenInput.value = token;
  else alertBox.hidden = false;

  // 토큰만으로는 어느 계정인지 서버에 별도로 물어볼 API가 없다 — 방금 전 화면(find-password.html)에서
  // 입력했던 이메일을 참고용으로만 보여준다(실제 검증은 제출 시 토큰으로 서버가 수행).
  var emailInput = document.getElementById("resetTargetEmail");
  var savedEmail = sessionStorage.getItem("fp_email");
  if (emailInput && savedEmail) emailInput.value = savedEmail;

  var pw = passwordInput;
  function setRule(id, ok) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle("is-ok", ok);
  }
  pw.addEventListener("input", function () {
    var v = pw.value;
    var hasLen = v.length >= 8;
    var hasMix = /[A-Za-z]/.test(v) && /\d/.test(v);
    var hasSpecial = /[^\w\s]/.test(v);
    var noRepeat = v.length > 0 && !/(.)\1\1/.test(v);

    setRule("ruleLength", hasLen);
    setRule("ruleMix", hasMix);
    setRule("ruleSpecial", hasSpecial);
    setRule("ruleNotSame", noRepeat);

    var score = [hasLen, hasMix, hasSpecial, noRepeat].filter(Boolean).length;
    var labels = ["-", "약함", "보통", "양호", "안전"];
    document.getElementById("newPwStrengthBar").style.width = (score * 25) + "%";
    document.getElementById("newPwStrengthText").textContent = v ? labels[score] : "-";
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    passwordError.classList.remove("is-visible");
    passwordConfirmError.classList.remove("is-visible");

    if (!token) { alertBox.hidden = false; return; }

    var newPassword = passwordInput.value;
    var newPasswordConfirm = passwordConfirmInput.value;
    if (newPassword !== newPasswordConfirm) {
      passwordConfirmError.classList.add("is-visible");
      return;
    }

    submitBtn.disabled = true;
    Api.request("/api/members/password-reset/confirm", {
      method: "POST",
      auth: false,
      body: { token: token, newPassword: newPassword, newPasswordConfirm: newPasswordConfirm },
    })
      .then(function () {
        window.location.href = "find-password-done.html";
      })
      .catch(function (err) {
        if (err.code === "INVALID_RESET_TOKEN") {
          alertBox.hidden = false;
        } else {
          passwordError.textContent = err.message || "비밀번호 변경에 실패했습니다.";
          passwordError.classList.add("is-visible");
        }
      })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
