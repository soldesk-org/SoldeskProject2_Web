/* 잇티웨이 공용 API/인증 모듈 (모든 페이지에서 sidebar.js/페이지 스크립트보다 먼저 로드) */
(function (global) {
  var API_BASE = "";
  var KEY_ACCESS = "ew_access_token";
  var KEY_REFRESH = "ew_refresh_token";
  var KEY_MEMBER_ID = "ew_member_id";

  function getAccessToken() { return localStorage.getItem(KEY_ACCESS); }
  function getRefreshToken() { return localStorage.getItem(KEY_REFRESH); }
  function getMemberId() { return localStorage.getItem(KEY_MEMBER_ID); }

  function setSession(data) {
    if (data.accessToken) localStorage.setItem(KEY_ACCESS, data.accessToken);
    if (data.refreshToken) localStorage.setItem(KEY_REFRESH, data.refreshToken);
    if (data.memberId !== undefined && data.memberId !== null) localStorage.setItem(KEY_MEMBER_ID, String(data.memberId));
  }

  function clearSession() {
    localStorage.removeItem(KEY_ACCESS);
    localStorage.removeItem(KEY_REFRESH);
    localStorage.removeItem(KEY_MEMBER_ID);
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

    refreshPromise = fetch(API_BASE + "/api/members/refresh", {
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

  function login(email, password, rememberMe) {
    return request("/api/members/login", { method: "POST", auth: false, body: { email: email, password: password, rememberMe: !!rememberMe } })
      .then(function (data) {
        setSession(data);
        return data;
      });
  }

  function logout() {
    var token = getAccessToken();
    var done = token
      ? request("/api/members/logout", { method: "POST", auth: false, body: { accessToken: token } }).catch(function () {})
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

    // 페이지마다 로그아웃 버튼 id가 다름(headerLogoutBtn/adminLogoutBtn/bizLogoutBtn/drawerLogoutBtn/logoutBtn 등)
    // — "LogoutBtn"으로 끝나거나 정확히 "logoutBtn"인 요소를 전부 잡아서 공통 처리.
    document.querySelectorAll("[id$='LogoutBtn'], #logoutBtn").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        logout().then(function () { window.location.href = "index"; });
      });
    });

    // 공용 헤더의 닉네임/이메일(#headerNickname, #headerEmail)은 거의 모든 페이지에 똑같이
    // 반복되는 요소라 각 페이지 JS마다 중복으로 GET /api/members/me를 부르지 않도록 여기서 한 번만 채운다.
    if (loggedIn) {
      var headerNickname = document.getElementById("headerNickname");
      var headerEmail = document.getElementById("headerEmail");
      if (headerNickname || headerEmail) {
        request("/api/members/me").then(function (data) {
          if (headerNickname && data.nickname) headerNickname.textContent = data.nickname;
          if (headerEmail && data.email) headerEmail.textContent = data.email;
        }).catch(function () {});
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initNavAuthUI);

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
