(function () {
  if (!Api.requireLogin()) return;

  var gateSection = document.getElementById("gateSection");
  var editSection = document.getElementById("editSection");
  var gateForm = document.getElementById("gateForm");
  var gatePasswordInput = document.getElementById("gatePassword");
  var gatePasswordError = document.getElementById("gatePasswordError");
  var gateSubmitBtn = document.getElementById("gateSubmitBtn");
  var gateFailCountEl = document.getElementById("gateFailCount");
  if (gateFailCountEl && gateFailCountEl.closest(".e-label-side")) {
    // 실제 API는 시도 횟수를 별도로 내려주지 않는다 — 지어낸 값을 보여주지 않도록 숨긴다.
    gateFailCountEl.closest(".e-label-side").hidden = true;
  }

  function setAccountView(isSocial) {
    document.querySelectorAll('[data-account-view="local"]').forEach(function (el) { el.hidden = isSocial; });
    document.querySelectorAll('[data-account-view="social"]').forEach(function (el) { el.hidden = !isSocial; });
  }

  var me = null;
  var originalPhone = "";
  var phoneVerified = true;

  Api.request("/api/members/me").then(function (data) {
    me = data;
    setAccountView(!!data.social);
  }).catch(function () {
    window.location.href = "mypage";
  });

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    gatePasswordError.classList.remove("is-visible");
    var password = gatePasswordInput.value;
    if (!password) return;

    gateSubmitBtn.disabled = true;
    Api.request("/api/members/me/verify-password", { method: "POST", body: { password: password } })
      .then(function () { openEditSection(); })
      .catch(function (err) {
        gatePasswordError.textContent = err.message || "비밀번호가 일치하지 않습니다.";
        gatePasswordError.classList.add("is-visible");
      })
      .finally(function () { gateSubmitBtn.disabled = false; });
  });

  var gateSocialBtn = document.getElementById("gateSocialBtn");
  if (gateSocialBtn) {
    gateSocialBtn.addEventListener("click", function () {
      var provider = gateSocialBtn.getAttribute("data-social") || "kakao";
      window.location.href = "/api/auth/" + provider + "/authorize";
    });
  }

  function openEditSection() {
    gateSection.hidden = true;
    editSection.hidden = false;
    populateEditForm(me);
  }

  function populateEditForm(data) {
    document.getElementById("editNickname").value = data.nickname || "";
    document.getElementById("editEmail").value = data.email || "";
    document.getElementById("editPhone").value = (data.phone || "").replace(/-/g, "");
    originalPhone = data.phone || "";

    var avatarPlaceholder = document.getElementById("avatarPlaceholder");
    var avatarPreview = document.getElementById("avatarPreview");
    if (data.profileImageUrl) {
      avatarPreview.hidden = false;
      avatarPreview.querySelector("img").src = data.profileImageUrl;
      avatarPreview.querySelector("img").style.display = "block";
      if (avatarPlaceholder) avatarPlaceholder.style.display = "none";
    }

    // 소셜 계정은 비밀번호 변경 UI 자체를 숨긴다(백엔드가 SOCIAL_ACCOUNT_PASSWORD_CHANGE_NOT_ALLOWED로
    // 이미 막고 있지만, UI에서도 미리 안내).
    var passwordBox = document.getElementById("passwordChangeBox");
    if (passwordBox && data.social) passwordBox.hidden = true;
  }

  // ---- 프로필 사진 ----
  var avatarInput = document.getElementById("avatarInput");
  avatarInput.addEventListener("change", function () {
    if (!avatarInput.files || !avatarInput.files[0]) return;
    var formData = new FormData();
    formData.append("profileImage", avatarInput.files[0]);
    Api.request("/api/members/me/profile-image", { method: "POST", isForm: true, body: formData })
      .then(function (res) {
        Eatty.toast("프로필 사진을 변경했습니다.", "success");
        me.profileImageUrl = res.profileImageUrl;
      })
      .catch(function (err) { Eatty.toast(err.message || "이미지 업로드에 실패했습니다.", "error"); });
  });
  var avatarRemoveBtn = document.getElementById("avatarRemoveBtn");
  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener("click", function () {
      Api.request("/api/members/me/profile-image", { method: "DELETE" })
        .then(function () {
          me.profileImageUrl = null;
          var avatarPreview = document.getElementById("avatarPreview");
          avatarPreview.hidden = true;
          var placeholder = document.getElementById("avatarPlaceholder");
          if (placeholder) placeholder.style.display = "";
          Eatty.toast("기본 이미지로 변경했습니다.", "success");
        })
        .catch(function () {});
    });
  }

  // 닉네임 중복확인 — 실제 별도 조회 API가 없어 저장 시 서버가 검증한다는 점만 안내.
  var checkNicknameBtn = document.getElementById("checkNicknameBtn");
  if (checkNicknameBtn) {
    checkNicknameBtn.addEventListener("click", function () {
      Eatty.toast("저장 시 서버에서 자동으로 중복 여부를 확인합니다.", "default");
    });
  }

  // ---- 전화번호 변경 인증 ----
  var editPhoneInput = document.getElementById("editPhone");
  var sendPhoneCodeBtn = document.getElementById("sendPhoneCodeBtn");
  var phoneCodeRow = document.getElementById("phoneCodeRow");
  var editPhoneCodeInput = document.getElementById("editPhoneCode");
  var verifyPhoneCodeBtn = document.getElementById("verifyPhoneCodeBtn");
  var phoneOkEl = document.getElementById("phoneOk");

  function formatPhone(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length !== 11) return v;
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  editPhoneInput.addEventListener("input", function () {
    var same = formatPhone(editPhoneInput.value.trim()) === originalPhone;
    phoneVerified = same;
    phoneOkEl.classList.toggle("is-visible", same);
    if (!same) phoneCodeRow.hidden = true;
  });

  if (sendPhoneCodeBtn) {
    sendPhoneCodeBtn.addEventListener("click", function () {
      var phone = formatPhone(editPhoneInput.value.trim());
      Api.request("/api/members/me/phone/send-code", { method: "POST", body: { phone: phone } })
        .then(function () {
          phoneCodeRow.hidden = false;
          var timer = document.getElementById("phoneCodeTimer");
          if (timer) timer.dispatchEvent(new Event("eatty:timer-restart"));
          Eatty.toast("인증번호를 보냈습니다.", "success");
        })
        .catch(function (err) { Eatty.toast(err.message || "인증번호 발송에 실패했습니다.", "error"); });
    });
  }

  if (verifyPhoneCodeBtn) {
    verifyPhoneCodeBtn.addEventListener("click", function () {
      var phone = formatPhone(editPhoneInput.value.trim());
      var code = editPhoneCodeInput.value.trim();
      Api.request("/api/members/me/phone/verify-code", { method: "POST", body: { phone: phone, code: code } })
        .then(function () {
          phoneVerified = true;
          phoneOkEl.classList.add("is-visible");
          phoneCodeRow.hidden = true;
          Eatty.toast("전화번호 인증이 완료되었습니다.", "success");
        })
        .catch(function (err) { Eatty.toast(err.message || "인증번호가 올바르지 않습니다.", "error"); });
    });
  }

  // ---- 비밀번호 강도 ----
  var newPasswordInput = document.getElementById("newPassword");
  if (newPasswordInput) {
    newPasswordInput.addEventListener("input", function () {
      var v = newPasswordInput.value, score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
      if (/\d/.test(v)) score++;
      if (/[^\w\s]/.test(v)) score++;
      var labels = ["-", "약함", "보통", "양호", "안전"];
      document.getElementById("newPwStrengthBar").style.width = (score * 25) + "%";
      document.getElementById("newPwStrengthText").textContent = v ? labels[score] : "-";
    });
  }

  // ---- 저장 ----
  var editForm = document.getElementById("editForm");
  editForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var successAlert = document.getElementById("editSuccessAlert");
    successAlert.hidden = true;

    var nickname = document.getElementById("editNickname").value.trim();
    var phone = formatPhone(editPhoneInput.value.trim());
    var newPassword = newPasswordInput ? newPasswordInput.value : "";
    var newPasswordConfirm = document.getElementById("newPasswordConfirm") ? document.getElementById("newPasswordConfirm").value : "";

    if (!nickname) { Eatty.toast("닉네임을 입력해주세요.", "error"); return; }
    if (phone !== originalPhone && !phoneVerified) { Eatty.toast("전화번호 인증을 완료해주세요.", "error"); return; }
    if (newPassword && newPassword !== newPasswordConfirm) {
      document.getElementById("newPasswordConfirmError").classList.add("is-visible");
      return;
    }

    var body = { nickname: nickname };
    if (phone !== originalPhone) body.phone = phone;
    if (newPassword) { body.password = newPassword; body.passwordConfirm = newPasswordConfirm; }

    var submitBtn = document.getElementById("editSubmitBtn");
    submitBtn.disabled = true;
    Api.request("/api/members/me", { method: "PATCH", body: body })
      .then(function () {
        successAlert.hidden = false;
        setTimeout(function () { window.location.href = "mypage"; }, 900);
      })
      .catch(function (err) { Eatty.toast(err.message || "저장에 실패했습니다.", "error"); })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
