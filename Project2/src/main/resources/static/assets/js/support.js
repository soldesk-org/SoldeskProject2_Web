/* ============================================================================
   support — AI 챗봇 상담 스크립트
   ----------------------------------------------------------------------------
   ★ NO-PERSIST 원칙
     대화는 state.messages(메모리) 에만 존재합니다.
     localStorage / sessionStorage / cookie 를 절대 사용하지 않습니다.
     새로고침하면 자동으로 사라지고, endSession() 이 배열과 DOM 을 모두 비웁니다.

   ★ 실제 API (SupportChatController — 구현 완료)
     POST /api/support-chat/ask   { message, sessionId } -> { success, answer }
     POST /api/support-chat/end   { sessionId, reason }

   2026-08-06 - 풀스크린 재설계와 함께, "상담 시작 전" 게이트 화면(동의 체크박스 + 시작 버튼)을 없애고
   페이지가 뜨자마자 startSession()을 자동 호출하도록 바꿨다. 개인정보 처리 안내는 세션 시작 시
   렌더되는 시스템 메시지(대화 맨 위)로 그대로 유지 — 체크박스로 막지는 않지만 대화 상단에서 항상 보인다.
   ============================================================================ */
(function () {
  'use strict';

  var state = {
    sessionId: null,
    messages: [],        /* { role, text, at } — 메모리 전용 */
    startedAt: null,
    busy: false,
    ended: false
  };

  var IDLE_LIMIT_MS = 8 * 60 * 1000;   /* 8분 무응답 → 경고 */
  var IDLE_GRACE_SEC = 60;             /* 경고 후 60초 → 자동 종료 */

  var els = {
    active: document.getElementById('chatActive'),
    ended: document.getElementById('chatEnded'),
    sessionBar: document.getElementById('sessionBar'),
    msgArea: document.getElementById('supportMessageArea'),
    input: document.getElementById('supportMessageInput'),
    sendBtn: document.getElementById('supportSendBtn'),
    progress: document.getElementById('aiProgressBar'),
    quickWrap: document.getElementById('quickReplyWrap'),
    quickArea: document.getElementById('quickReplyArea'),
    counter: document.getElementById('inputCounter')
  };

  /* graceDeadline: 자동 종료까지 남은 시간을 "틱 횟수"가 아니라 절대 시각으로 들고 있는다(2026-09-09).
     브라우저가 백그라운드 탭의 setInterval을 억제해서, 다른 탭/창에 가 있으면 카운트다운이 멈춘 것처럼
     보이고 실제 종료도 그만큼 늦어지던 문제 때문(사용자 지적). 0이면 카운트다운이 돌고 있지 않다는 뜻. */
  var idleTimer = null, graceTimer = null, graceDeadline = 0;

  /* ------------------------------------------------------------ 유틸 */
  function nowLabel() {
    var parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', hour: 'numeric', minute: '2-digit', hour12: true
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    return map.dayPeriod + ' ' + map.hour + '시 ' + map.minute + '분';
  }
  function scrollBottom() { els.msgArea.scrollTop = els.msgArea.scrollHeight; }
  function fmtDuration(ms) {
    var s = Math.floor(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  /* sessionId 는 프런트에서 생성합니다. crypto.randomUUID() 는 HTTPS 또는 localhost 에서만
     제공되므로, 평문 HTTP 로 열었을 때를 대비해 폴백을 둡니다. 인증 토큰이 아니라 로그를
     세션 단위로 묶기 위한 식별자입니다. */
  function makeSessionId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /* 화면 표기용 짧은 상담번호 (전체 UUID 는 title 속성에 넣습니다) */
  function shortId(uuid) {
    return 'SUP-' + String(uuid || '').split('-')[0].toUpperCase();
  }

  /* 서버 answer 의 **굵게** 를 strong 으로 변환. XSS 방지를 위해 먼저 이스케이프한 뒤 치환합니다. */
  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function renderBotText(text) {
    return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  /* ========================================================== 메시지 렌더 */
  function renderUser(text) {
    var wrap = document.createElement('div');
    wrap.className = 'e-msg e-msg--me';
    wrap.innerHTML =
      '<div class="min-w-0"><div class="flex items-end gap-1.5 flex-row-reverse">' +
      '<p class="e-msg-bubble"></p><span class="e-msg-time">' + nowLabel() + '</span>' +
      '</div></div>';
    wrap.querySelector('.e-msg-bubble').textContent = text;
    els.msgArea.appendChild(wrap);
    scrollBottom();
  }

  function renderSystem(text, type) {
    var el = document.createElement('div');
    el.className = 'e-msg-system' + (type ? ' e-msg-system--' + type : '');
    el.textContent = text;
    els.msgArea.appendChild(el);
    scrollBottom();
  }

  function createBotBubble() {
    var wrap = document.createElement('div');
    wrap.className = 'e-msg';
    // 2026-08-21 1차 수정 — 안쪽 컬럼에 flex-1이 붙어있어서 답변이 짧든 길든 매번 강제로 최대 너비
    // (88%)까지 늘어나 있었다("처음부터 옆으로 긴데?" 지적). flex-1을 뺐지만, 여러 줄짜리 긴 답변
    // (번호 목록 등)은 block 요소 특성상 flex-1 없이도 shrink-to-fit 계산에서 결국 상한선까지
    // 채워지는 경우가 많아 "여전히 크다"는 지적이 또 나왔다.
    // 2026-08-21 2차 수정 — 상한 자체를 78%(사용자 말풍선과 동일)로 낮췄다. 모바일 화면에서는
    // 88%가 사실상 화면 끝까지 닿아서 짧은 답변이든 긴 답변이든 "꽉 찬" 느낌이었다.
    wrap.style.maxWidth = '78%';
    wrap.innerHTML =
      '<span class="e-bot-avatar" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3-1.9 5.8L4 10.7l6.1 1.9L12 18.5l1.9-5.9 6.1-1.9-6.1-1.9L12 3Z"/></svg>' +
      '</span>' +
      '<div class="min-w-0">' +
      '<p class="e-msg-name">잇티 AI</p>' +
      '<div class="e-msg-bubble e-msg-bubble--bot">' +
      '<span class="js-text" style="white-space:pre-wrap"></span>' +
      '<span class="e-stream-cursor js-caret"></span>' +
      '</div>' +
      '<span class="e-msg-time block mt-1">' + nowLabel() + '</span>' +
      '</div>';
    els.msgArea.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function attachBotFoot(wrap) {
    var bubble = wrap.querySelector('.e-msg-bubble');
    var foot = document.createElement('div');
    foot.className = 'e-msg-foot';
    foot.innerHTML =
      '<button type="button" class="e-msg-foot-btn" data-helpful="yes" aria-pressed="false">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 22V10l4-8h1.5a2 2 0 0 1 2 2.3L14 8h5a2 2 0 0 1 2 2.4l-1.6 8A2 2 0 0 1 17.4 20H7Z"/><path d="M7 10H4v12h3"/></svg>도움됐어요</button>' +
      '<button type="button" class="e-msg-foot-btn" data-helpful="no" aria-pressed="false">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2v12l-4 8h-1.5a2 2 0 0 1-2-2.3L10 16H5a2 2 0 0 1-2-2.4l1.6-8A2 2 0 0 1 6.6 4H17Z"/><path d="M17 14h3V2h-3"/></svg>아니에요</button>' +
      '<button type="button" class="e-msg-foot-btn" data-copy-msg>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>복사</button>';
    bubble.appendChild(foot);
  }

  /* ================================== AI 답변 생성 대기 애니메이션
     2026-08-21 수정 — 질문 이해/자료 검색/답변 작성 단계 문구 + 스켈레톤 줄로 구성됐던 걸 걷어내고,
     참고 이미지(카톡류 채팅앱의 "입력 중" 말풍선)와 같은 단순한 점 3개 바운스 버블로 교체했다.
     이 점 3개 애니메이션(.e-thinking-dots) 자체는 eatty.css에 이미 만들어져 있었는데 실제로는
     한 번도 안 쓰이고 있었다. */
  function showThinking() {
    var wrap = document.createElement('div');
    wrap.className = 'e-thinking';
    wrap.id = 'botThinking';
    wrap.setAttribute('aria-live', 'polite');
    wrap.innerHTML =
      '<span class="e-bot-avatar" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3-1.9 5.8L4 10.7l6.1 1.9L12 18.5l1.9-5.9 6.1-1.9-6.1-1.9L12 3Z"/></svg>' +
      '</span>' +
      '<div class="e-thinking-box">' +
      '<div class="e-thinking-dots"><span></span><span></span><span></span></div>' +
      '</div>';
    els.msgArea.appendChild(wrap);
    els.progress.hidden = false;
    scrollBottom();
    return wrap;
  }

  function hideThinking() {
    var wrap = document.getElementById('botThinking');
    if (wrap) wrap.remove();
    els.progress.hidden = true;
  }

  /* ================================== 스트리밍 출력 (타이핑 효과) */
  function streamText(wrap, text, done) {
    var target = wrap.querySelector('.js-text');
    var caret = wrap.querySelector('.js-caret');
    var i = 0;

    var timer = setInterval(function () {
      i += 2 + Math.floor(Math.random() * 3);
      target.textContent = text.slice(0, i);
      scrollBottom();

      if (i >= text.length) {
        clearInterval(timer);
        target.textContent = text;
        if (caret) caret.remove();
        if (done) done();
      }
    }, 24);
  }

  /* 서버 응답에는 후속 추천 질문이 없어, 첫 인사 뒤에만 일반적인 예시 질문을 보여준다. */
  var DEFAULT_QUICK = ['영수증 인증이 안 돼요', '로그인이 안 돼요', '사업자 심사 현황을 알고 싶어요'];

  /* ================================== 추천 질문 */
  function setQuickReplies(list) {
    els.quickArea.innerHTML = '';
    if (!list || !list.length) { els.quickWrap.hidden = true; return; }
    list.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'e-quick-btn';
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>';
      var span = document.createElement('span');
      span.textContent = q;
      b.appendChild(span);
      b.addEventListener('click', function () { submit(q); });
      els.quickArea.appendChild(b);
    });
    els.quickWrap.hidden = false;
  }

  /* ================================== 세션 시작 (페이지 로드 시 자동 호출) */
  function startSession() {
    /* 세션 생성 API 는 없습니다. sessionId 를 프런트에서 만들어 매 요청에 함께 보냅니다. */
    state.sessionId = makeSessionId();
    state.startedAt = Date.now();
    state.messages = [];
    state.ended = false;

    els.ended.hidden = true;
    els.active.hidden = false;
    els.sessionBar.hidden = false;
    els.msgArea.innerHTML = '';

    renderSystem('대화 내용은 암호화되어 보관되며, 종료 후에는 다시 열람할 수 없습니다. 주민등록번호 · 카드번호 등 민감정보는 입력하지 말아주세요.');

    var greetWrap = createBotBubble();
    var greeting = '안녕하세요, 잇티웨이 AI 상담입니다.\n' +
                   '궁금하신 내용을 영수증 인증처럼 입력해 주세요.';
    streamText(greetWrap, greeting, function () {
      state.messages.push({ role: 'bot', text: greeting, at: Date.now() });
      setQuickReplies(DEFAULT_QUICK);
    });

    resetIdle();
  }

  /* ================================== 메시지 전송 */
  function submit(text) {
    if (state.busy || state.ended) return;
    text = (text || '').trim();
    if (!text) return;

    state.busy = true;
    els.sendBtn.disabled = true;
    els.input.value = '';
    els.input.style.height = 'auto';
    updateCounter();
    setQuickReplies([]);

    renderUser(text);
    state.messages.push({ role: 'user', text: text, at: Date.now() });
    resetIdle();

    showThinking();

    fetch('/api/support-chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: state.sessionId })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        hideThinking();
        if (data && data.success) {
          onAnswer(data.answer);
        } else {
          onError(data && data.message
            ? data.message
            : '답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.');
        }
      })
      .catch(function (err) {
        hideThinking();
        onError('네트워크 오류가 발생했어요. (' + err.message + ')');
      });
  }

  /* 정상 답변 처리 — 서버 answer 를 그대로 렌더링.
     2026-08-21 수정 — 답변이 끝날 때마다 els.input.focus()를 호출하던 게 iOS 앱(WKWebView)에서
     사용자가 손 안 댔는데도 매번 키보드가 자동으로 올라오는 문제였다("자동 호버" 지적). 데스크톱
     브라우저에서는 커서만 깜빡여서 티가 안 났지만, 모바일에서는 답변 올 때마다 키보드가 튀어나온다.
     사용자가 직접 입력창을 탭했을 때만 포커스가 가야 하므로, 답변/에러/초기 인사 뒤의 자동 focus()는
     전부 제거했다(idleContinueBtn처럼 실제 버튼 클릭이라는 사용자 제스처가 있는 경우는 그대로 둠). */
  function onAnswer(answer) {
    var wrap = createBotBubble();
    streamText(wrap, answer, function () {
      /* 스트리밍이 끝난 뒤 **굵게** 마크다운을 반영 */
      var target = wrap.querySelector('.js-text');
      if (target) target.innerHTML = renderBotText(answer);

      attachBotFoot(wrap);
      state.messages.push({ role: 'bot', text: answer, at: Date.now() });
      setQuickReplies(DEFAULT_QUICK);
      state.busy = false;
      els.sendBtn.disabled = false;
      resetIdle();
    });
  }

  /* 실패 처리 — 호출 제한 초과, 네트워크 오류 등 */
  function onError(message) {
    renderSystem(message, 'danger');
    Eatty.toast(message, 'error');
    setQuickReplies(DEFAULT_QUICK);
    state.busy = false;
    els.sendBtn.disabled = false;
    resetIdle();
  }

  /* ================================== 세션 종료 */
  /* reason 값은 서버 EndSupportChatRequestDto.reason 으로 그대로 전달됩니다. */
  var REASON_LABEL = {
    button: '사용자 종료',
    page_closed: '페이지 이탈로 자동 종료',
    idle_timeout: '장시간 미응답으로 자동 종료'
  };

  function endSession(reason) {
    if (state.ended || !state.sessionId) return;
    reason = reason || 'button';

    var duration = fmtDuration(Date.now() - state.startedAt);
    var msgCount = state.messages.length;

    /* --- 기록 완전 삭제 (재열람 차단) --- */
    state.messages.length = 0;
    state.messages = [];
    els.msgArea.innerHTML = '';
    els.quickArea.innerHTML = '';
    els.input.value = '';
    state.ended = true;
    state.busy = false;

    clearTimeout(idleTimer);
    clearInterval(graceTimer);
    graceDeadline = 0;
    hideThinking();

    var endedIdEl = document.getElementById('endedSessionId');
    endedIdEl.textContent = shortId(state.sessionId);
    endedIdEl.title = state.sessionId;
    document.getElementById('endedDuration').textContent = duration;
    document.getElementById('endedMsgCount').textContent = msgCount + '건';
    document.getElementById('endReasonBadge').textContent = REASON_LABEL[reason] || reason;

    document.getElementById('ratingBox').hidden = false;
    document.getElementById('ratingDoneBox').hidden = true;

    els.active.hidden = true;
    els.ended.hidden = false;
    els.sessionBar.hidden = true;

    Eatty.closeModal('endChatModal');
    Eatty.closeModal('idleWarnModal');
  }

  /* 종료 알림 — POST /api/support-chat/session-terminations
     페이지가 닫히는 중일 수도 있어 fetch 대신 sendBeacon 으로 보냅니다. */
  function beaconEnd(reason) {
    if (state.ended || !state.sessionId) return;
    var payload = JSON.stringify({ sessionId: state.sessionId, reason: reason });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/support-chat/session-terminations',
          new Blob([payload], { type: 'application/json' }));
      }
    } catch (e) { /* 무시 */ }
  }

  /* ================================== 타이머 */
  function resetIdle() {
    clearTimeout(idleTimer);
    clearInterval(graceTimer);
    graceDeadline = 0;
    if (state.ended) return;
    idleTimer = setTimeout(showIdleWarning, IDLE_LIMIT_MS);
  }

  /* 남은 초를 deadline에서 매번 다시 계산한다 — 백그라운드 탭에서 틱이 밀려도 화면에 돌아온 순간
     실제 경과 시간이 그대로 반영되고, 이미 시간이 지났으면 즉시 종료된다. */
  function renderGrace() {
    if (!graceDeadline) return;
    var left = Math.max(0, Math.ceil((graceDeadline - Date.now()) / 1000));
    document.getElementById('idleCountdown').textContent = left;
    if (left <= 0) {
      clearInterval(graceTimer);
      graceDeadline = 0;
      beaconEnd('idle_timeout');
      endSession('idle_timeout');
    }
  }

  function showIdleWarning() {
    if (state.ended) return;
    graceDeadline = Date.now() + IDLE_GRACE_SEC * 1000;
    renderGrace();
    Eatty.openModal('idleWarnModal');
    graceTimer = setInterval(renderGrace, 1000);
  }

  /* ================================== 이벤트 바인딩 */
  document.getElementById('restartChatBtn').addEventListener('click', startSession);
  document.getElementById('restartChatBtn2').addEventListener('click', startSession);

  document.getElementById('supportMessageForm').addEventListener('submit', function (e) {
    e.preventDefault();
    submit(els.input.value);
  });

  els.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(els.input.value);
    }
  });

  function updateCounter() {
    els.counter.textContent = els.input.value.length + ' / 1000';
  }
  els.input.addEventListener('input', function () {
    updateCounter();
    resetIdle();
  });

  document.getElementById('endChatConfirmBtn').addEventListener('click', function () {
    beaconEnd('button');
    endSession('button');
  });

  document.getElementById('idleContinueBtn').addEventListener('click', function () {
    Eatty.closeModal('idleWarnModal');
    resetIdle();
    els.input.focus();
  });
  document.getElementById('idleEndNowBtn').addEventListener('click', function () {
    beaconEnd('button');
    endSession('button');
  });

  /* 다른 탭에 다녀오면 그동안 밀린 틱을 기다리지 않고 곧바로 남은 시간을 다시 계산한다(2026-09-09).
     카운트다운이 돌고 있지 않을 때(graceDeadline === 0)는 renderGrace()가 그냥 빠져나온다. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) renderGrace();
  });

  /* 봇 답변 피드백 / 복사 */
  els.msgArea.addEventListener('click', function (e) {
    var fb = e.target.closest('[data-helpful]');
    if (fb) {
      var foot = fb.closest('.e-msg-foot');
      foot.querySelectorAll('[data-helpful]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      fb.setAttribute('aria-pressed', 'true');
      /* ★ 피드백 저장 엔드포인트는 아직 없습니다. 신설 시 여기서 호출하세요. */
      Eatty.toast(fb.getAttribute('data-helpful') === 'yes'
        ? '피드백 감사합니다.' : '알려주셔서 감사합니다. 답변 품질을 개선하겠습니다.');
      return;
    }

    var cp = e.target.closest('[data-copy-msg]');
    if (cp && navigator.clipboard) {
      var txt = cp.closest('.e-msg-bubble').querySelector('.js-text').textContent;
      navigator.clipboard.writeText(txt).then(function () {
        Eatty.toast('답변을 복사했습니다.', 'success');
      });
    }
  });

  /* 만족도 평가 */
  document.getElementById('submitRatingBtn').addEventListener('click', function () {
    var score = Number(document.getElementById('supportRatingValue').value);
    if (!score) {
      Eatty.toast('별점을 선택해주세요.', 'error');
      return;
    }
    /* ★ 만족도 저장 엔드포인트는 아직 없습니다. 신설 시 여기서 호출하세요. */
    document.getElementById('ratingBox').hidden = true;
    document.getElementById('ratingDoneBox').hidden = false;
  });

  /* ================================== 페이지 이탈 → 자동 종료 */
  window.addEventListener('beforeunload', function (e) {
    if (!state.sessionId || state.ended) return;
    beaconEnd('page_closed');
    if (state.messages.length > 1) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  window.addEventListener('pagehide', function () {
    beaconEnd('page_closed');
  });

  document.addEventListener('visibilitychange', function () {
    if (state.ended || !state.sessionId) return;
    if (document.visibilityState !== 'hidden') {
      resetIdle();
    }
  });

  updateCounter();
  startSession();
})();
