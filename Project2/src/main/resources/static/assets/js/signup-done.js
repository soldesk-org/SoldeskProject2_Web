(function () {
  // 방금 가입을 마치고 온 게 아니라 이 URL로 바로 들어온 경우 — 회원가입 처음 화면으로 돌려보낸다
  // (2026-08-04 추가). signup_completed_at은 signup-info.js가 가입 성공 직후에만 남기는 값이라,
  // 값 존재 여부만으로도 "직접 URL 접근"을 걸러낼 수 있지만 오래된 흔적과 구분하기 위해
  // 최근(5분 이내)인지도 함께 확인한다.
  var COMPLETED_VALID_MS = 5 * 60 * 1000;
  var completedAt = Number(sessionStorage.getItem("signup_completed_at"));
  if (!completedAt || (Date.now() - completedAt) >= COMPLETED_VALID_MS || !Api.isLoggedIn()) {
    sessionStorage.removeItem("signup_completed_at");
    window.location.replace("signup");
    return;
  }

  var nicknameEl = document.getElementById("doneNickname");
  var loginBtn = document.getElementById("goLoginBtn");

  if (loginBtn) loginBtn.setAttribute("href", Api.landingPageForRole());

  Api.request("/api/members/me")
    .then(function (data) {
      if (nicknameEl && data.nickname) nicknameEl.textContent = data.nickname;
    })
    .catch(function () {});
})();
