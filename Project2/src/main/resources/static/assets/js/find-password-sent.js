(function () {
  // 새로고침(F5)하면 곧바로 STEP1(이메일 입력)로 돌려보낸다(2026-08-04 추가) — 이 화면은
  // 방금 재설정을 요청한 직후에만 의미가 있고, 새로고침은 "그 상태를 다시 확인하겠다"는 의도가
  // 아니라 처음부터 다시 하고 싶다는 신호로 본다. Navigation Timing API로 reload인지 구분한다.
  var navEntries = performance.getEntriesByType ? performance.getEntriesByType("navigation") : [];
  var isReload = navEntries.length > 0 && navEntries[0].type === "reload";

  // STEP1(이메일 입력)을 마치지 않고 이 URL로 바로 들어온 경우 — 곧바로 STEP1로 돌려보낸다
  // (2026-08-04 추가). 값이 "존재"하는지만으로는 예전에 테스트하다 남은 오래된 sessionStorage와
  // 구분이 안 되므로, fp_sent_at이 최근(30분 이내)인지도 함께 확인한다.
  var FP_VALID_MS = 30 * 60 * 1000;
  var sentAt = Number(sessionStorage.getItem("fp_sent_at"));
  var fresh = sentAt && (Date.now() - sentAt) < FP_VALID_MS;
  var email = sessionStorage.getItem("fp_email");
  if (!email || !fresh || isReload) {
    sessionStorage.removeItem("fp_email");
    sessionStorage.removeItem("fp_poll_key");
    sessionStorage.removeItem("fp_sent_at");
    window.location.replace("find-password");
    return;
  }

  var emailEl = document.getElementById("sentToEmail");
  if (emailEl) emailEl.textContent = email;

  // 이메일 도메인별로 실제 그 메일함이 열리도록(2026-08-04 추가) — 예전엔 항상 Gmail로 고정되어 있었다.
  var WEBMAIL_URLS = {
    "gmail.com": "https://mail.google.com",
    "naver.com": "https://mail.naver.com",
    "daum.net": "https://mail.daum.net",
    "hanmail.net": "https://mail.daum.net",
    "kakao.com": "https://mail.kakao.com",
    "nate.com": "https://mail.nate.com",
    "hotmail.com": "https://outlook.live.com/mail",
    "outlook.com": "https://outlook.live.com/mail",
    "live.com": "https://outlook.live.com/mail",
    "icloud.com": "https://www.icloud.com/mail",
    "yahoo.com": "https://mail.yahoo.com",
  };
  var openMailBtn = document.getElementById("openMailBtn");
  if (openMailBtn) {
    var domain = (email.split("@")[1] || "").toLowerCase();
    openMailBtn.setAttribute("href", WEBMAIL_URLS[domain] || "https://mail.google.com");
  }

  var resendBtn = document.getElementById("resendResetMailBtn");
  if (resendBtn) {
    resendBtn.addEventListener("click", function () {
      if (!email) { window.location.href = "find-password"; return; }
      resendBtn.disabled = true;
      var pollKey = sessionStorage.getItem("fp_poll_key");
      Api.request("/api/password-reset-tokens", { method: "POST", auth: false, body: { email: email, pollKey: pollKey } })
        .then(function () {
          sessionStorage.setItem("fp_sent_at", String(Date.now()));
          var t = document.getElementById("linkExpireTimer");
          if (t) t.dispatchEvent(new Event("eatty:timer-restart"));
          Eatty.toast("재설정 메일을 다시 보냈습니다.", "success");
        })
        .catch(function (err) { Eatty.toast(err.message || "재발송에 실패했습니다.", "error"); })
        .finally(function () { resendBtn.disabled = false; });
    });
  }

  // 다른 탭(이메일 링크)에서 인증이 확인됐는지 주기적으로 확인한다(2026-08-04 추가) — 감지되면
  // 이 탭이 자동으로 "새 비밀번호 설정" 화면으로 넘어간다. 이메일 링크 쪽은 그 사실만 안내하고
  // 이 탭으로 돌아오라고 안내한다(find-password-reset.js 참고).
  var pollKey = sessionStorage.getItem("fp_poll_key");
  if (pollKey) {
    var pollTimer = setInterval(function () {
      Api.request("/api/password-reset-tokens/poll-status?pollKey=" + encodeURIComponent(pollKey), { method: "GET", auth: false })
        .then(function (res) {
          if (res.confirmed && res.token) {
            clearInterval(pollTimer);
            // 이 탭 스스로 넘어가는 것임을 find-password-reset.js가 구분할 수 있도록 표시해둔다.
            sessionStorage.setItem("fp_via_poll", "1");
            window.location.href = "find-password-reset?token=" + encodeURIComponent(res.token);
          }
        })
        .catch(function () {});
    }, 3000);
  }
})();
