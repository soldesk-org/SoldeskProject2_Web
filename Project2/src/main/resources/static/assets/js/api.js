/* 잇티웨이 공용 API/인증 모듈 (모든 페이지에서 sidebar.js/페이지 스크립트보다 먼저 로드) */
(function (global) {
  var API_BASE = "";
  var KEY_ACCESS = "ew_access_token";
  var KEY_REFRESH = "ew_refresh_token";
  var KEY_MEMBER_ID = "ew_member_id";

  // 2026-08-09 — "로그인 상태 유지"를 체크하지 않아도(심지어 소셜로그인처럼 체크박스 자체가 없어도)
  // 항상 localStorage에만 저장돼서 브라우저를 닫았다 열어도 계속 로그인 상태로 남아있던 문제를 고쳤다.
  // localStorage(브라우저를 껐다 켜도 유지) / sessionStorage(탭을 닫으면 사라짐) 중 로그인 시점에
  // 고른 쪽에만 저장하고 반대쪽은 비워서, 실제로 "유지 안 함"이 브라우저 재시작 시 로그아웃으로 이어지게 한다.
  function activeStorage() {
    if (localStorage.getItem(KEY_ACCESS) || localStorage.getItem(KEY_REFRESH)) return localStorage;
    if (sessionStorage.getItem(KEY_ACCESS) || sessionStorage.getItem(KEY_REFRESH)) return sessionStorage;
    return localStorage; // 아직 아무 세션도 없으면 기본값(다음 setSession 호출이 실제로 결정함)
  }

  function getAccessToken() { return activeStorage().getItem(KEY_ACCESS); }
  function getRefreshToken() { return activeStorage().getItem(KEY_REFRESH); }
  function getMemberId() { return activeStorage().getItem(KEY_MEMBER_ID); }

  // remember: true면 localStorage(로그인 유지), false면 sessionStorage(브라우저 닫으면 로그아웃).
  // 생략하면(예: 토큰 재발급) 지금 로그인에 쓰이고 있는 저장소를 그대로 유지한다.
  function setSession(data, remember) {
    var storage = remember === undefined ? activeStorage() : (remember ? localStorage : sessionStorage);
    var other = storage === localStorage ? sessionStorage : localStorage;
    if (remember !== undefined) { other.removeItem(KEY_ACCESS); other.removeItem(KEY_REFRESH); other.removeItem(KEY_MEMBER_ID); }
    if (data.accessToken) storage.setItem(KEY_ACCESS, data.accessToken);
    if (data.refreshToken) storage.setItem(KEY_REFRESH, data.refreshToken);
    if (data.memberId !== undefined && data.memberId !== null) storage.setItem(KEY_MEMBER_ID, String(data.memberId));
  }

  function clearSession() {
    [localStorage, sessionStorage].forEach(function (storage) {
      storage.removeItem(KEY_ACCESS);
      storage.removeItem(KEY_REFRESH);
      storage.removeItem(KEY_MEMBER_ID);
    });
  }

  function decodeToken(token) {
    if (!token) return null;
    try {
      var payload = token.split(".")[1];
      var json = decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map(function (c) { return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2); })
          .join("")
      );
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getAccessToken();
  }

  function getRole() {
    var payload = decodeToken(getAccessToken());
    return payload ? payload.role : null;
  }

  var refreshPromise = null;
  function refreshSession() {
    if (refreshPromise) return refreshPromise;
    var memberId = getMemberId();
    var refreshToken = getRefreshToken();
    if (!memberId || !refreshToken) return Promise.resolve(false);

    refreshPromise = fetch(API_BASE + "/api/sessions/refresh-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: memberId, refreshToken: refreshToken }),
    })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function (data) {
        setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, memberId: memberId });
        return true;
      })
      .catch(function () {
        clearSession();
        return false;
      })
      .finally(function () { refreshPromise = null; });
    return refreshPromise;
  }

  /**
   * @param {string} path e.g. "/api/members/login"
   * @param {object} options { method, body, auth, isForm, retry }
   */
  function request(path, options) {
    options = options || {};
    var method = options.method || "GET";
    var auth = options.auth !== false;
    var isForm = !!options.isForm;
    var headers = options.headers || {};

    if (!isForm && options.body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) {
      var token = getAccessToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }

    var fetchOptions = { method: method, headers: headers };
    if (options.body !== undefined) fetchOptions.body = isForm ? options.body : JSON.stringify(options.body);

    return fetch(API_BASE + path, fetchOptions).then(function (res) {
      if (res.status === 401 && auth && getRefreshToken() && !options._retried) {
        return refreshSession().then(function (ok) {
          if (ok) return request(path, Object.assign({}, options, { _retried: true }));
          return res.json().catch(function () { return {}; }).then(function (body) {
            return Promise.reject(Object.assign({ status: res.status }, body));
          });
        });
      }
      if (res.status === 204) return {};
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) return Promise.reject(Object.assign({ status: res.status }, body));
        return body;
      });
    });
  }

  function login(email, password, rememberMe, memberType) {
    return request("/api/sessions", { method: "POST", auth: false,
      body: { email: email, password: password, rememberMe: !!rememberMe, memberType: memberType } })
      .then(function (data) {
        setSession(data, !!rememberMe);
        return data;
      });
  }

  function logout() {
    var token = getAccessToken();
    var done = token
      ? request("/api/sessions", { method: "DELETE", auth: false, body: { accessToken: token } }).catch(function () {})
      : Promise.resolve();
    return done.finally(function () { clearSession(); });
  }

  function requireLogin(redirectTo) {
    if (!isLoggedIn()) {
      window.location.href = redirectTo || "login";
      return false;
    }
    return true;
  }

  function requireRole(role, redirectTo) {
    if (!requireLogin()) return false;
    if (getRole() !== role) {
      window.location.href = redirectTo || "explore";
      return false;
    }
    return true;
  }

  function landingPageForRole() {
    if (getRole() === "ADMIN") return "admin";
    return getRole() === "BUSINESS" ? "business-mypage" : "explore";
  }

  var AVATAR_PLACEHOLDER = '<img src="assets/images/default-avatar.png" alt="기본 프로필 이미지" class="size-full object-cover" />';

  var PHOTO_PLACEHOLDER = '<img src="assets/images/default-photo.svg" alt="이미지 없음" class="size-full object-contain bg-[#f7f7f7] p-6" />';

  /**
   * 2026-08-01 리디자인: [data-auth-view] 표시/숨김 자체는 eatty-ui.js의 Eatty.setAuth()/applyAuth()가
   * 담당한다(el.hidden 토글 방식이라 Tailwind 클래스가 안 깨짐, data-devbar 개발용 상태 전환도 같이 관리).
   * 여기서는 그 상태를 "실제 로그인 여부"로 한 번 덮어써주기만 하면 된다 — 두 스크립트가 같은 로직을
   * 중복 구현하면 서로 다른 방식(style.display vs hidden)으로 충돌하므로 반드시 이렇게 위임할 것.
   */
  function initNavAuthUI() {
    if (!global.Eatty || typeof global.Eatty.setAuth !== "function") return;
    var loggedIn = isLoggedIn();
    var role = getRole();
    var state = "guest";
    if (loggedIn) {
      if (role === "BUSINESS") state = "business";
      else if (role === "ADMIN") state = "admin";
      else state = "user";
    }
    global.Eatty.setAuth(state);

    // 2026-08-12 추가 — 헤더 프로필 드롭다운(#headerProfileMenu) 메뉴 항목이 페이지마다 각자 손으로
    // 복붙되면서 서로 달라져 있었다(어떤 페이지는 "프로필 수정"이 아예 없고, 어떤 페이지는 "내 리뷰"가
    // 빠져있는 등). business-mypage.html은 사업자 전용 메뉴("내 매장 관리" 등)라 대상에서 제외한다.
    // (2026-08-12 2차 추가) admin/business 계정이 index.html 등 일반 페이지에서 이 드롭다운을 열면
    // "관리자 콘솔"/"내 매장 관리" 링크가 함께 나왔는데, 이미 상단 네비게이션에 "관리자"/"내 매장" 탭이
    // 있어서 중복이라는 지적으로 admin/business도 같은 4개 항목으로 통일한다(사업자 본인 전용 페이지인
    // business-mypage.html만 예외).
    var onBusinessOwnPage = /\/business-mypage(\.html)?\/?$/.test(window.location.pathname);
    if ((state === "user" || state === "admin" || state === "business") && !(state === "business" && onBusinessOwnPage)) {
      var profileMenu = document.getElementById("headerProfileMenu");
      var menuHead = profileMenu && profileMenu.querySelector(".e-dropdown-head");
      if (profileMenu && menuHead) {
        profileMenu.innerHTML = "";
        profileMenu.appendChild(menuHead);
        profileMenu.insertAdjacentHTML("beforeend",
          '<a class="e-dropdown-item" href="mypage">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>' +
            '마이페이지</a>' +
          '<a class="e-dropdown-item" href="mypage-reviews">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>' +
            '내 리뷰</a>' +
          '<a class="e-dropdown-item" href="mypage-edit">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.2 3.5a2.1 2.1 0 0 1 3 3L7.5 14.2l-3.8 1 1-3.8 7.5-7.9Z"/><path d="M20 21H4"/></svg>' +
            '프로필 수정</a>' +
          '<div class="e-dropdown-sep"></div>' +
          '<button type="button" class="e-dropdown-item e-dropdown-item--danger" id="headerLogoutBtn">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>' +
            '로그아웃</button>'
        );
      }
    }

    // 페이지마다 로그아웃 버튼 id가 다름(headerLogoutBtn/adminLogoutBtn/bizLogoutBtn/drawerLogoutBtn/logoutBtn 등)
    // — "LogoutBtn"으로 끝나거나 정확히 "logoutBtn"인 요소를 전부 잡아서 공통 처리.
    document.querySelectorAll("[id$='LogoutBtn'], #logoutBtn").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        logout().then(function () { window.location.href = "index"; });
      });
    });

    // 공용 헤더/드로어의 닉네임/이메일/아바타(#headerNickname, #headerEmail, #headerAvatar,
    // #drawerNickname, #drawerEmail, #drawerAvatar)는 거의 모든 페이지에 똑같이 반복되는 요소라
    // 각 페이지 JS마다 중복으로 GET /api/members/me를 부르지 않도록 여기서 한 번만 채운다.
    // 아바타는 프로필 사진이 있으면 그 이미지를, 없으면 닉네임 첫 글자를 보여준다(마이페이지 본문
    // 카드와 동일한 규칙 — 2026-08-04 전까지는 "잇" 하드코딩이라 마이페이지 본문 아바타와 서로 달라 보였다).
    if (loggedIn) {
      var headerNickname = document.getElementById("headerNickname");
      // 2026-08-09 추가 — business-mypage.html의 프로필 드롭다운 헤더("잇티식당 강남점" 고정 시안값)가
      // 이 공용 로직 대상이 아니어서 실제 사업자명과 무관하게 항상 그 값으로 떠 있었다.
      var headerNicknameHead = document.getElementById("headerNicknameHead");
      var headerEmail = document.getElementById("headerEmail");
      var headerAvatar = document.getElementById("headerAvatar");
      var drawerNickname = document.getElementById("drawerNickname");
      var drawerEmail = document.getElementById("drawerEmail");
      var drawerAvatar = document.getElementById("drawerAvatar");
      // 2026-08-12 추가 — 음식 취향 찾기(음BTI) 배지가 index.html에서만 채워지고 있었다(index.js에만
      // 있던 로직이라 다른 페이지는 #headerFoodBtiBadge 요소 자체가 없거나 있어도 안 채워졌음). 관리자/
      // 사업자 전용 페이지(admin.html/business-mypage.html)는 이 배지를 두지 않아 자연히 대상에서 빠진다.
      var headerFoodBtiBadge = document.getElementById("headerFoodBtiBadge");
      var drawerFoodBtiBadge = document.getElementById("drawerFoodBtiBadge");
      if (headerNickname || headerNicknameHead || headerEmail || headerAvatar || drawerNickname || drawerEmail || drawerAvatar
          || headerFoodBtiBadge || drawerFoodBtiBadge) {
        // 2026-08-19 추가 — eatty.css의 #headerNickname 등 ID 선택자가 기본으로 스켈레톤(회색 shimmer
        // 바)을 보여주고 있다. 응답을 실제로 받은 뒤(성공/실패 무관)에만 .e-auth-loaded를 추가해서
        // 원래 스타일로 되돌린다 — 응답 오기 전에 미리 켜버리면 로딩 중에도 옛 자리표시자 텍스트가
        // 그대로 보이는 원래 문제가 재현되므로, 반드시 .then/.catch 안에서만 처리한다.
        var revealAuthText = function () {
          [headerNickname, headerEmail, drawerNickname, drawerEmail, headerAvatar, drawerAvatar].forEach(function (el) {
            if (el) el.classList.add("e-auth-loaded");
          });
        };
        request("/api/members/me").then(function (data) {
          if (headerNickname && data.nickname) headerNickname.textContent = data.nickname;
          if (headerNicknameHead && data.nickname) headerNicknameHead.textContent = data.nickname;
          if (headerEmail && data.email) headerEmail.textContent = data.email;
          if (drawerNickname && data.nickname) drawerNickname.textContent = data.nickname;
          if (drawerEmail && data.email) drawerEmail.textContent = data.email;
          [headerAvatar, drawerAvatar].forEach(function (avatarEl) {
            if (!avatarEl) return;
            if (data.profileImageUrl) {
              avatarEl.innerHTML = '<img src="' + data.profileImageUrl + '" class="size-full object-cover rounded-full" alt="프로필 사진">';
            } else if (data.nickname) {
              avatarEl.textContent = data.nickname.charAt(0);
            }
          });
          if (data.foodBti) {
            [headerFoodBtiBadge, drawerFoodBtiBadge].forEach(function (el) {
              if (el) { el.textContent = data.foodBti; el.hidden = false; }
            });
          }
          revealAuthText();
        }).catch(revealAuthText);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initNavAuthUI);

  /* 알림 벨(2026-08-06 추가) — eatty-ui.js는 fetch를 하지 않는 순수 프레젠테이션 모듈이라(파일 상단
     주석 참고), 실제 서버 연동은 여기서 담당하고 Eatty.notify.setItems()/setHooks()로 넘겨준다.
     실시간 전달(2026-08-06 2차 추가)은 19(오픈채팅)이 이미 깔아둔 /ws-chat STOMP 브로커를 그대로
     재사용한다(NotificationServiceImpl.create()가 저장과 동시에 /user/queue/notifications로 push).
     chat.html이 CDN에서 @stomp/stompjs를 불러오는 것과 동일한 방식을 여기서도 쓰되, 페이지에 그
     스크립트 태그가 없어도 되도록 동적으로 로드한다. 소켓이 끊기거나 페이지가 로드될 때 놓친 알림까지
     보완하기 위해 20초 폴링도 폐지하지 않고 그대로 유지한다(소켓=즉시, 폴링=안전망). */
  function initNotifications() {
    if (!global.Eatty || !global.Eatty.notify || !isLoggedIn()) return;

    function loadNotifications() {
      request("/api/notifications?filter=all").then(function (list) {
        global.Eatty.notify.setItems(list);
      }).catch(function () {});
    }

    global.Eatty.notify.setHooks({
      markRead: function (id) {
        request("/api/notifications/" + id + "/read", { method: "PATCH" }).catch(function () {});
      },
      markAllRead: function () {
        request("/api/notifications/read-all", { method: "PATCH" }).catch(function () {});
      },
      delete: function (id) {
        request("/api/notifications/" + id, { method: "DELETE" }).catch(function () {});
      }
    });

    loadNotifications();
    setInterval(loadNotifications, 20000);
    connectNotificationSocket();
  }

  var STOMP_CDN_URL = "https://cdn.jsdelivr.net/npm/@stomp/stompjs@7/bundles/stomp.umd.min.js";
  var stompScriptLoading = null;

  function loadStompScript() {
    if (global.StompJs) return Promise.resolve();
    if (stompScriptLoading) return stompScriptLoading;
    stompScriptLoading = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = STOMP_CDN_URL;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("stompjs load failed")); };
      document.head.appendChild(script);
    });
    return stompScriptLoading;
  }

  function connectNotificationSocket() {
    loadStompScript().then(function () {
      var protocol = location.protocol === "https:" ? "wss:" : "ws:";
      var client = new global.StompJs.Client({
        brokerURL: protocol + "//" + location.host + "/ws-chat",
        connectHeaders: { Authorization: "Bearer " + getAccessToken() },
        reconnectDelay: 5000,
      });
      client.onConnect = function () {
        client.subscribe("/user/queue/notifications", function (message) {
          try {
            var item = JSON.parse(message.body);
            global.Eatty.notify.add(item);
          } catch (e) { /* 무시 */ }
        });
      };
      client.activate();
    }).catch(function () { /* CDN 로드 실패해도 폴링이 안전망으로 남아있다 */ });
  }

  document.addEventListener("DOMContentLoaded", initNotifications);

  /* ===== iOS 앱(EattyWayIOS, Capacitor WKWebView) 전용 브릿지 (2026-08-21 추가) ==================
     iOS 앱에서는 소셜 로그인을 앱 안에서 열지 않고 **앱 밖(기본 브라우저)으로 내보내서** 로그인시키고,
     끝나면 커스텀 스킴으로 앱이 자동으로 다시 열리게 한다(요기요 앱과 같은 방식). 브라우저로 나가기
     때문에 거기서 "카카오톡으로 로그인"/"네이버 앱으로 로그인" 앱 전환도 그대로 동작하고, 구글이
     embedded WebView OAuth를 막는 정책(disallowed_useragent)도 해당되지 않는다.

     전체 흐름:
       1) 앱 WebView의 로그인 화면에서 소셜 버튼 클릭 → login.js가 startSocialLogin()으로 네이티브 호출
       2) 네이티브가 UIApplication.open()으로 인가 주소를 앱 밖 브라우저에 넘긴다
          (/api/oauth-providers/{provider}/authorization?rememberMe=…&app=true)
          → 서버가 곧바로 카카오/네이버/구글 공식 로그인 화면으로 302하므로 브라우저에는 우리 사이트가
            아니라 공식 화면이 뜬다
       3) app=true는 OAuth state에 실려 콜백까지 전달된다(서버 OAuthStateService). 콜백은 그걸 보고
          웹 페이지가 아니라 eattyway://oauth-callback?accessToken=…&refreshToken=…&memberId=… 로 302한다
       4) 그 스킴을 iOS가 받아 앱을 다시 열고(Info.plist의 CFBundleURLTypes), SceneDelegate → 
          MainViewController가 URL을 받는다
       5) 네이티브가 앱 WebView에서 completeAppOAuth(payload)를 호출 → 여기서 세션을 저장하고 랜딩

     인증이 쿠키가 아니라 JWT + 스토리지라서, 브라우저에서 로그인해도 토큰만 앱으로 넘겨주면 그대로
     로그인 상태가 된다(브라우저↔WebView 쿠키 공유가 필요 없음). 일반 브라우저에서는 window.webkit이
     없어서 아래 isInIosApp()이 false가 되고 기존 리다이렉트 방식이 그대로 쓰인다. */
  var APP_BRIDGE_NAME = "eattywayAuth";

  function appAuthBridge() {
    try {
      if (!global.webkit || !global.webkit.messageHandlers) return null;
      return global.webkit.messageHandlers[APP_BRIDGE_NAME] || null;
    } catch (e) {
      return null;
    }
  }

  function isInIosApp() { return !!appAuthBridge(); }

  // 네이티브에 소셜 로그인 시작을 요청한다. 브릿지가 없으면(=일반 브라우저) false를 돌려주므로
  // 호출한 쪽이 기존 리다이렉트 방식으로 폴백하면 된다.
  function startAppSocialLogin(provider, rememberMe) {
    var bridge = appAuthBridge();
    if (!bridge) return false;
    try {
      bridge.postMessage({ action: "startSocialLogin", provider: String(provider), rememberMe: !!rememberMe });
      return true;
    } catch (e) {
      return false;
    }
  }

  function appOAuthToast(msg) {
    if (global.Eatty && typeof global.Eatty.toast === "function") global.Eatty.toast(msg, "error");
  }

  // 네이티브가 브라우저 시트에서 받아온 콜백 파라미터를 그대로 넘겨준다(evaluateJavaScript로 호출됨).
  function completeAppOAuth(payload) {
    if (!payload || typeof payload !== "object") return;
    if (payload.error) {
      appOAuthToast(payload.errorMessage || "소셜 로그인에 실패했습니다.");
      return;
    }
    if (!payload.accessToken || !payload.refreshToken || !payload.memberId) return;
    var remember = payload.rememberMe === true || payload.rememberMe === "true";
    setSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      memberId: payload.memberId,
    }, remember);
    global.location.replace(landingPageForRole());
  }

  // 사용자가 브라우저에서 로그인을 취소한 경우. 지금 방식(앱 밖 브라우저)에서는 취소를 앱이 알 수
  // 없어서 호출되지 않지만, 네이티브 구현이 바뀌어도 깨지지 않게 진입점은 남겨둔다.
  // 본인이 취소한 것이라 굳이 오류를 띄울 필요도 없다.
  function appOAuthCancelled() {}

  global.EattyWayApp = {
    isInIosApp: isInIosApp,
    startSocialLogin: startAppSocialLogin,
    completeAppOAuth: completeAppOAuth,
    appOAuthCancelled: appOAuthCancelled,
  };

  global.Api = {
    request: request,
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getRole: getRole,
    getMemberId: getMemberId,
    getAccessToken: getAccessToken,
    requireLogin: requireLogin,
    requireRole: requireRole,
    landingPageForRole: landingPageForRole,
    setSession: setSession,
    clearSession: clearSession,
    avatarPlaceholder: AVATAR_PLACEHOLDER,
    photoPlaceholder: PHOTO_PLACEHOLDER,
  };
})(window);
