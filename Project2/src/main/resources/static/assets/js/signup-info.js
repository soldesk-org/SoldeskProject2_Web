(function () {
  var form = document.getElementById("signupStep2Form");
  if (!form) return;

  // 취향(선호카테고리/예산/맵기/생년월일/성별/알림설정)은 이번 리디자인에서 새로 그려진 항목이지만
  // 백엔드에 저장할 곳이 아직 없다(SignUpRequestDto에는 email/password/nickname/phone만 있음).
  // 지어낸 저장 성공을 흉내내지 않기 위해 이 값들은 서버로 보내지 않고 화면에만 남긴다.

  var nicknameInput = document.getElementById("signupNickname");
  var nicknameError = document.getElementById("nicknameError");
  var nicknameOk = document.getElementById("nicknameOk");
  var checkNicknameBtn = document.getElementById("checkNicknameBtn");
  if (checkNicknameBtn) {
    checkNicknameBtn.addEventListener("click", function () {
      Eatty.toast("가입 완료 시 서버에서 자동으로 중복 여부를 확인합니다.", "default");
    });
  }

  var submitBtn = document.getElementById("signupSubmitBtn");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var email = sessionStorage.getItem("signup_email");
    var password = sessionStorage.getItem("signup_password");
    var phone = sessionStorage.getItem("signup_phone");
    if (!email || !password || !phone) {
      Eatty.toast("가입 정보가 만료되었습니다. 처음부터 다시 진행해주세요.", "error");
      window.location.href = "signup";
      return;
    }

    var nickname = nicknameInput.value.trim();
    if (!nickname) {
      nicknameError.textContent = "닉네임을 입력해주세요.";
      nicknameError.classList.add("is-visible");
      return;
    }

    var profileImageInput = document.getElementById("profileImageInput");
    var profileFile = profileImageInput && profileImageInput.files && profileImageInput.files[0];

    submitBtn.disabled = true;
    Api.request("/api/members/signup", {
      method: "POST",
      auth: false,
      body: { email: email, password: password, passwordConfirm: password, nickname: nickname, phone: phone },
    })
      .then(function () {
        // 회원가입은 토큰을 내려주지 않으므로, 방금 만든 계정으로 바로 로그인해서
        // 프로필 사진 업로드(인증 필요 API)까지 이어서 처리한다.
        return Api.login(email, password, false);
      })
      .then(function () {
        if (!profileFile) return Promise.resolve();
        var formData = new FormData();
        formData.append("profileImage", profileFile);
        return Api.request("/api/members/me/profile-image", { method: "POST", isForm: true, body: formData })
          .catch(function () {
            Eatty.toast("프로필 사진 업로드에 실패했지만 가입은 완료되었습니다.", "default");
          });
      })
      .then(function () {
        sessionStorage.removeItem("signup_email");
        sessionStorage.removeItem("signup_password");
        sessionStorage.removeItem("signup_phone");
        sessionStorage.removeItem("signup_marketing");
        window.location.href = "signup-done";
      })
      .catch(function (err) {
        if (err.code === "DUPLICATE_NICKNAME" || (err.message || "").indexOf("닉네임") > -1) {
          nicknameError.textContent = err.message || "이미 사용 중인 닉네임입니다.";
          nicknameError.classList.add("is-visible");
        } else {
          Eatty.toast(err.message || "회원가입에 실패했습니다.", "error");
        }
      })
      .finally(function () { submitBtn.disabled = false; });
  });

  var skipBtn = document.getElementById("skipStepBtn");
  if (skipBtn) {
    skipBtn.addEventListener("click", function (e) {
      e.preventDefault();
      form.requestSubmit ? form.requestSubmit(submitBtn) : submitBtn.click();
    });
  }
})();
