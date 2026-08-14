(function () {
  if (!Api.requireLogin()) return;

  var gateSection = document.getElementById("gateSection");
  var editSection = document.getElementById("editSection");
  var gateForm = document.getElementById("gateForm");
  var gatePasswordInput = document.getElementById("gatePassword");
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
  var originalNickname = "";
  var nicknameChecked = true;

  // ---- 닉네임 중복확인(2026-08-13 추가) — 버튼은 있었는데 뒤에 아무 동작도 없었다. signup-info.js와
  // 같은 패턴이되, 여기는 "본인 기존 닉네임 그대로 저장"도 허용해야 해서(백엔드 check-nickname은 본인
  // 제외 없이 그냥 이미 쓰이는 닉네임인지만 보므로) originalNickname과 같으면 검사 없이 통과시킨다.
  var NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,12}$/;
  var checkNicknameBtn = document.getElementById("checkNicknameBtn");
  var editNicknameInput = document.getElementById("editNickname");
  if (checkNicknameBtn && editNicknameInput) {
    checkNicknameBtn.addEventListener("click", function () {
      var nickname = editNicknameInput.value.trim();
      if (!nickname) { Eatty.toast("닉네임을 입력해주세요.", "error"); return; }
      // "사용 중"이라는 문구 자체가 마치 이미 다른 사람이 쓰고 있어서 안 된다는 것처럼 읽혀서 헷갈린다는
      // 지적(2026-08-13)으로 문구를 바꿈 — 본인 현재 닉네임이라 그대로 저장 가능하다는 뜻만 남긴다.
      if (nickname === originalNickname) { Eatty.toast("지금 쓰고 있는 닉네임이라 그대로 저장할 수 있어요.", "default"); nicknameChecked = true; return; }
      if (!NICKNAME_PATTERN.test(nickname)) {
        Eatty.toast("닉네임은 2~12자, 특수문자를 포함할 수 없습니다.", "error");
        return;
      }
      checkNicknameBtn.disabled = true;
      Api.request("/api/members/nickname-availability?nickname=" + encodeURIComponent(nickname), { method: "GET", auth: false })
        .then(function (res) {
          if (res.available) {
            nicknameChecked = true;
            Eatty.toast("사용할 수 있는 닉네임입니다.", "success");
          } else {
            nicknameChecked = false;
            Eatty.toast("이미 사용 중인 닉네임입니다.", "error");
          }
        })
        .catch(function (err) { Eatty.toast(err.message || "중복확인에 실패했습니다.", "error"); })
        .finally(function () { checkNicknameBtn.disabled = false; });
    });
    editNicknameInput.addEventListener("input", function () {
      nicknameChecked = editNicknameInput.value.trim() === originalNickname;
    });
  }

  Api.request("/api/members/me").then(function (data) {
    me = data;
    setAccountView(!!data.social);
    // 소셜 계정은 비밀번호가 없어 재인증 게이트를 통과할 방법이 없다 — 게이트 자체를 건너뛰고
    // 바로 수정 폼으로 들여보낸다(비밀번호 변경 UI는 populateEditForm에서 계속 숨김 처리).
    if (data.social) openEditSection();
  }).catch(function () {
    window.location.href = "mypage";
  });

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var password = gatePasswordInput.value;
    if (!password) return;

    gateSubmitBtn.disabled = true;
    Api.request("/api/members/me/password-confirmations", { method: "POST", body: { password: password } })
      .then(function () { openEditSection(); })
      .catch(function (err) { Eatty.toast(err.message || "비밀번호가 일치하지 않습니다.", "error"); })
      .finally(function () { gateSubmitBtn.disabled = false; });
  });

  var gateSocialBtn = document.getElementById("gateSocialBtn");
  if (gateSocialBtn) {
    gateSocialBtn.addEventListener("click", function () {
      var provider = gateSocialBtn.getAttribute("data-social") || "kakao";
      window.location.href = "/api/oauth-providers/" + provider + "/authorization";
    });
  }

  function openEditSection() {
    gateSection.hidden = true;
    editSection.hidden = false;
    populateEditForm(me);
  }

  function populateEditForm(data) {
    document.getElementById("editNickname").value = data.nickname || "";
    originalNickname = data.nickname || "";
    nicknameChecked = true; // 시작값은 이미 본인 닉네임이라 그대로 저장 가능(바꿀 때만 중복확인 필요).
    document.getElementById("editEmail").value = data.email || "";
    // 전화번호는 입력칸에 미리 채워 넣지 않는다(2026-08-04 변경) — 비워두면 "변경 안 함"으로
    // 간주한다(아래 비밀번호 변경란과 동일한 관례). placeholder도 실제 번호가 아니라 형식 예시만
    // 보여준다(2026-08-04 변경 — 실제 번호를 placeholder에 보여주는 건 회피할 이유가 없어 보여도
    // 다른 사람이 화면을 넘겨봤을 때 그대로 노출되는 문제라 예시 형식으로 바꿈).
    var editPhoneInputEl = document.getElementById("editPhone");
    editPhoneInputEl.value = "";
    editPhoneInputEl.placeholder = "010-0000-0000";
    originalPhone = data.phone || "";

    var avatarPlaceholder = document.getElementById("avatarPlaceholder");
    var avatarPreview = document.getElementById("avatarPreview");
    // "잇"으로 고정돼 있던 플레이스홀더 이니셜을 닉네임 첫 글자로 채운다(2026-08-10 수정).
    var avatarInitialEl = avatarPlaceholder && avatarPlaceholder.querySelector(".e-avatar");
    if (avatarInitialEl) {
      avatarInitialEl.textContent = (data.nickname || "잇").trim().charAt(0).toUpperCase();
    }
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

    loadFoodBtiResult();
    loadNotificationSettings();
  }

  // ---- 알림 설정(2026-08-06 실연동) ----
  var notifyRecommendInput = document.getElementById("notifyRecommend");
  var notifyChatInput = document.getElementById("notifyChat");
  var notifyMarketingInput = document.getElementById("notifyMarketing");

  function loadNotificationSettings() {
    if (!notifyRecommendInput || !notifyChatInput || !notifyMarketingInput) return;
    Api.request("/api/members/me/notification-settings")
      .then(function (data) {
        notifyRecommendInput.checked = !!data.notifyRecommend;
        notifyChatInput.checked = !!data.notifyChat;
        notifyMarketingInput.checked = !!data.notifyMarketing;
      })
      .catch(function () {});
  }

  function saveNotificationSettings() {
    Api.request("/api/members/me/notification-settings", {
      method: "PATCH",
      body: {
        notifyRecommend: notifyRecommendInput.checked,
        notifyChat: notifyChatInput.checked,
        notifyMarketing: notifyMarketingInput.checked,
      },
    })
      .then(function () { Eatty.toast("알림 설정을 저장했습니다.", "success"); })
      .catch(function (err) { Eatty.toast(err.message || "알림 설정 저장에 실패했습니다.", "error"); });
  }

  [notifyRecommendInput, notifyChatInput, notifyMarketingInput].forEach(function (input) {
    if (input) input.addEventListener("change", saveNotificationSettings);
  });

  // ---- 음BTI 결과(2026-08-04 실제 연동) ----
  var AXIS_LABEL = {
    l: "담백한 맛", s: "자극적인 맛",
    f: "익숙한 음식", n: "새로운 음식",
    a: "혼자 먹기", t: "함께 먹기",
    p: "계획적 선택", i: "즉흥적 선택",
  };
  var AXIS_PAIRS = [["l", "s"], ["f", "n"], ["a", "t"], ["p", "i"]];

  // taste-quiz.js와 동일한 8개 퍼센트 막대 방식으로 통일(2026-08-12).
  function axisBarRowHtml(label, pct) {
    return (
      '<div>' +
        '<div class="flex items-center justify-between mb-1">' +
          '<span class="t-xs font-bold text-[var(--ink-700)]">' + label + '</span>' +
          '<span class="t-xs t-num">' + pct + '%</span>' +
        '</div>' +
        '<div class="e-progress" style="height:12px"><div class="e-progress-bar" style="width:' + pct + '%"></div></div>' +
      '</div>'
    );
  }

  function loadFoodBtiResult() {
    var resultBox = document.getElementById("foodBtiResult");
    var emptyBox = document.getElementById("foodBtiEmpty");
    var retakeLink = document.getElementById("foodBtiRetakeLink");
    if (!resultBox || !emptyBox) return;

    Api.request("/api/food-bti/my-result")
      .then(function (data) {
        document.getElementById("btiTypeCode").textContent = data.resultType;
        document.getElementById("btiTypeName").textContent = data.resultName;
        document.getElementById("btiTypeDesc").textContent = data.resultText;

        var axisList = document.getElementById("btiAxisList");
        var score = data.score;
        // taste-quiz.js와 동일하게 2개씩 묶어 실제 비율(% 표시)로 렌더링(2026-08-12).
        axisList.innerHTML = AXIS_PAIRS.map(function (pair, pairIdx) {
          var left = score[pair[0]], right = score[pair[1]];
          var total = left + right || 1;
          var leftPct = Math.round((left / total) * 100);
          var rightPct = 100 - leftPct;
          var isLast = pairIdx === AXIS_PAIRS.length - 1;
          return '<div class="space-y-4' + (isLast ? "" : " pb-5 border-b border-[var(--line-soft)]") + '">' +
            axisBarRowHtml(AXIS_LABEL[pair[0]], leftPct) + axisBarRowHtml(AXIS_LABEL[pair[1]], rightPct) +
            '</div>';
        }).join("");

        var foodList = document.getElementById("btiFoodList");
        // 2026-08-08 추가 — taste-quiz.js와 동일하게, 메뉴 칩을 누르면 지도 탐색에서 바로 검색되게.
        foodList.innerHTML = (data.food || []).map(function (name) {
          return '<a href="explore?q=' + encodeURIComponent(name) + '" class="e-chip">' + name + '</a>';
        }).join("");

        resultBox.hidden = false;
        emptyBox.hidden = true;
        // 결과가 있을 때만 "다시하기"가 말이 됨 — 결과 없을 때는 숨김(2026-08-08).
        if (retakeLink) retakeLink.hidden = false;
      })
      .catch(function () {
        resultBox.hidden = true;
        emptyBox.hidden = false;
        if (retakeLink) retakeLink.hidden = true;
      });
  }

  // ---- 프로필 사진(2026-08-13 수정) ----
  // 예전엔 파일을 고르거나 "기본 이미지로" 버튼을 누르는 즉시 서버에 반영됐다(전체 "저장" 버튼과 무관하게
  // 따로 확정됨) — 다른 항목들(닉네임/전화번호/비밀번호)은 전부 "저장"을 눌러야 반영되는 것과 다르게
  // 동작해서 혼란스럽다는 지적으로, 사진도 "저장"을 눌러야 실제로 반영되도록 변경. 그 전까지는 화면
  // 미리보기만 바뀌고(eatty-ui.js의 공용 드롭존 핸들러가 처리) 서버 호출은 안 한다.
  var pendingAvatarFile = null;
  var pendingAvatarRemove = false;
  var avatarInput = document.getElementById("avatarInput");
  avatarInput.addEventListener("change", function () {
    if (!avatarInput.files || !avatarInput.files[0]) return;
    pendingAvatarFile = avatarInput.files[0];
    pendingAvatarRemove = false;
    // eatty-ui.js의 공용 드롭존 핸들러가 미리보기 이미지는 보여주지만, 초기 로드/삭제 때와 달리
    // 뒤에 깔린 주황 배경(#avatarPlaceholder)은 안 숨겨서 사진 테두리 밖으로 배경색이 비쳐 보였다.
    var placeholder = document.getElementById("avatarPlaceholder");
    if (placeholder) placeholder.style.display = "none";
  });
  var avatarRemoveBtn = document.getElementById("avatarRemoveBtn");
  if (avatarRemoveBtn) {
    avatarRemoveBtn.addEventListener("click", function () {
      pendingAvatarFile = null;
      pendingAvatarRemove = true;
      avatarInput.value = "";
      var avatarPreview = document.getElementById("avatarPreview");
      avatarPreview.hidden = true;
      var placeholder = document.getElementById("avatarPlaceholder");
      if (placeholder) placeholder.style.display = "";
    });
  }
  // "저장"을 누르지 않고 나가면 미리보기만 바뀐 채 아무 것도 반영되지 않아야 하므로, 페이지를 벗어나면
  // 대기 중이던 변경은 그냥 버려진다(서버 호출 자체가 없었으니 되돌릴 것도 없음) — 별도 처리 불필요.

  // ---- 전화번호 변경 인증 ----
  var editPhoneInput = document.getElementById("editPhone");
  var sendPhoneCodeBtn = document.getElementById("sendPhoneCodeBtn");
  var phoneCodeRow = document.getElementById("phoneCodeRow");
  var editPhoneCodeInput = document.getElementById("editPhoneCode");
  var verifyPhoneCodeBtn = document.getElementById("verifyPhoneCodeBtn");

  function formatPhone(v) {
    var d = (v || "").replace(/\D/g, "");
    if (d.length !== 11) return v;
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }

  // 회원가입(signup.js)과 동일하게, 입력 중에도 숫자만 남기고 자릿수에 맞춰 "-"를 자동으로 붙여준다
  // (2026-08-04 추가).
  function formatPhoneLive(digits) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return digits.slice(0, 3) + "-" + digits.slice(3);
    return digits.slice(0, 3) + "-" + digits.slice(3, 7) + "-" + digits.slice(7);
  }

  // 크롬이 저장해둔 내 전화번호를 자동으로 채워 넣는 문제(2026-08-04 실사용 중 재발견) — autocomplete="off"
  // 만으로는 크롬의 주소록 자동완성을 못 막아서, 포커스 전에는 readonly로 잠가둔다(자동완성은 readonly
  // 필드에는 채우지 않음). 사용자가 실제로 클릭/탭해서 입력하려는 순간에만 잠금을 풀어준다.
  editPhoneInput.addEventListener("focus", function unlockOnFocus() {
    editPhoneInput.readOnly = false;
    editPhoneInput.removeEventListener("focus", unlockOnFocus);
  });

  editPhoneInput.addEventListener("input", function () {
    var digits = editPhoneInput.value.replace(/\D/g, "").slice(0, 11);
    editPhoneInput.value = formatPhoneLive(digits);

    var typed = editPhoneInput.value.trim();
    // 비워두면 "변경 안 함"으로 취급한다(2026-08-04 변경, 비밀번호 변경란과 동일한 관례) —
    // 인증도 다시 요구하지 않는다. 그 외에는(기존 번호와 같은 값을 다시 입력한 경우 포함) 실제
    // 인증번호 확인 없이는 절대 인증완료로 표시하지 않는다(2026-08-04 버그 수정 — 지웠다가 기존
    // 번호를 그대로 다시 입력하면 서버 검증 없이 인증완료로 표시되던 문제. 편집할 때마다 매번
    // 새로 인증받도록 강제한다).
    phoneVerified = !typed;
    phoneCodeRow.hidden = true;
  });

  if (sendPhoneCodeBtn) {
    sendPhoneCodeBtn.addEventListener("click", function () {
      var phone = formatPhone(editPhoneInput.value.trim());
      Api.request("/api/members/me/phone/verification-codes", { method: "POST", body: { phone: phone } })
        .then(function () {
          editPhoneCodeInput.value = "";
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
      Api.request("/api/members/me/phone/verification-codes/confirmation", { method: "POST", body: { phone: phone, code: code } })
        .then(function () {
          phoneVerified = true;
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

  // 비밀번호 확인 일치 여부 실시간 표시(2026-08-13 추가) — signup.js와 동일 패턴.
  var newPasswordConfirmInput = document.getElementById("newPasswordConfirm");
  var newPwConfirmErrorEl = document.getElementById("newPasswordConfirmError");
  var newPwConfirmOkEl = document.getElementById("newPasswordConfirmOk");
  if (newPasswordInput && newPasswordConfirmInput && newPwConfirmErrorEl && newPwConfirmOkEl) {
    var checkNewPasswordMatch = function () {
      var confirmVal = newPasswordConfirmInput.value;
      if (!confirmVal) {
        newPwConfirmErrorEl.classList.remove("is-visible");
        newPwConfirmOkEl.classList.remove("is-visible");
        return;
      }
      var matches = newPasswordInput.value === confirmVal;
      newPwConfirmErrorEl.classList.toggle("is-visible", !matches);
      newPwConfirmOkEl.classList.toggle("is-visible", matches);
    };
    newPasswordConfirmInput.addEventListener("input", checkNewPasswordMatch);
    newPasswordInput.addEventListener("input", checkNewPasswordMatch);
  }

  // ---- 저장 ----
  var editForm = document.getElementById("editForm");
  editForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var successAlert = document.getElementById("editSuccessAlert");
    successAlert.hidden = true;

    var nickname = document.getElementById("editNickname").value.trim();
    // 비워두면 "변경 안 함"이다(2026-08-04 변경) — 뭔가 입력했고 그 값이 기존 번호와 달라야만
    // 실제로 바꾸려는 시도로 취급한다.
    var phoneTyped = editPhoneInput.value.trim();
    var phone = phoneTyped ? formatPhone(phoneTyped) : originalPhone;
    var phoneChanged = !!phoneTyped && phone !== originalPhone;
    var newPassword = newPasswordInput ? newPasswordInput.value : "";
    var newPasswordConfirm = document.getElementById("newPasswordConfirm") ? document.getElementById("newPasswordConfirm").value : "";

    if (!nickname) { Eatty.toast("닉네임을 입력해주세요.", "error"); return; }
    if (nickname !== originalNickname && !nicknameChecked) {
      Eatty.toast("닉네임 중복확인을 해주세요.", "error");
      return;
    }
    if (phoneChanged && !phoneVerified) { Eatty.toast("전화번호 인증을 완료해주세요.", "error"); return; }
    if (newPassword && newPassword !== newPasswordConfirm) {
      Eatty.toast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    var body = { nickname: nickname };
    if (phoneChanged) body.phone = phone;
    if (newPassword) { body.password = newPassword; body.passwordConfirm = newPasswordConfirm; }

    var submitBtn = document.getElementById("editSubmitBtn");
    submitBtn.disabled = true;
    Api.request("/api/members/me", { method: "PATCH", body: body })
      .then(function () {
        // 프로필 사진은 여기서 실제로 반영한다(버튼을 눌렀을 때는 미리보기만 바꿔뒀었다).
        if (pendingAvatarFile) {
          var formData = new FormData();
          formData.append("profileImage", pendingAvatarFile);
          return Api.request("/api/members/me/profile-image", { method: "POST", isForm: true, body: formData });
        }
        if (pendingAvatarRemove) {
          return Api.request("/api/members/me/profile-image", { method: "DELETE" });
        }
      })
      .then(function () {
        pendingAvatarFile = null;
        pendingAvatarRemove = false;
        successAlert.hidden = false;
        setTimeout(function () { window.location.href = "mypage"; }, 900);
      })
      .catch(function (err) { Eatty.toast(err.message || "저장에 실패했습니다.", "error"); })
      .finally(function () { submitBtn.disabled = false; });
  });
})();
