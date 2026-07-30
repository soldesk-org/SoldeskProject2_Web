(function () {
  if (!Api.requireLogin()) return;

  var gateView = document.getElementById("gate-view");
  var editView = document.getElementById("edit-view");
  var gateForm = document.getElementById("gate-form");
  var gateError = document.getElementById("gate-error");
  var gateSubmitBtn = document.getElementById("gate-submit-btn");

  var originalEmail = "";
  var originalPhone = "";
  var emailVerified = true;
  var phoneVerified = true;

  function showGateError(msg) {
    gateError.textContent = msg;
    gateError.style.display = msg ? "" : "none";
  }

  function openEditView(me) {
    gateView.style.display = "none";
    editView.style.display = "grid";
    populateForm(me);
  }

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    showGateError("");
    var password = document.getElementById("gate-password").value;
    if (!password) return;
    gateSubmitBtn.disabled = true;
    Api.request("/api/members/me/verify-password", { method: "POST", body: { password: password } })
      .then(function () { return Api.request("/api/members/me", {}); })
      .then(openEditView)
      .catch(function (err) { showGateError(err.message || "비밀번호가 일치하지 않습니다."); })
      .finally(function () { gateSubmitBtn.disabled = false; });
  });

  function populateForm(me) {
    document.getElementById("edit-nickname").value = me.nickname || "";
    document.getElementById("edit-email").value = me.email || "";
    document.getElementById("edit-phone").value = me.phone || "";
    originalEmail = me.email || "";
    originalPhone = me.phone || "";
    document.getElementById("edit-avatar").innerHTML = me.profileImageUrl
      ? '<img src="' + me.profileImageUrl + '" class="size-full object-cover" />'
      : Api.avatarPlaceholder;
    if (me.social) {
      document.getElementById("password-section").style.display = "none";
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function wireVerifyField(prefix, sendPath, confirmPath, buildSendBody, buildConfirmBody, onVerified, valueInputId, originalGetter) {
    var input = document.getElementById(valueInputId);
    var sendBtn = document.getElementById(prefix + "-send-btn");
    var codeGroup = document.getElementById(prefix + "-code-group");
    var confirmBtn = document.getElementById(prefix + "-confirm-btn");
    var statusEl = document.getElementById(prefix + "-status");

    input.addEventListener("input", function () {
      onVerified(input.value.trim() === originalGetter());
      codeGroup.style.display = "none";
      statusEl.textContent = input.value.trim() === originalGetter() ? "" : "변경하려면 인증이 필요합니다.";
    });

    sendBtn.addEventListener("click", function () {
      statusEl.textContent = "";
      sendBtn.disabled = true;
      Api.request(sendPath, { method: "POST", body: buildSendBody() })
        .then(function () {
          codeGroup.style.display = "";
          statusEl.textContent = "인증코드가 발송되었습니다.";
        })
        .catch(function (err) { statusEl.textContent = err.message || "전송에 실패했습니다."; })
        .finally(function () { sendBtn.disabled = false; });
    });

    confirmBtn.addEventListener("click", function () {
      Api.request(confirmPath, { method: "POST", body: buildConfirmBody() })
        .then(function () {
          statusEl.textContent = "인증되었습니다.";
          codeGroup.style.display = "none";
          onVerified(true);
        })
        .catch(function (err) { statusEl.textContent = err.message || "인증에 실패했습니다."; });
    });
  }

  wireVerifyField(
    "email", "/api/members/me/email/send-code", "/api/members/me/email/verify-code",
    function () { return { email: document.getElementById("edit-email").value.trim() }; },
    function () { return { email: document.getElementById("edit-email").value.trim(), code: document.getElementById("edit-email-code").value.trim() }; },
    function (v) { emailVerified = v; }, "edit-email", function () { return originalEmail; }
  );

  wireVerifyField(
    "phone", "/api/members/me/phone/send-code", "/api/members/me/phone/verify-code",
    function () { return { phone: document.getElementById("edit-phone").value.trim() }; },
    function () { return { phone: document.getElementById("edit-phone").value.trim(), code: document.getElementById("edit-phone-code").value.trim() }; },
    function (v) { phoneVerified = v; }, "edit-phone", function () { return originalPhone; }
  );

  document.getElementById("password-toggle-btn").addEventListener("click", function () {
    var fields = document.getElementById("password-fields");
    fields.style.display = fields.style.display === "none" ? "grid" : "none";
  });

  var avatarInput = document.getElementById("avatar-input");
  document.getElementById("avatar-change-btn").addEventListener("click", function () { avatarInput.click(); });
  avatarInput.addEventListener("change", function () {
    if (!avatarInput.files || !avatarInput.files[0]) return;
    var formData = new FormData();
    formData.append("profileImage", avatarInput.files[0]);
    Api.request("/api/members/me/profile-image", { method: "POST", isForm: true, body: formData })
      .then(function (res) {
        document.getElementById("edit-avatar").innerHTML = '<img src="' + res.profileImageUrl + '" class="size-full object-cover" />';
      })
      .catch(function (err) { window.alert(err.message || "이미지 업로드에 실패했습니다."); });
  });
  document.getElementById("avatar-remove-btn").addEventListener("click", function () {
    Api.request("/api/members/me/profile-image", { method: "DELETE" })
      .then(function () { document.getElementById("edit-avatar").innerHTML = Api.avatarPlaceholder; })
      .catch(function () {});
  });

  function showEditError(msg) {
    var el = document.getElementById("edit-error");
    el.textContent = msg;
    el.style.display = msg ? "" : "none";
  }
  function showEditSuccess(msg) {
    var el = document.getElementById("edit-success");
    el.textContent = msg;
    el.style.display = msg ? "" : "none";
  }

  document.getElementById("edit-save-btn").addEventListener("click", function () {
    showEditError("");
    showEditSuccess("");

    var nickname = document.getElementById("edit-nickname").value.trim();
    var email = document.getElementById("edit-email").value.trim();
    var phone = document.getElementById("edit-phone").value.trim();
    var password = document.getElementById("edit-password").value;
    var passwordConfirm = document.getElementById("edit-password-confirm").value;

    if (!nickname) { showEditError("닉네임을 입력해주세요."); return; }
    if (email !== originalEmail && !emailVerified) { showEditError("이메일 인증을 완료해주세요."); return; }
    if (phone !== originalPhone && !phoneVerified) { showEditError("전화번호 인증을 완료해주세요."); return; }
    if (password && password !== passwordConfirm) { showEditError("비밀번호가 일치하지 않습니다."); return; }

    var body = { nickname: nickname };
    if (email !== originalEmail) body.email = email;
    if (phone !== originalPhone) body.phone = phone;
    if (password) { body.password = password; body.passwordConfirm = passwordConfirm; }

    var saveBtn = document.getElementById("edit-save-btn");
    saveBtn.disabled = true;
    Api.request("/api/members/me", { method: "PATCH", body: body })
      .then(function () {
        showEditSuccess("저장되었습니다.");
        setTimeout(function () { window.location.href = "mypage"; }, 800);
      })
      .catch(function (err) { showEditError(err.message || "저장에 실패했습니다."); })
      .finally(function () { saveBtn.disabled = false; });
  });
})();
