/* ==========================================================================
   잇티웨이 (Eatty way) — 공통 UI 스크립트 (프레젠테이션 전용)
   --------------------------------------------------------------------------
   이 파일에는 API 호출(fetch)이 전혀 없다. 순수하게 "보여주기" 동작만 담당한다.
   백엔드 연동 로직은 각 페이지 전용 JS(login.js, explore.js ...)에서 담당하고,
   이 파일이 제공하는 훅/유틸을 재사용하면 된다.

   제공 기능 (전부 data-* 속성 기반 자동 초기화)
     [1] 로그인 상태 전환      data-auth-view="guest|auth|business|admin"
     [2] 모바일 드로어         data-drawer-open / data-drawer-close
     [3] 드롭다운              data-dropdown-toggle="ID"
     [4] 탭                    data-tabs / data-tab-target / data-tab-panel
     [5] 모달                  data-modal-open="ID" / data-modal-close
     [6] 토스트                Eatty.toast(msg, type)
     [7] 비밀번호 보기 토글    data-password-toggle="INPUT_ID"
     [8] 별점 입력             data-rating-input (+ data-rating-value)
     [9] 파일 드롭존           data-dropzone / data-dropzone-input
    [10] 글자수 카운터         data-counter="TARGET_ID"
    [11] 인증 타이머           data-timer="180"
    [12] 전체동의 체크박스     data-agree-all / data-agree-item
    [13] textarea 자동 높이    data-autogrow
    [14] 아코디언              data-accordion-toggle
    [15] 개발용 상태 전환바    data-devbar (실배포 시 삭제)

   전역 API
     Eatty.toast(message, type)      type: default | success | error | brand
     Eatty.openModal(id) / closeModal(id)
     Eatty.setAuth(state)            state: guest | user | business | admin
     Eatty.getAuth()
     Eatty.formatNumber(n)
   ========================================================================== */
(function () {
  'use strict';

  var AUTH_KEY = 'eatty:demoAuthState';
  var AUTH_STATES = ['guest', 'user', 'business', 'admin'];

  var Eatty = window.Eatty || {};
  window.Eatty = Eatty;

  /* ------------------------------- 유틸 ---------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  Eatty.formatNumber = function (n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  /* ============================================================
     [1] 로그인 상태 전환
     ------------------------------------------------------------
     마크업 예)
       <div data-auth-view="guest">  ... 로그인/회원가입 버튼 ... </div>
       <div data-auth-view="auth">   ... 프로필/로그아웃 ...      </div>
       <a   data-auth-view="business" href="business-mypage">내 매장</a>
       <a   data-auth-view="admin"    href="admin">관리자</a>

     "auth" 는 user/business/admin 전부에서 노출된다.
     실제 서비스에서는 서버 렌더링 또는 세션 확인 후
       Eatty.setAuth('user') 처럼 한 번만 호출하면 된다.
     ============================================================ */
  function currentAuth() {
    var fromAttr = document.documentElement.getAttribute('data-auth-state');
    var stored = null;
    try { stored = localStorage.getItem(AUTH_KEY); } catch (e) { /* 무시 */ }
    var v = stored || fromAttr || 'guest';
    return AUTH_STATES.indexOf(v) > -1 ? v : 'guest';
  }

  function applyAuth(state) {
    document.documentElement.setAttribute('data-auth-state', state);

    $$('[data-auth-view]').forEach(function (el) {
      var want = (el.getAttribute('data-auth-view') || '').split(/[\s,|]+/).filter(Boolean);
      var show = want.some(function (w) {
        if (w === 'any') return true;
        if (w === 'auth') return state !== 'guest';
        return w === state;
      });
      /* hidden 속성만 토글한다 → 인라인 style 을 쓰지 않으므로
         Tailwind 의 flex / grid / sm:flex 같은 클래스가 그대로 살아 있다. */
      el.hidden = !show;
    });

    $$('[data-devbar] button[data-auth-set]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-auth-set') === state);
    });

    document.dispatchEvent(new CustomEvent('eatty:authchange', { detail: { state: state } }));
  }

  Eatty.setAuth = function (state) {
    if (AUTH_STATES.indexOf(state) === -1) state = 'guest';
    try { localStorage.setItem(AUTH_KEY, state); } catch (e) { /* 무시 */ }
    applyAuth(state);
  };
  Eatty.getAuth = currentAuth;

  /* ============================================================
     [2] 모바일 드로어
       <button data-drawer-open="mainDrawer">
       <aside id="mainDrawer" class="e-drawer">
       <div data-drawer-backdrop="mainDrawer" class="e-drawer-backdrop">
     ============================================================ */
  function openDrawer(id) {
    var d = document.getElementById(id);
    if (!d) return;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    var bd = $('[data-drawer-backdrop="' + id + '"]');
    if (bd) bd.classList.add('is-open');
    document.body.classList.add('is-modal-open');
    // 2026-08-09 수정 — 예전엔 드로어 안 첫 번째 포커스 가능 요소(대부분 로고 링크)에 무조건 포커스를
    // 줘서, 브라우저의 :focus-visible 표시 여부 판정이 기기마다 달라 로고 주변에 가끔 포커스 링(브랜드
    // 오렌지 테두리)이 보였다("가끔 생긴다"는 리포트와 일치). 닫기 버튼이 있으면 그쪽으로 포커스를
    // 옮겨서(다이얼로그 접근성 관례에도 더 맞음) 로고가 포커스를 받는 일 자체를 없앤다.
    var closeEl = d.querySelector('[data-drawer-close="' + id + '"]');
    var first = closeEl || d.querySelector('a, button, input');
    if (first) first.focus({ preventScroll: true });
  }
  function closeDrawer(id) {
    var d = document.getElementById(id);
    if (!d) return;
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    var bd = $('[data-drawer-backdrop="' + id + '"]');
    if (bd) bd.classList.remove('is-open');
    if (!$('.e-modal.is-open')) document.body.classList.remove('is-modal-open');
  }
  Eatty.openDrawer = openDrawer;
  Eatty.closeDrawer = closeDrawer;

  /* ============================================================
     [5] 모달
       <button data-modal-open="reportModal">
       <div id="reportModal" class="e-modal" role="dialog" aria-modal="true">
         <div class="e-modal-backdrop" data-modal-close></div>
     ============================================================ */
  var lastFocused = null;
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    lastFocused = document.activeElement;
    // 모든 .e-modal이 같은 z-index(100)를 공유해서, 모달이 열려있는 상태에서 다른 모달을 추가로
    // 열면(예: 관리자 회원상세 → 정지) 원래 DOM 순서상 앞에 있던 쪽이 뒤에 깔려 숨어버렸다.
    // 열 때마다 body의 마지막 자식으로 옮겨서 항상 가장 위에 그려지도록 한다(fixed 포지션이라
    // 부모 위치는 레이아웃에 영향 없음).
    if (m.parentElement !== document.body || document.body.lastElementChild !== m) {
      document.body.appendChild(m);
    }
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-modal-open');
    var focusTarget = m.querySelector('[data-modal-autofocus]') ||
      m.querySelector('input:not([type=hidden]), textarea, select, button:not(.e-modal-close)');
    if (focusTarget) setTimeout(function () { focusTarget.focus({ preventScroll: true }); }, 60);
  }
  function closeModal(id) {
    var m = id ? document.getElementById(id) : $('.e-modal.is-open');
    if (!m) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    if (!$('.e-modal.is-open') && !$('.e-drawer.is-open')) {
      document.body.classList.remove('is-modal-open');
    }
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }
  Eatty.openModal = openModal;
  Eatty.closeModal = closeModal;

  /* ============================================================
     [6] 토스트
     ============================================================ */
  var ICONS = {
    success: '<path d="M20 6 9 17l-5-5"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    'default': '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    brand: '<path d="M12 2 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-5Z"/>'
  };
  Eatty.toast = function (message, type) {
    type = type || 'default';
    var area = $('.e-toast-area');
    if (!area) {
      area = document.createElement('div');
      area.className = 'e-toast-area';
      area.setAttribute('role', 'status');
      area.setAttribute('aria-live', 'polite');
      document.body.appendChild(area);
    }
    var el = document.createElement('div');
    el.className = 'e-toast e-toast--' + type;
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + (ICONS[type] || ICONS['default']) + '</svg>' +
      '<span></span>';
    el.querySelector('span').textContent = message;
    area.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }, 2600);
  };

  /* ============================================================
     [4] 탭
       <div data-tabs>
         <button data-tab-target="panelA" aria-selected="true">
         <div id="panelA" data-tab-panel>
     ============================================================ */
  function activateTab(btn) {
    var group = btn.closest('[data-tabs]');
    if (!group) return;
    var scope = group.getAttribute('data-tabs-scope');
    var panelRoot = scope ? document.querySelector(scope) : document;

    $$('[data-tab-target]', group).forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.classList.toggle('is-active', on);
    });

    var targets = $$('[data-tab-target]', group).map(function (b) {
      return b.getAttribute('data-tab-target');
    });
    targets.forEach(function (id) {
      var p = panelRoot.querySelector('#' + id);
      if (p) p.hidden = (id !== btn.getAttribute('data-tab-target'));
    });

    document.dispatchEvent(new CustomEvent('eatty:tabchange', {
      detail: { target: btn.getAttribute('data-tab-target'), button: btn }
    }));
  }

  /* 해시로 탭 직접 진입 — 예: mypage#tabVisits
     다른 페이지에서 특정 탭으로 보낼 때 사용합니다. */
  function activateTabFromHash() {
    var id = (location.hash || '').replace('#', '');
    if (!id) return;
    var btn = document.querySelector('[data-tab-target="' + id + '"]');
    if (btn) activateTab(btn);
  }
  Eatty.activateTabFromHash = activateTabFromHash;
  window.addEventListener('hashchange', activateTabFromHash);

  /* ============================================================
     [8] 별점 입력
       <div class="e-rating-input" data-rating-input data-rating-target="reviewScore">
         <button type="button" data-rating-value="1"> ... 5개
       <input type="hidden" id="reviewScore" value="0">
     ============================================================ */
  function paintRating(wrap, value) {
    $$('[data-rating-value]', wrap).forEach(function (b) {
      b.classList.toggle('is-on', Number(b.getAttribute('data-rating-value')) <= value);
      b.setAttribute('aria-checked', Number(b.getAttribute('data-rating-value')) === value ? 'true' : 'false');
    });
    var targetId = wrap.getAttribute('data-rating-target');
    if (targetId) {
      var input = document.getElementById(targetId);
      if (input) input.value = value;
    }
    var out = wrap.getAttribute('data-rating-output');
    if (out) {
      var o = document.getElementById(out);
      if (o) o.textContent = value > 0 ? value + '.0' : '-';
    }
  }

  /* ============================================================
     [9] 파일 드롭존 (미리보기만, 업로드 X)
       <div class="e-dropzone" data-dropzone data-dropzone-preview="previewBox">
         <input type="file" id="receiptFile">
     ============================================================ */
  function handleFiles(zone, files) {
    if (!files || !files.length) return;
    var previewId = zone.getAttribute('data-dropzone-preview');
    var nameId = zone.getAttribute('data-dropzone-filename');
    var f = files[0];

    if (nameId) {
      var nameEl = document.getElementById(nameId);
      if (nameEl) nameEl.textContent = f.name + ' (' + Math.round(f.size / 1024) + 'KB)';
    }
    if (previewId) {
      var box = document.getElementById(previewId);
      if (box) {
        box.hidden = false;
        var img = box.querySelector('[data-dropzone-img]');
        if (img && /^image\//.test(f.type)) {
          var reader = new FileReader();
          reader.onload = function (ev) { img.src = ev.target.result; img.style.display = 'block'; };
          reader.readAsDataURL(f);
        }
      }
    }
    zone.dispatchEvent(new CustomEvent('eatty:filepicked', { detail: { file: f }, bubbles: true }));
  }

  /* ============================================================
     [11] 인증 타이머
       <span class="e-timer" data-timer="180" data-timer-target="#codeInput"></span>
       재시작: el.dispatchEvent(new Event('eatty:timer-restart'))
       data-timer-target(2026-08-14 추가) — 만료되면 그 대상(입력창/버튼)을 비활성화해서
       "이제 재발송해야만 다시 시도할 수 있다"를 명확히 보여준다. 대상이 input이면 값을 지우고
       placeholder를 안내 문구로 바꾸고, 그 외(버튼/링크)는 aria-disabled로 클릭을 막는다
       (.btn.is-disabled/[aria-disabled="true"] 스타일 재사용). 재시작(재발송) 시 원상복구.
     ============================================================ */
  function initTimer(el) {
    var total = parseInt(el.getAttribute('data-timer'), 10) || 180;
    var left = total, iv = null;
    var targetSel = el.getAttribute('data-timer-target');
    var target = targetSel ? document.querySelector(targetSel) : null;

    function setTargetDisabled(disabled) {
      if (!target) return;
      if ('disabled' in target) target.disabled = disabled;
      target.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (target.tagName === 'INPUT') {
        if (disabled) {
          if (target.dataset.origPlaceholder === undefined) {
            target.dataset.origPlaceholder = target.getAttribute('placeholder') || '';
          }
          target.value = '';
          target.placeholder = '인증번호가 만료되었습니다. 재발송해주세요.';
        } else if (target.dataset.origPlaceholder !== undefined) {
          target.placeholder = target.dataset.origPlaceholder;
        }
      }
      if (target.tagName === 'A') {
        if (disabled) {
          if (target.dataset.origHref === undefined) target.dataset.origHref = target.getAttribute('href') || '';
          target.removeAttribute('href');
        } else if (target.dataset.origHref !== undefined) {
          target.setAttribute('href', target.dataset.origHref);
        }
      }
    }

    function render() {
      var m = Math.floor(left / 60), s = left % 60;
      el.textContent = m + ':' + (s < 10 ? '0' + s : s);
      if (left <= 0) {
        clearInterval(iv);
        el.textContent = '시간 만료';
        setTargetDisabled(true);
        el.dispatchEvent(new CustomEvent('eatty:timer-end', { bubbles: true }));
      }
    }
    function start() {
      clearInterval(iv);
      left = total;
      setTargetDisabled(false);
      render();
      iv = setInterval(function () { left--; render(); }, 1000);
    }
    el.addEventListener('eatty:timer-restart', start);
    start();
  }

  /* ============================================================
     [15] 개발용 상태 전환바
       <div data-devbar></div>  → 자동으로 버튼 렌더
     ============================================================ */
  var DEV_LABELS = { guest: '비로그인', user: '일반회원', business: '사업자', admin: '관리자' };
  function renderDevbar(host) {
    host.className = 'e-devbar';
    var html = '<span class="e-devbar-label">시안 상태</span>';
    AUTH_STATES.forEach(function (s) {
      html += '<button type="button" data-auth-set="' + s + '">' + DEV_LABELS[s] + '</button>';
    });
    html += '<button type="button" class="e-devbar-close" data-devbar-close aria-label="상태 전환바 닫기">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
      '<path d="M18 6 6 18M6 6l12 12"/></svg></button>';
    host.innerHTML = html;
  }

  /* ============================================================
     전역 이벤트 위임 — 한 곳에서 모든 클릭을 처리
     ============================================================ */
  document.addEventListener('click', function (e) {
    var t = e.target;

    /* 드로어 */
    var dOpen = t.closest('[data-drawer-open]');
    if (dOpen) { openDrawer(dOpen.getAttribute('data-drawer-open')); return; }
    var dClose = t.closest('[data-drawer-close]');
    if (dClose) { closeDrawer(dClose.getAttribute('data-drawer-close')); return; }
    var dBack = t.closest('[data-drawer-backdrop]');
    if (dBack) { closeDrawer(dBack.getAttribute('data-drawer-backdrop')); return; }

    /* 모달 */
    var mOpen = t.closest('[data-modal-open]');
    if (mOpen) { e.preventDefault(); openModal(mOpen.getAttribute('data-modal-open')); return; }
    var mClose = t.closest('[data-modal-close]');
    if (mClose) {
      var wrap = mClose.closest('.e-modal');
      closeModal(wrap ? wrap.id : null);
      return;
    }

    /* 드롭다운 */
    var ddT = t.closest('[data-dropdown-toggle]');
    if (ddT) {
      var menu = document.getElementById(ddT.getAttribute('data-dropdown-toggle'));
      var willOpen = menu && !menu.classList.contains('is-open');
      $$('.e-dropdown-menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
      if (menu && willOpen) menu.classList.add('is-open');
      if (ddT.hasAttribute('aria-expanded')) ddT.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      return;
    }
    if (!t.closest('.e-dropdown-menu')) {
      $$('.e-dropdown-menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
      $$('[data-dropdown-toggle][aria-expanded="true"]').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
      });
    }

    /* 탭 */
    var tab = t.closest('[data-tab-target]');
    if (tab) { activateTab(tab); return; }

    /* 토글 버튼(칩/태그) — aria-pressed 스위치 */
    var press = t.closest('[data-toggle-press]');
    if (press) {
      var on = press.getAttribute('aria-pressed') === 'true';
      var groupName = press.getAttribute('data-toggle-group');
      if (groupName && !on) {
        $$('[data-toggle-group="' + groupName + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', 'false');
        });
      }
      press.setAttribute('aria-pressed', on ? 'false' : 'true');
      return;
    }

    /* 비밀번호 보기 */
    var eye = t.closest('[data-password-toggle]');
    if (eye) {
      var inp = document.getElementById(eye.getAttribute('data-password-toggle'));
      if (inp) {
        var toText = inp.type === 'password';
        inp.type = toText ? 'text' : 'password';
        eye.classList.toggle('is-on', toText);
        eye.setAttribute('aria-label', toText ? '비밀번호 숨기기' : '비밀번호 표시');
      }
      return;
    }

    /* 별점 */
    var star = t.closest('[data-rating-value]');
    if (star) {
      var rWrap = star.closest('[data-rating-input]');
      if (rWrap) paintRating(rWrap, Number(star.getAttribute('data-rating-value')));
      return;
    }

    /* 아코디언 */
    var acc = t.closest('[data-accordion-toggle]');
    if (acc) {
      var body = document.getElementById(acc.getAttribute('data-accordion-toggle'));
      if (body) {
        var expanded = acc.getAttribute('aria-expanded') === 'true';
        acc.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        body.hidden = expanded;
      }
      return;
    }

    /* 개발용 상태 전환 */
    var setBtn = t.closest('[data-auth-set]');
    if (setBtn) { Eatty.setAuth(setBtn.getAttribute('data-auth-set')); return; }
    var devClose = t.closest('[data-devbar-close]');
    if (devClose) {
      var bar = devClose.closest('.e-devbar');
      if (bar) bar.remove();
      return;
    }

    /* 데모용 안내 (실제 동작은 팀 JS에서 연결) */
    var demo = t.closest('[data-demo-toast]');
    if (demo) {
      e.preventDefault();
      Eatty.toast(demo.getAttribute('data-demo-toast'), demo.getAttribute('data-demo-type') || 'default');
    }
  });

  /* ESC 로 모달/드로어/드롭다운 닫기 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openModalEl = $('.e-modal.is-open');
    if (openModalEl) { closeModal(openModalEl.id); return; }
    var openDrawerEl = $('.e-drawer.is-open');
    if (openDrawerEl) { closeDrawer(openDrawerEl.id); return; }
    $$('.e-dropdown-menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
  });

  /* 모달 안에서 포커스 순환 유지 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var m = $('.e-modal.is-open');
    if (!m) return;
    var f = $$('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', m)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ============================================================
     [16] 알림 (헤더 벨 → 드롭다운 패널)
     ------------------------------------------------------------
     페이지에는 벨 버튼만 있으면 됩니다.
       <button id="headerNotiBtn" class="e-icon-btn">…</button>
       또는 [data-noti-btn] 속성
     패널 마크업은 이 모듈이 런타임에 생성합니다.

     ★ 서버 연동 지점
       목록      GET    /api/notifications?filter=all|unread
       읽음      PATCH  /api/notifications/{id}/read
       전체읽음  PATCH  /api/notifications/read-all
       삭제      DELETE /api/notifications/{id}
       미읽음수  GET    /api/notifications/unread-count   (폴링 또는 SSE)

       연동 시 아래 한 줄로 목록을 교체하면 됩니다.
         Eatty.notify.setItems(serverList);

     ★ 광고성 알림 정책
       type 이 'event' | 'ad' 인 항목은 마케팅 수신에 동의한 회원에게만
       서버가 내려보냅니다. 프런트는 동의 여부를 참고해 안내 문구만 노출합니다.
         Eatty.notify.setMarketingOptIn(true|false)
     ============================================================ */
  var NOTI_ICON = {
    review: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"/>',
    recommend: '<path d="m12 3-1.9 5.8L4 10.7l6.1 1.9L12 18.5l1.9-5.9 6.1-1.9-6.1-1.9L12 3Z"/>',
    notice: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
    event: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S9 2 6.5 4 12 7 12 7ZM12 7s3-5 5.5-3S12 7 12 7Z"/>',
    ad: '<path d="M4 21V4h11l-1 3h6l-1 4 1 4h-8l1-3H4"/>',
    business: '<path d="M3 9 5 4h14l2 5M3 9h18v11H3V9Z"/><path d="M9 20v-6h6v6"/>',
    admin: '<path d="M12 2 4 5v6c0 5.3 3.4 9.4 8 11 4.6-1.6 8-5.7 8-11V5l-8-3Z"/>'
  };
  var NOTI_LABEL = {
    review: '리뷰', chat: '잇티챗', recommend: 'AI 추천', notice: '공지',
    event: '이벤트', ad: '광고', business: '내 매장', admin: '운영 알림'
  };

  /* 실제 연동은 assets/js/api.js의 initNavAuthUI()가 로드 시 setItems()로 채우고
     setHooks()로 읽음/삭제 API 콜백을 등록한다(이 파일은 fetch를 하지 않는다는 원칙 유지). */
  var notiState = {
    items: [],
    filter: 'all',
    marketingOptIn: true,
    panel: null,
    backdrop: null,
    btn: null,
    hooks: {}
  };

  function notiTimeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + '일 전';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  function notiUnread() {
    return notiState.items.filter(function (n) { return !n.read; }).length;
  }

  function notiSvg(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }

  function notiRenderBadge() {
    if (!notiState.btn) return;
    var badge = notiState.btn.querySelector('.e-noti-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'e-noti-count';
      notiState.btn.appendChild(badge);
    }
    var n = notiUnread();
    badge.hidden = n === 0;
    badge.textContent = n > 99 ? '99+' : String(n);
    notiState.btn.setAttribute('aria-label', n > 0 ? '알림 ' + n + '건' : '알림');
  }

  function notiRenderList() {
    if (!notiState.panel) return;
    var listEl = notiState.panel.querySelector('.e-noti-list');
    var items = notiState.filter === 'unread'
      ? notiState.items.filter(function (n) { return !n.read; })
      : notiState.items;

    if (!items.length) {
      listEl.innerHTML =
        '<div class="e-noti-empty">' +
        '<div class="e-noti-empty-ico">' +
        notiSvg('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>') +
        '</div>' +
        '<p class="text-[14px] font-bold text-[var(--ink-800)]">' +
        (notiState.filter === 'unread' ? '읽지 않은 알림이 없어요' : '알림이 없어요') + '</p>' +
        '<p class="text-[12.5px] text-[var(--ink-500)] mt-1.5">새 소식이 오면 여기에 표시됩니다.</p>' +
        '</div>';
      return;
    }

    listEl.innerHTML = items.map(function (n) {
      var type = NOTI_ICON[n.type] ? n.type : 'notice';
      return '' +
        '<div class="e-noti-item' + (n.read ? '' : ' is-unread') + '" data-noti-id="' + n.id + '" role="button" tabindex="0">' +
          '<span class="e-noti-ico e-noti-ico--' + type + '" aria-hidden="true">' + notiSvg(NOTI_ICON[type]) + '</span>' +
          '<span class="e-noti-body">' +
            '<span class="e-noti-item-title">' +
              (n.read ? '' : '<span class="e-noti-unread-dot" aria-hidden="true"></span>') +
              '<span class="js-noti-title"></span>' +
            '</span>' +
            '<span class="e-noti-item-text js-noti-text"></span>' +
            '<span class="e-noti-item-meta">' +
              '<span class="e-badge e-badge--gray !text-[10.5px] !px-2 !py-0.5">' + (NOTI_LABEL[type] || '알림') + '</span>' +
              '<span>' + notiTimeAgo(n.at) + '</span>' +
            '</span>' +
          '</span>' +
          '<button type="button" class="e-noti-del" data-noti-del="' + n.id + '" aria-label="알림 삭제">' +
            notiSvg('<path d="M18 6 6 18M6 6l12 12"/>') +
          '</button>' +
        '</div>';
    }).join('');

    /* 제목/본문은 textContent 로 안전하게 주입 */
    $$('.e-noti-item', listEl).forEach(function (el) {
      var n = notiState.items.filter(function (x) { return String(x.id) === el.getAttribute('data-noti-id'); })[0];
      if (!n) return;
      el.querySelector('.js-noti-title').textContent = n.title;
      el.querySelector('.js-noti-text').textContent = n.body || '';
    });

    /* 마케팅 미동의 안내 */
    if (!notiState.marketingOptIn) {
      var tip = document.createElement('div');
      tip.className = 'e-noti-optin';
      tip.innerHTML = '<b>이벤트 · 광고 알림이 꺼져 있어요.</b><br>' +
        '혜택 소식을 받으려면 마케팅 수신 동의를 켜주세요.';
      listEl.appendChild(tip);
    }
  }

  function notiRenderTabs() {
    if (!notiState.panel) return;
    $$('.e-noti-tab', notiState.panel).forEach(function (t) {
      t.setAttribute('aria-selected', t.getAttribute('data-noti-filter') === notiState.filter ? 'true' : 'false');
    });
    var cnt = notiState.panel.querySelector('.js-unread-count');
    if (cnt) cnt.textContent = notiUnread();
  }

  function notiBuildPanel() {
    var panel = document.createElement('div');
    panel.className = 'e-noti-panel';
    panel.id = 'notiPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '알림 목록');
    panel.innerHTML = '' +
      '<div class="e-noti-head">' +
        '<p class="e-noti-title">알림</p>' +
        '<button type="button" class="e-modal-close !w-8 !h-8 ml-auto" data-noti-close aria-label="알림 닫기">' +
          notiSvg('<path d="M18 6 6 18M6 6l12 12"/>') +
        '</button>' +
      '</div>' +
      '<div class="e-noti-tabs" role="tablist">' +
        '<button type="button" class="e-noti-tab" data-noti-filter="all" role="tab" aria-selected="true">전체</button>' +
        '<button type="button" class="e-noti-tab" data-noti-filter="unread" role="tab" aria-selected="false">' +
          '안 읽음 <span class="js-unread-count">0</span></button>' +
        '<button type="button" class="e-msg-foot-btn ml-auto" data-noti-read-all>' +
          notiSvg('<path d="M20 6 9 17l-5-5"/>') + '모두 읽음' +
        '</button>' +
      '</div>' +
      '<div class="e-noti-list e-scroll"></div>' +
      '<div class="e-noti-foot">' +
        '<a href="mypage-edit" class="text-[12.5px] font-bold text-[var(--ink-600)] hover:text-[var(--brand-600)]">알림 설정</a>' +
        '<a href="support" class="text-[12.5px] font-bold text-[var(--ink-600)] hover:text-[var(--brand-600)] ml-auto">고객센터</a>' +
      '</div>';

    var backdrop = document.createElement('div');
    backdrop.className = 'e-noti-backdrop';
    backdrop.setAttribute('data-noti-close', '');

    notiState.panel = panel;
    notiState.backdrop = backdrop;
    document.body.appendChild(backdrop);
    // body에 바로 붙인다(2026-08-07 수정) — 예전엔 벨 버튼을 감싼 .e-dropdown 안에 넣고 거기 기준
    // position:absolute로 앵커링했는데, .e-header가 backdrop-filter를 쓰고 있어서(블러 효과)
    // 그 자식인 이 패널의 position:fixed 기준(containing block)이 진짜 뷰포트가 아니라 header
    // 박스로 바뀌어 버렸다 — 모바일에서 패널이 화면 위쪽 훨씬 밖으로(-303px 등) 밀려나고, 그 뒤에
    // 깔린 어두운 backdrop만 화면 전체를 덮어서 "까맣게 가려지고 아무것도 안 되는" 것처럼 보였다
    // (실측 확인). body 바로 아래 두면 이 문제가 사라지고, 데스크탑 위치는 positionNotiPanel()이
    // 버튼 좌표를 기준으로 JS에서 직접 계산한다.
    document.body.appendChild(panel);
  }

  // 데스크탑(>640px)에서만 벨 버튼 아래에 오도록 좌표를 계산한다 — 모바일은 CSS 미디어쿼리가
  // position:fixed; inset:auto 0 0 0(하단 시트)으로 처리하므로 인라인 값을 비워 그대로 둔다.
  function notiPositionPanel() {
    var panel = notiState.panel;
    if (window.innerWidth <= 640) {
      panel.style.top = '';
      panel.style.right = '';
      return;
    }
    var r = notiState.btn.getBoundingClientRect();
    panel.style.top = (r.bottom + 10) + 'px';
    panel.style.right = (window.innerWidth - r.right) + 'px';
  }

  function notiOpen() {
    if (!notiState.panel) return;
    /* 다른 드롭다운은 닫기 */
    $$('.e-dropdown-menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
    notiPositionPanel();
    notiState.panel.classList.add('is-open');
    notiState.backdrop.classList.add('is-open');
    notiState.btn.setAttribute('aria-expanded', 'true');
    notiRenderTabs();
    notiRenderList();
  }

  function notiClose() {
    if (!notiState.panel) return;
    notiState.panel.classList.remove('is-open');
    notiState.backdrop.classList.remove('is-open');
    notiState.btn.setAttribute('aria-expanded', 'false');
  }

  function notiInit() {
    var btn = $('#headerNotiBtn') || $('[data-noti-btn]');
    if (!btn) return;
    notiState.btn = btn;
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');

    /* 기존 하드코딩된 점 표시 제거 (카운트 배지로 대체) */
    var oldDot = btn.querySelector('.e-dot');
    if (oldDot) oldDot.remove();

    notiBuildPanel();
    notiRenderBadge();

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (notiState.panel.classList.contains('is-open')) notiClose();
      else notiOpen();
    });

    /* 패널 내부 클릭 처리 */
    notiState.panel.addEventListener('click', function (e) {
      e.stopPropagation();

      if (e.target.closest('[data-noti-close]')) { notiClose(); return; }

      var tab = e.target.closest('[data-noti-filter]');
      if (tab) {
        notiState.filter = tab.getAttribute('data-noti-filter');
        notiRenderTabs();
        notiRenderList();
        return;
      }

      if (e.target.closest('[data-noti-read-all]')) {
        if (notiState.hooks.markAllRead) notiState.hooks.markAllRead();
        notiState.items.forEach(function (n) { n.read = true; });
        notiRenderBadge(); notiRenderTabs(); notiRenderList();
        Eatty.toast('모든 알림을 읽음으로 표시했습니다.');
        return;
      }

      var del = e.target.closest('[data-noti-del]');
      if (del) {
        var delId = del.getAttribute('data-noti-del');
        if (notiState.hooks.delete) notiState.hooks.delete(delId);
        notiState.items = notiState.items.filter(function (n) { return String(n.id) !== delId; });
        notiRenderBadge(); notiRenderTabs(); notiRenderList();
        return;
      }

      var item = e.target.closest('[data-noti-id]');
      if (item) {
        var id = item.getAttribute('data-noti-id');
        var target = notiState.items.filter(function (n) { return String(n.id) === id; })[0];
        if (!target) return;
        if (!target.read && notiState.hooks.markRead) notiState.hooks.markRead(id);
        target.read = true;
        notiRenderBadge();
        if (target.link) location.href = target.link;
        else { notiRenderTabs(); notiRenderList(); }
      }
    });

    /* 바깥 클릭 / ESC 로 닫기 */
    document.addEventListener('click', function () { notiClose(); });
    notiState.backdrop.addEventListener('click', notiClose);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') notiClose();
    });
  }

  /* 전역 API */
  Eatty.notify = {
    setItems: function (list) {
      notiState.items = (list || []).map(function (n) {
        return {
          id: n.id, type: n.type, title: n.title, body: n.body || n.content || '',
          link: n.link || n.url || '', read: !!n.read,
          at: typeof n.at === 'number' ? n.at : new Date(n.at || Date.now()).getTime(),
          marketing: !!n.marketing
        };
      });
      notiRenderBadge(); notiRenderTabs(); notiRenderList();
    },
    add: function (item) {
      notiState.items.unshift({
        id: item.id || ('n_' + Date.now()),
        type: item.type || 'notice',
        title: item.title || '',
        body: item.body || '',
        link: item.link || '',
        read: false,
        at: Date.now(),
        marketing: !!item.marketing
      });
      notiRenderBadge(); notiRenderTabs(); notiRenderList();
    },
    markAllRead: function () {
      notiState.items.forEach(function (n) { n.read = true; });
      notiRenderBadge(); notiRenderTabs(); notiRenderList();
    },
    unreadCount: notiUnread,
    setHooks: function (hooks) {
      notiState.hooks = hooks || {};
    },
    setMarketingOptIn: function (on) {
      notiState.marketingOptIn = !!on;
      if (!on) {
        notiState.items = notiState.items.filter(function (n) {
          return !(n.type === 'ad' || n.type === 'event');
        });
      }
      notiRenderBadge(); notiRenderTabs(); notiRenderList();
    },
    open: notiOpen,
    close: notiClose
  };

  /* ============================================================
     DOM 준비 후 자동 초기화
     ============================================================ */
  function init() {
    /* 알림 */
    notiInit();

    /* 개발용 상태바 */
    $$('[data-devbar]').forEach(renderDevbar);

    /* 로그인 상태 반영 */
    applyAuth(currentAuth());

    /* 별점 초기값 */
    $$('[data-rating-input]').forEach(function (w) {
      var init0 = Number(w.getAttribute('data-rating-default') || 0);
      if (init0) paintRating(w, init0);
    });

    /* 드롭존 */
    $$('[data-dropzone]').forEach(function (zone) {
      var input = zone.querySelector('input[type="file"]');
      ['dragenter', 'dragover'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) {
          e.preventDefault(); zone.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) {
          e.preventDefault(); zone.classList.remove('is-dragover');
        });
      });
      zone.addEventListener('drop', function (e) {
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length && input) {
          try { input.files = files; } catch (err) { /* 일부 브라우저 제한 */ }
        }
        handleFiles(zone, files);
      });
      if (input) {
        input.addEventListener('change', function () { handleFiles(zone, input.files); });
      }
    });

    /* 글자수 카운터 */
    $$('[data-counter]').forEach(function (counter) {
      var target = document.getElementById(counter.getAttribute('data-counter'));
      if (!target) return;
      var max = target.getAttribute('maxlength');
      function upd() {
        counter.textContent = target.value.length + (max ? ' / ' + max : '');
      }
      target.addEventListener('input', upd);
      upd();
    });

    /* 타이머 */
    $$('[data-timer]').forEach(initTimer);

    /* 전체동의 */
    $$('[data-agree-all]').forEach(function (all) {
      var groupName = all.getAttribute('data-agree-all');
      var items = $$('[data-agree-item="' + groupName + '"]');
      all.addEventListener('change', function () {
        items.forEach(function (i) { i.checked = all.checked; });
        items.forEach(function (i) { i.dispatchEvent(new Event('change', { bubbles: true })); });
      });
      items.forEach(function (i) {
        i.addEventListener('change', function () {
          all.checked = items.every(function (x) { return x.checked; });
        });
      });
    });

    /* textarea 자동 높이 */
    $$('[data-autogrow]').forEach(function (ta) {
      function grow() {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
      }
      ta.addEventListener('input', grow);
      grow();
    });

    /* 채팅 스크롤 하단 고정 */
    $$('[data-chat-scroll]').forEach(function (box) {
      box.scrollTop = box.scrollHeight;
    });

    /* 현재 페이지 네비게이션 활성화 */
    var page = location.pathname.split('/').pop() || 'index';
    $$('[data-nav-page]').forEach(function (link) {
      var pages = (link.getAttribute('data-nav-page') || '').split(/[\s,]+/);
      if (pages.indexOf(page) > -1) link.setAttribute('aria-current', 'page');
    });
    /* 해시로 지정된 탭 열기 */
    activateTabFromHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
