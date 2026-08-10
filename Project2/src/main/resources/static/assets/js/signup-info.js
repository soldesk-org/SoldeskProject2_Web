(function () {
  var form = document.getElementById("signupStep2Form");
  if (!form) return;

  // STEP1(이메일/전화번호 인증)을 마치지 않고 이 URL로 바로 들어온 경우 — 폼을 보여주지 않고
  // 곧바로 STEP1로 돌려보낸다(2026-08-04 추가, 기존에는 제출 시점에만 이 체크를 했었음).
  // 값이 "존재"하는지만으로는 예전에 테스트하다 남은 오래된 sessionStorage와 구분이 안 되므로
  // signup_verified_at이 최근인지도 함께 확인한다. STEP1→STEP2는 폼 제출 성공 직후 JS가 곧바로
  // location.href로 이동시키는 구조라 실제 지연은 네트워크 왕복 정도뿐이라, 유효 시간을 아주 짧게
  // (1분) 잡는다(2026-08-04 30분→1분으로 축소 — 30분은 "몇 분 뒤 재접속"까지 통과시켜버려서
  // 직접 접속 차단이 사실상 무력화되는 문제가 실사용 중 발견됨).
  // 새로고침(F5)도 항상 STEP1로 돌려보낸다(find-password-sent.js와 동일한 패턴) — Navigation Timing
  // API로 reload인지 직접 확인한다.
  var navEntries = performance.getEntriesByType ? performance.getEntriesByType("navigation") : [];
  var isReload = navEntries.length > 0 && navEntries[0].type === "reload";

  var STEP1_VALID_MS = 60 * 1000;
  var verifiedAt = Number(sessionStorage.getItem("signup_verified_at"));
  var step1Fresh = verifiedAt && (Date.now() - verifiedAt) < STEP1_VALID_MS;
  if (!sessionStorage.getItem("signup_email") || !sessionStorage.getItem("signup_password")
      || !sessionStorage.getItem("signup_phone") || !step1Fresh || isReload) {
    sessionStorage.removeItem("signup_email");
    sessionStorage.removeItem("signup_password");
    sessionStorage.removeItem("signup_phone");
    sessionStorage.removeItem("signup_verified_at");
    window.location.replace("signup");
    return;
  }

  // 취향(선호카테고리/예산/맵기/생년월일/성별)은 이번 리디자인에서 새로 그려진 항목이지만 백엔드에
  // 저장할 곳이 아직 없다. 지어낸 저장 성공을 흉내내지 않기 위해 이 값들은 서버로 보내지 않고
  // 화면에만 남긴다. 알림 설정(notifyRecommend/notifyChat)은 2026-08-06에 SignUpRequestDto가
  // 실제로 받도록 추가되어 아래에서 서버로 함께 전송한다.

  var nicknameInput = document.getElementById("signupNickname");
  var checkNicknameBtn = document.getElementById("checkNicknameBtn");
  var nicknameChecked = false;
  var lastCheckedNickname = "";
  // 백엔드(SignUpRequestDto) @Pattern과 동일한 규칙 — 형식부터 통과해야 중복확인 API를 부른다.
  var NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,10}$/;

  if (checkNicknameBtn) {
    checkNicknameBtn.addEventListener("click", function () {
      var nickname = nicknameInput.value.trim();
      if (!nickname) { Eatty.toast("닉네임을 입력해주세요.", "error"); return; }
      if (!NICKNAME_PATTERN.test(nickname)) {
        Eatty.toast("닉네임은 2~10자, 특수문자를 포함할 수 없습니다.", "error");
        return;
      }
      checkNicknameBtn.disabled = true;
      Api.request("/api/members/check-nickname?nickname=" + encodeURIComponent(nickname), { method: "GET", auth: false })
        .then(function (res) {
          if (res.available) {
            nicknameChecked = true;
            lastCheckedNickname = nickname;
            Eatty.toast("사용할 수 있는 닉네임입니다.", "success");
          } else {
            nicknameChecked = false;
            Eatty.toast("이미 사용 중인 닉네임입니다.", "error");
          }
        })
        .catch(function (err) { Eatty.toast(err.message || "중복확인에 실패했습니다.", "error"); })
        .finally(function () { checkNicknameBtn.disabled = false; });
    });
  }

  // 중복확인을 통과한 뒤 닉네임을 다시 바꾸면(오타 수정 등) 그 값은 아직 확인된 적이 없으므로
  // 다시 확인해달라고 안내한다 — 바뀔 때마다 매번 뜨지 않도록, 확인 이후 처음 바뀐 순간에만 띄운다.
  nicknameInput.addEventListener("input", function () {
    if (nicknameChecked && nicknameInput.value.trim() !== lastCheckedNickname) {
      nicknameChecked = false;
      Eatty.toast("닉네임을 변경하셨으니 중복확인을 다시 해주세요.", "default");
    }
  });

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
      Eatty.toast("닉네임을 입력해주세요.", "error");
      return;
    }

    var profileImageInput = document.getElementById("profileImageInput");
    var profileFile = profileImageInput && profileImageInput.files && profileImageInput.files[0];

    var notifyRecommendInput = document.getElementById("notifyRecommend");
    var notifyChatInput = document.getElementById("notifyChat");

    submitBtn.disabled = true;
    Api.request("/api/members/signup", {
      method: "POST",
      auth: false,
      body: {
        email: email, password: password, passwordConfirm: password, nickname: nickname, phone: phone,
        notifyRecommend: notifyRecommendInput ? notifyRecommendInput.checked : undefined,
        notifyChat: notifyChatInput ? notifyChatInput.checked : undefined,
      },
    })
      .then(function () {
        // 회원가입은 토큰을 내려주지 않으므로, 방금 만든 계정으로 바로 로그인해서
        // 프로필 사진 업로드(인증 필요 API)까지 이어서 처리한다.
        return Api.login(email, password, false, "normal");
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
        sessionStorage.removeItem("signup_verified_at");
        // signup-done이 "방금 가입을 마쳤는지"를 확인할 때 쓰는 값 — 직접 URL로 들어오는 걸 막는다.
        sessionStorage.setItem("signup_completed_at", String(Date.now()));
        window.location.href = "signup-done";
      })
      .catch(function (err) {
        Eatty.toast(err.message || "회원가입에 실패했습니다.", "error");
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

/* 순수 UI 동작만(백엔드 저장 대상 아님) — 실제 API 연동은 signup-info.js */
(function () {
  var removeBtn = document.getElementById('profileImageRemoveBtn');
  if (removeBtn) removeBtn.addEventListener('click', function () {
    var input = document.getElementById('profileImageInput');
    if (input) input.value = '';
    document.getElementById('profileImagePreview').hidden = true;
    document.getElementById('profileImageName').innerHTML = 'JPG · PNG<br>5MB 이하';
  });

  var drop = document.getElementById('profileImageDrop');
  if (drop) drop.addEventListener('eatty:filepicked', function () {
    document.getElementById('profileImagePlaceholder').style.display = 'none';
  });

  // "테스트 보기" 팝업 — 열 때만 iframe을 로드하고(불필요한 선로딩 방지), 닫으면 src 속성을 완전히
  // 제거해 진행 중이던 테스트 상태(질문 진행도 등)를 초기화한다.
  // ※ iframe.src = '' 로 지우면 "속성"은 비워져도 "프로퍼티"는 상대경로 해석 규칙 때문에 현재 문서
  // 주소로 되돌아가버려(iframe.src 읽으면 빈 문자열이 아니라 부모 페이지 주소가 나옴) 재오픈 시
  // "!quizFrame.src"가 항상 false가 되는 문제가 있었다 — removeAttribute/getAttribute로 우회.
  var quizModal = document.getElementById('tasteQuizModal');
  var quizFrame = document.getElementById('tasteQuizFrame');
  if (quizModal && quizFrame) {
    document.querySelectorAll('[data-modal-open="tasteQuizModal"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!quizFrame.getAttribute('src')) quizFrame.setAttribute('src', 'taste-quiz?embed=1');
      });
    });
    quizModal.addEventListener('click', function (e) {
      if (e.target.closest('[data-modal-close]')) quizFrame.removeAttribute('src');
    });
    // taste-quiz.html(embed 모드)에서 "나가기" 확정 시 페이지 이동 대신 이 메시지를 보내온다.
    window.addEventListener('message', function (e) {
      if (e.origin !== window.location.origin) return;
      if (e.data && e.data.type === 'taste-quiz:close') {
        Eatty.closeModal('tasteQuizModal');
        quizFrame.removeAttribute('src');
      }
    });
  }
})();
