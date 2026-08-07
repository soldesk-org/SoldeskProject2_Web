(function () {
  var nicknameEl = document.getElementById("doneNickname");
  var emailEl = document.getElementById("doneEmail");
  var loginBtn = document.getElementById("goLoginBtn");

  // signup-info.js가 가입 직후 자동 로그인까지 해두므로, 이미 로그인된 상태에서 이 화면에 온다.
  if (!Api.isLoggedIn()) return;

  if (loginBtn) loginBtn.setAttribute("href", Api.landingPageForRole());

  Api.request("/api/members/me")
    .then(function (data) {
      if (nicknameEl && data.nickname) nicknameEl.textContent = data.nickname;
      if (emailEl && data.email) emailEl.textContent = data.email;
    })
    .catch(function () {});
})();
