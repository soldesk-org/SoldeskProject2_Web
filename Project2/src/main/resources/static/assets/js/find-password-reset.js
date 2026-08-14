(function () {
  var form = document.getElementById("resetPasswordForm");
  if (!form) return;

  var token = new URLSearchParams(window.location.search).get("token");
  var tokenInput = document.getElementById("resetToken");
  var alertBox = document.getElementById("tokenExpiredAlert");
  var passwordInput = document.getElementById("newPassword");
  var passwordConfirmInput = document.getElementById("newPasswordConfirm");
  var submitBtn = document.getElementById("resetSubmitBtn");
  var returnToTabNotice = document.getElementById("returnToTabNotice");
  var continueHereBtn = document.getElementById("continueHereBtn");

  if (token) {
    tokenInput.value = token;
  } else {
    alertBox.hidden = false;
    if (returnToTabNotice) returnToTabNotice.hidden = true;
  }

  // 원래 탭(find-password-sent.html)이 폴링으로 감지해서 스스로 이리로 넘어온 경우인지 확인한다
  // (2026-08-04 추가) — 그 경우엔 "돌아가라" 안내 대신 바로 새 비밀번호 폼을 보여준다.
  var viaPoll = sessionStorage.getItem("fp_via_poll") === "1";
  sessionStorage.removeItem("fp_via_poll");

  if (token && !viaPoll) {
    // 이메일 링크를 직접 연 경우 — 실제 토큰을 소비하지 않고 "링크가 열렸다"는 사실만 서버에 남겨서,
    // 원래 탭의 폴링이 감지하고 자동으로 이 화면(같은 token)으로 넘어올 수 있게 한다.
    // 같은 링크를 또 열었으면(firstTime=false) 이미 인증을 마친 것이므로 "일치하지 않는 URL"로
    // 안내하고 메인 페이지로 보낸다(2026-08-04 추가).
    Api.request("/api/members/password-reset/confirm-click?token=" + encodeURIComponent(token), { method: "POST", auth: false })
      .then(function (res) {
        if (!res.firstTime) {
          Eatty.toast("일치하지 않는 URL입니다.", "error");
          window.location.href = "index";
        }
      })
      .catch(function () {});
  } else if (token && viaPoll) {
    if (returnToTabNotice) returnToTabNotice.hidden = true;
    if (form) form.hidden = false;
  }

  if (continueHereBtn) {
    continueHereBtn.addEventListener("click", function () {
      if (returnToTabNotice) returnToTabNotice.hidden = true;
      if (form) form.hidden = false;
    });
  }

  // 토큰만으로는 어느 계정인지 서버에 별도로 물어볼 API가 없다 — 방금 전 화면(find-password)에서
  // 입력했던 이메일을 참고용으로만 보여준다(실제 검증은 제출 시 토큰으로 서버가 수행).
  var emailInput = document.getElementById("resetTargetEmail");
  var savedEmail = sessionStorage.getItem("fp_email");
  if (emailInput && savedEmail) emailInput.value = savedEmail;

  // signup.js와 동일한 강도 기준(2026-08-04 통일) — 길이 / 대소문자 혼합 / 숫자 / 특수문자.
  var pw = passwordInput;
  function setRule(id, ok) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle("is-ok", ok);
  }
  pw.addEventListener("input", function () {
    var v = pw.value;
    var hasLen = v.length >= 8;
    var hasMix = /[A-Z]/.test(v) && /[a-z]/.test(v);
    var hasDigit = /\d/.test(v);
    var hasSpecial = /[^\w\s]/.test(v);

    setRule("ruleLength", hasLen);
    setRule("ruleMix", hasMix);
    setRule("ruleDigit", hasDigit);
    setRule("ruleSpecial", hasSpecial);

    var score = [hasLen, hasMix, hasDigit, hasSpecial].filter(Boolean).length;
    var labels = ["-", "약함", "보통", "양호", "안전"];
    document.getElementById("newPwStrengthBar").style.width = (score * 25) + "%";
    document.getElementById("newPwStrengthText").textContent = v ? labels[score] : "-";
  });

  // 비밀번호 확인 일치 여부 실시간 표시(2026-08-13 추가) — signup.js와 동일 패턴.
  var confirmErrorEl = document.getElementById("newPasswordConfirmError");
  var confirmOkEl = document.getElementById("newPasswordConfirmOk");
  function checkPasswordMatch() {
    if (!confirmErrorEl || !confirmOkEl) return;
    var confirmVal = passwordConfirmInput.value;
    if (!confirmVal) {
      confirmErrorEl.classList.remove("is-visible");
      confirmOkEl.classList.remove("is-visible");
      return;
    }
    var matches = pw.value === confirmVal;
    confirmErrorEl.classList.toggle("is-visible", !matches);
    confirmOkEl.classList.toggle("is-visible", matches);
  }
  passwordConfirmInput.addEventListener("input", checkPasswordMatch);
  pw.addEventListener("input", checkPasswordMatch);

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!token) { alertBox.hidden = false; return; }

    var newPassword = passwordInput.value;
    var newPasswordConfirm = passwordConfirmInput.value;
    if (newPassword !== newPasswordConfirm) {
      Eatty.toast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    submitBtn.disabled = true;
    Api.request("/api/members/password-reset/confirm", {
      method: "POST",
      auth: false,
      body: { token: token, newPassword: newPassword, newPasswordConfirm: newPasswordConfirm },
    })
      .then(function () {
        // find-password-done이 "방금 실제로 비밀번호를 바꿨는지"를 확인할 때 쓰는 값(2026-08-04 추가).
        sessionStorage.setItem("fp_done_at", String(Date.now()));
        window.location.href = "find-password-done";
      })
      .catch(function (err) {
        if (err.code === "INVALID_RESET_TOKEN") {
          alertBox.hidden = false;
        } else {
          Eatty.toast(err.message || "비밀번호 변경에 실패했습니다.", "error");
        }
      })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
