(function () {
  // 새로고침(F5)하면 곧바로 STEP1(정보 입력)로 돌려보낸다(2026-08-04 추가) — find-password-sent.js와
  // 같은 패턴. Navigation Timing API로 reload인지 구분한다.
  var navEntries = performance.getEntriesByType ? performance.getEntriesByType("navigation") : [];
  var isReload = navEntries.length > 0 && navEntries[0].type === "reload";

  // STEP1(정보 입력)을 거치지 않고 이 URL로 바로 들어온 경우도 곧바로 STEP1로 돌려보낸다
  // (2026-08-04 추가). 값이 "존재"하는지만으로는 예전에 테스트하다 남은 오래된 sessionStorage와
  // 구분이 안 되므로, fe_verify_started_at이 최근(10분 이내, 인증번호 유효시간 5분보다 여유있게)인지도 확인한다.
  var VERIFY_VALID_MS = 10 * 60 * 1000;
  var startedAt = Number(sessionStorage.getItem("fe_verify_started_at"));
  var fresh = startedAt && (Date.now() - startedAt) < VERIFY_VALID_MS;
  var token = sessionStorage.getItem("fe_verification_token");
  var phone = sessionStorage.getItem("fe_phone");
  if (!token || !phone || !fresh || isReload) {
    sessionStorage.removeItem("fe_verification_token");
    sessionStorage.removeItem("fe_phone");
    sessionStorage.removeItem("fe_verify_started_at");
    window.location.replace("find-email");
    return;
  }

  var maskedPhoneEl = document.getElementById("maskedPhone");
  if (maskedPhoneEl) maskedPhoneEl.textContent = phone.replace(/^(\d{3})-(\d{2})\d{2}-(\d{4})$/, "$1-$2**-$3");

  var codeInput = document.getElementById("verifyCode");
  var form = document.getElementById("verifyCodeForm");
  var submitBtn = document.getElementById("verifySubmitBtn");
  var resendBtn = document.getElementById("resendCodeBtn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var code = codeInput.value.trim();
    if (code.length !== 6) { Eatty.toast("인증번호 6자리를 입력해주세요.", "error"); return; }

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
        sessionStorage.removeItem("fe_verification_token");
        sessionStorage.removeItem("fe_phone");
        sessionStorage.removeItem("fe_verify_started_at");
        window.location.href = "find-email-result";
      })
      .catch(function (err) {
        Eatty.toast(err.message || "인증번호가 일치하지 않습니다.", "error");
      })
      .finally(function () { submitBtn.disabled = false; });
  });

  resendBtn.addEventListener("click", function () {
    Api.request("/api/members/find-email/verify-phone/send-code", { method: "POST", auth: false, body: { verificationToken: token, phone: phone } })
      .then(function () {
        codeInput.value = "";
        sessionStorage.setItem("fe_verify_started_at", String(Date.now()));
        var t = document.getElementById("verifyCodeTimer");
        if (t) t.dispatchEvent(new Event("eatty:timer-restart"));
        Eatty.toast("인증번호를 다시 보냈습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "재전송에 실패했습니다.", "error"); });
  });
})();
