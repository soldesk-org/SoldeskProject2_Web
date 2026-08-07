(function () {
  var form = document.getElementById("findEmailForm");
  if (!form) return;

  var nicknameInput = document.getElementById("findName");
  var phoneInput = document.getElementById("findPhone");
  var submitBtn = document.getElementById("findEmailNextBtn");

  function formatPhone(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length !== 11) return v;
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  // 회원가입(signup.js)과 동일하게, 입력 중에도 숫자만 남기고 자릿수에 맞춰 "-"를 자동으로 붙여준다.
  function formatPhoneLive(digits) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + "-" + digits.slice(3);
    return digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7);
  }

  phoneInput.addEventListener("input", function () {
    var digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
    phoneInput.value = formatPhoneLive(digits);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var nickname = nicknameInput.value.trim();
    var phone = formatPhone(phoneInput.value.trim());
    if (!nickname) { Eatty.toast("닉네임을 입력해주세요.", "error"); return; }
    if (!phone) { Eatty.toast("올바른 전화번호를 입력해주세요.", "error"); return; }

    // "계정 유형" 라디오를 실제로 서버에 보내 검증한다(2026-08-04 추가) — 예전엔 화면에만 있고
    // 검증되지 않아, 일반 회원 정보로 "사업자 회원"을 선택해도 그대로 인증 절차를 통과했다.
    var memberTypeEl = document.querySelector('input[name="memberType"]:checked');
    var memberType = memberTypeEl ? memberTypeEl.value : "normal";

    submitBtn.disabled = true;
    Api.request("/api/members/find-email", { method: "POST", auth: false, body: { nickname: nickname, phone: phone, memberType: memberType } })
      .then(function (data) {
        sessionStorage.setItem("fe_verification_token", data.verificationToken);
        sessionStorage.setItem("fe_phone", phone);
        return Api.request("/api/members/find-email/verify-phone/send-code", {
          method: "POST",
          auth: false,
          body: { verificationToken: data.verificationToken, phone: phone },
        });
      })
      .then(function () {
        // find-email-verify.html이 "방금 STEP1을 마쳤는지"를 판단할 때 쓰는 값(2026-08-04 추가).
        sessionStorage.setItem("fe_verify_started_at", String(Date.now()));
        window.location.href = "find-email-verify";
      })
      .catch(function (err) {
        if (err.code === "MEMBER_NOT_FOUND") {
          Eatty.toast("일치하는 계정을 찾을 수 없습니다.", "error");
        } else {
          Eatty.toast(err.message || "요청에 실패했습니다.", "error");
        }
      })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
