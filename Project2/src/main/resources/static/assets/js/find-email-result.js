(function () {
  var email = sessionStorage.getItem("fe_email");
  if (!email) { window.location.href = "find-email"; return; }

  document.querySelectorAll(".js-found-email").forEach(function (el) {
    el.textContent = email;
    el.setAttribute("data-email", email);
  });
  var copyBtn = document.getElementById("copyEmailBtn");
  if (copyBtn) copyBtn.setAttribute("data-copy-target", email);

  // 실제 API(/api/members/find-email/reveal) 응답에는 이메일만 있고 가입일/회원유형은 없다 —
  // 지어낸 값을 보여주지 않도록 해당 표시는 숨긴다.
  document.querySelectorAll(".js-found-type, .js-found-joined").forEach(function (el) {
    var parent = el.closest(".flex");
    if (parent) parent.hidden = true;
    else el.hidden = true;
  });

  // 복사 버튼 클릭 처리 자체는 이 페이지의 인라인 스크립트([data-copy-target] 위임 처리)가 담당 —
  // 여기서는 실제 이메일 값으로 data-copy-target만 채워주면 된다.

  sessionStorage.removeItem("fe_verification_token");
  sessionStorage.removeItem("fe_phone");
  sessionStorage.removeItem("fe_email");
})();

document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-copy-target]');
  if (!btn || !navigator.clipboard) return;
  navigator.clipboard.writeText(btn.getAttribute('data-copy-target')).then(function () {
    Eatty.toast('이메일을 복사했습니다.', 'success');
  });
});
