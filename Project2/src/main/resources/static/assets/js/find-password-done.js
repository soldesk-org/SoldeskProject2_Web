(function () {
  // 방금 실제로 비밀번호를 바꾼 게 아니면(=이 URL로 바로 들어오거나, 홈으로 이동한 뒤 뒤로가기로
  // 돌아온 경우) 곧바로 홈으로 돌려보낸다(2026-08-04 추가). 통과하자마자 값을 지워서 1회만
  // 보이게 하고, 뒤로가기로 브라우저 캐시(bfcache)에서 화면이 그대로 복원되는 경우까지 pageshow로
  // 다시 검사한다(스크립트가 다시 실행되지 않는 bfcache 복원은 guard()만으로는 못 막는다).
  var DONE_VALID_MS = 5 * 60 * 1000;
  function guardOrLeave() {
    var doneAt = Number(sessionStorage.getItem("fp_done_at"));
    var fresh = doneAt && (Date.now() - doneAt) < DONE_VALID_MS;
    if (!fresh) {
      window.location.replace("index");
      return false;
    }
    return true;
  }
  if (!guardOrLeave()) return;
  sessionStorage.removeItem("fp_done_at");

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) guardOrLeave();
  });

  var email = sessionStorage.getItem("fp_email");
  var emailEl = document.getElementById("doneEmail");
  if (emailEl && email) emailEl.textContent = email;

  var changedAtEl = document.getElementById("doneChangedAt");
  if (changedAtEl) {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    changedAtEl.textContent = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
      " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
  }

  sessionStorage.removeItem("fp_email");
})();
