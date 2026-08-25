/* ============================================================================
   settlement.js — 정산 카드 뽑기 (2026-08-24 신규)
   ----------------------------------------------------------------------------
   흐름
     1) 참가자 이름 입력 (최대 10명, 추가/삭제)
     2) 카드가 트럼프 카드처럼 부채꼴로 펼쳐짐
     3) "랜덤 뽑기" → 카드가 하나씩 튀어 올랐다 내려가며 점점 느려지다 한 장에서 멈춤
     4) 뽑힌 카드가 화면 중앙으로 날아가 옆으로 90도 회전해 가로(신용카드 방향)가 되고
        앞면이 드러나 주인 이름이 보임
     5) 정산 당첨 팝업

   서버를 쓰지 않는다 — 순수 클라이언트 기능이라 Api 호출도, 로그인도 필요 없다
   (roulette.js와 같은 성격). 그래서 이 파일에는 Api 의존이 전혀 없다.

   참가자 이름은 **사용자 입력**이다. 카드 마크업을 innerHTML로 만든 뒤 이름만
   textContent로 다시 주입해서 XSS를 막는다(roulette.js 87~92의 관용구와 동일).

   defer로 로드되므로 DOM이 이미 파싱된 상태다 → DOMContentLoaded 래퍼 없이
   최상단에서 getElementById로 참조를 캐싱한다(이 프로젝트 페이지 JS 공통 패턴).
   ============================================================================ */
(function () {
  "use strict";

  var MAX = 10;
  var MIN = 2;

  /* 카드 기본 크기. settlement.css의 --sc-w / --sc-h와 **같은 값을 유지해야 한다.**
     날아가는 복제 카드는 이 기본 크기로 두고 확대/축소를 transform: scale로만 처리한다
     (아래 reveal의 주석 참고). 실제 값은 CSS 변수에서 읽어 와 어긋남을 원천 차단한다. */
  function cardBase() {
    var cs = getComputedStyle(document.documentElement);
    var w = parseFloat(cs.getPropertyValue("--sc-w")) || 148;
    var h = parseFloat(cs.getPropertyValue("--sc-h")) || 235;
    return { w: w, h: h };
  }

  var names = [];
  var drawing = false;

  var nameInput = document.getElementById("scName");
  var addBtn = document.getElementById("scAddBtn");
  var msgEl = document.getElementById("scMsg");
  var namesEl = document.getElementById("scNames");
  var emptyEl = document.getElementById("scEmpty");
  var countEl = document.getElementById("scCount");
  var fanEl = document.getElementById("scFan");
  var stageEmptyEl = document.getElementById("scStageEmpty");
  var drawBtn = document.getElementById("scDrawBtn");
  var resetBtn = document.getElementById("scResetBtn");
  var hintEl = document.getElementById("scHint");
  var overlay = document.getElementById("scOverlay");
  var overlayBg = document.getElementById("scOverlayBg");
  var flier = document.getElementById("scFlier");
  var prize = document.getElementById("scPrize");
  var prizeName = document.getElementById("scPrizeName");
  var prizeDesc = document.getElementById("scPrizeDesc");
  var confetti = document.getElementById("scConfetti");
  var againBtn = document.getElementById("scAgainBtn");
  var closeBtn = document.getElementById("scCloseBtn");

  // 이 페이지의 필수 요소가 없으면(다른 페이지에 잘못 로드된 경우) 조용히 빠진다.
  if (!nameInput || !fanEl || !drawBtn) return;

  /* ── 안내 문구 ────────────────────────────────────────────
     토스트를 쓰지 않는 이유: 입력 바로 아래에 붙어 있는 게 맥락이 분명하고,
     연달아 추가할 때 토스트가 쌓이면 화면 하단을 가린다. */
  var msgTimer = null;
  function say(text) {
    if (!msgEl) return;
    msgEl.textContent = text;
    if (msgTimer) clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { msgEl.textContent = ""; }, 2400);
  }

  /* ── 카드 번호 / 유효기간 ─────────────────────────────────
     이름에서 만든 해시로 고정한다. 매번 랜덤이면 다시 뽑을 때 같은 사람의 카드 번호가
     바뀌어 어색하다. 실제 카드번호가 아니라 앞 12자리는 가려서 보여준다. */
  function digitsFor(name) {
    var h = 5381;
    for (var i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) | 0;
    return ("000" + (Math.abs(h) % 10000)).slice(-4);
  }
  function thruFor(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h += name.charCodeAt(i) * (i + 3);
    return ("0" + (h % 12 + 1)).slice(-2) + "/" + (28 + (h % 5));
  }

  var WAVE_SVG =
    '<svg class="sc-cc-wave" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" ' +
    'stroke-linecap="round" aria-hidden="true">' +
    '<path d="M5 8a9 9 0 0 1 0 8"/><path d="M9.5 6a13 13 0 0 1 0 12"/><path d="M14 4.5a17 17 0 0 1 0 15"/></svg>';

  /* 카드 한 장(뒷면 + 앞면). 부채꼴 카드와 날아가는 복제 카드가 같은 구조를 쓴다.
     ⚠️ 이름은 여기서 넣지 않는다 — 아래에서 textContent로 주입한다. */
  function buildCard(el, name) {
    el.innerHTML =
      '<div class="sc-face sc-face-back">' +
        '<div class="sc-back-body">' +
          '<span class="sc-back-mark"><img src="img/logo.png" alt=""></span>' +
          '<span class="sc-back-word">EATTYWAY</span>' +
          '<span class="sc-back-sub">SETTLEMENT</span>' +
        '</div>' +
      '</div>' +
      '<div class="sc-face sc-face-front">' +
        '<div class="sc-cc">' +
          '<div class="sc-cc-top">' +
            '<div>' +
              '<div class="sc-cc-brand">EATTYWAY</div>' +
              '<div class="sc-cc-kind">SETTLEMENT CARD</div>' +
            '</div>' + WAVE_SVG +
          '</div>' +
          '<div class="sc-cc-mid"><span class="sc-cc-chip"></span><span class="sc-cc-holo"></span></div>' +
          '<div class="sc-cc-num"><i>&bull;&bull;&bull;&bull;</i> <i>&bull;&bull;&bull;&bull;</i> ' +
            '<i>&bull;&bull;&bull;&bull;</i> <em class="sc-cc-tail"></em></div>' +
          '<div class="sc-cc-bot">' +
            '<div>' +
              '<div class="sc-cc-label">CARD HOLDER</div>' +
              '<div class="sc-cc-holder"></div>' +
            '</div>' +
            '<div class="sc-cc-thru">' +
              '<div class="sc-cc-label">VALID THRU</div><div class="sc-cc-thru-v"></div>' +
            '</div>' +
            '<span class="sc-cc-net"><span></span><span></span></span>' +
          '</div>' +
        '</div>' +
      '</div>';

    // 사용자 입력/생성 문자열은 전부 textContent로 — innerHTML 경로를 타지 않게 한다.
    var tail = el.querySelector(".sc-cc-tail");
    var holder = el.querySelector(".sc-cc-holder");
    var thru = el.querySelector(".sc-cc-thru-v");
    if (tail) { tail.style.fontStyle = "normal"; tail.textContent = digitsFor(name); }
    if (holder) holder.textContent = name;
    if (thru) thru.textContent = thruFor(name);
  }

  /* ── 부채꼴 렌더 ──────────────────────────────────────── */
  function renderFan() {
    fanEl.innerHTML = "";
    var n = names.length;
    if (stageEmptyEl) stageEmptyEl.hidden = n > 0;
    if (!n) { fanEl.style.removeProperty("--sc-fs"); return; }

    var base = cardBase();
    // 사람이 적으면 좁게, 많아지면 넓게(최대 74도).
    var spread = Math.min(74, n * 9.5);

    // 부채꼴 전체 폭이 무대 폭을 넘으면 통째로 축소한다.
    // transform-origin이 카드 높이의 152% 지점이므로 그 거리를 반지름으로 본다.
    var radius = base.h * 1.52;
    var fanW = 2 * radius * Math.sin(spread / 2 * Math.PI / 180) + base.w;
    var avail = (fanEl.parentElement ? fanEl.parentElement.clientWidth : window.innerWidth) - 24;
    fanEl.style.setProperty("--sc-fs", Math.min(1, avail / fanW).toFixed(3));

    names.forEach(function (name, i) {
      var el = document.createElement("div");
      el.className = "sc-card";
      // 한 장이면 각도 0, 여러 장이면 -spread/2 ~ +spread/2 균등 분배
      el.style.setProperty("--a", (n === 1 ? 0 : (-spread / 2 + spread * i / (n - 1))).toFixed(2) + "deg");
      el.style.zIndex = String(i + 1);
      buildCard(el, name);
      fanEl.appendChild(el);
      // 한 장씩 차례로 펼쳐지게 지연을 준다(트럼프 카드 펼치는 느낌).
      setTimeout(function () { el.classList.add("is-in"); }, 60 + i * 55);
    });
  }

  function cards() { return fanEl.querySelectorAll(".sc-card"); }

  /* ── 목록 / 상태 ──────────────────────────────────────── */
  function renderNames() {
    namesEl.innerHTML = "";
    names.forEach(function (name, i) {
      var chip = document.createElement("span");
      chip.className = "sc-chip";

      var no = document.createElement("span");
      no.className = "sc-chip-no";
      no.textContent = String(i + 1);

      var label = document.createElement("span");
      label.textContent = name;   // 사용자 입력 — textContent로만 주입

      var x = document.createElement("button");
      x.type = "button";
      x.className = "sc-chip-x";
      x.setAttribute("aria-label", name + " 삭제");
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" ' +
        'stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      x.addEventListener("click", function () { removeAt(i); });

      chip.appendChild(no);
      chip.appendChild(label);
      chip.appendChild(x);
      namesEl.appendChild(chip);
    });
  }

  function syncUI() {
    if (countEl) countEl.textContent = String(names.length);
    if (emptyEl) emptyEl.hidden = names.length > 0;

    var full = names.length >= MAX;
    nameInput.disabled = full;
    if (addBtn) addBtn.disabled = full;
    nameInput.placeholder = full ? MAX + "명까지 다 채웠어요" : "이름을 입력하세요";

    drawBtn.disabled = names.length < MIN || drawing;
    if (resetBtn) resetBtn.disabled = !names.length || drawing;
    if (hintEl) {
      hintEl.textContent = drawing ? "뽑는 중..."
        : names.length < MIN ? MIN + "명 이상부터 뽑을 수 있어요."
        : names.length + "명 중 한 명이 뽑힙니다.";
    }
  }

  function refresh() { renderNames(); renderFan(); syncUI(); }

  /* ── 추가 / 삭제 ──────────────────────────────────────── */
  function addName() {
    if (drawing) return;
    var v = nameInput.value.trim().replace(/\s+/g, " ");
    if (!v) { say("이름을 입력해 주세요."); nameInput.focus(); return; }
    if (names.length >= MAX) { say("최대 " + MAX + "명까지 추가할 수 있어요."); return; }
    // 같은 이름이 두 장이면 누가 뽑혔는지 구분할 수 없으니 막는다.
    if (names.indexOf(v) > -1) { say("이미 있는 이름이에요. 구분되게 적어주세요."); nameInput.select(); return; }
    names.push(v);
    nameInput.value = "";
    refresh();
    nameInput.focus();
  }

  function removeAt(i) {
    if (drawing) return;
    names.splice(i, 1);
    refresh();
  }

  if (addBtn) addBtn.addEventListener("click", addName);
  nameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); addName(); }
  });
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (drawing) return;
      names = [];
      refresh();
      nameInput.focus();
    });
  }

  /* ── 뽑기 ─────────────────────────────────────────────────
     카드를 한 장씩 훑으며 튀어 오르게 하고(올라갔다 내려갔다), 간격을 점점 늘려
     감속시킨 뒤 마지막에 당첨 카드에서 멈춘다.
     총 스텝을 laps*n + winner + 1로 잡으면 마지막 스텝의 인덱스가 정확히 winner가 된다. */
  function markUp(idx) {
    var list = cards();
    for (var i = 0; i < list.length; i++) list[i].classList.toggle("is-up", i === idx);
  }

  function startDraw() {
    if (drawing || names.length < MIN) return;
    drawing = true;
    syncUI();

    var n = names.length;
    var winner = Math.floor(Math.random() * n);
    var laps = 2 + Math.floor(Math.random() * 2);   // 2~3바퀴는 돌게 한다
    var total = laps * n + winner + 1;
    var step = 0;

    (function tick() {
      markUp(step % n);
      step++;
      if (step >= total) {
        setTimeout(function () { reveal(winner); }, 420);   // 잠깐 머금은 뒤 공개
        return;
      }
      var p = step / total;
      setTimeout(tick, 52 + Math.pow(p, 3) * 430);          // 뒤로 갈수록 느려진다
    })();
  }

  drawBtn.addEventListener("click", startDraw);

  /* ── 당첨 공개 ───────────────────────────────────────────
     원본 카드의 화면 좌표에서 시작해 중앙으로 날아간 뒤,
     rotate(90deg)로 가로가 되면서 앞면으로 교차된다. */
  function reveal(i) {
    var srcEl = cards()[i];
    if (!srcEl) { drawing = false; syncUI(); return; }
    var name = names[i];
    var r = srcEl.getBoundingClientRect();
    var base = cardBase();

    /*
     ⚠️ 복제 카드의 width/height를 r.width/r.height로 주면 안 된다. 두 가지 이유가 있다.
       1) 부채꼴 카드는 회전돼 있어서 getBoundingClientRect()가 **회전 후 외곽 상자**를
          돌려준다. 카드의 실제 폭보다 크다.
       2) 앞면(.sc-cc)은 부모의 가로/세로를 맞바꾼 크기를 전제로 눕혀 놨다. 상자 크기가
          기본값과 다르면 .sc-face의 overflow:hidden에 잘려 나간다.
     그래서 복제 카드는 **항상 기본 크기**로 두고 축소/확대는 transform: scale로만 한다.
     시작 배율은 부채꼴이 쓰는 --sc-fs를, 시작 각도는 그 카드의 --a를 그대로 가져온다.
     (회전된 사각형의 외곽 상자 중심은 사각형 중심과 같으므로 중심 좌표만 rect에서 얻는다.)
    */
    var startA = (srcEl.style.getPropertyValue("--a") || "0deg").trim();
    var startS = parseFloat(fanEl.style.getPropertyValue("--sc-fs")) || 1;
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;

    buildCard(flier, name);
    flier.classList.remove("is-front");
    flier.style.transition = "none";
    flier.style.width = base.w + "px";
    flier.style.height = base.h + "px";
    flier.style.left = (cx - base.w / 2) + "px";
    flier.style.top = (cy - base.h / 2) + "px";
    flier.style.transform = "scale(" + startS + ") rotate(" + startA + ")";

    srcEl.classList.add("is-gone");
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-modal-open");   // 배경 스크롤 잠금(eatty.css 규칙 재사용)

    // 90도 돌면 '카드의 높이'가 화면상 폭이 되므로 base.h 기준으로 최종 배율을 잡는다.
    var targetW = Math.min(348, window.innerWidth - 52);
    var endS = targetW / base.h;
    var dx = window.innerWidth / 2 - cx;
    var dy = (window.innerHeight * 0.34) - cy;
    var move = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + endS.toFixed(3) + ")";

    // 1) 기울기를 펴면서 중앙으로 이동 + 확대
    requestAnimationFrame(function () {
      flier.style.transition = "transform .58s cubic-bezier(.2,.85,.25,1)";
      flier.style.transform = move;
    });

    // 2) 옆으로 90도 회전해 가로가 되면서 앞면 공개
    setTimeout(function () {
      flier.style.transition = "transform .72s cubic-bezier(.34,1.2,.44,1)";
      flier.style.transform = move + " rotate(90deg)";
      flier.classList.add("is-front");
    }, 640);

    // 3) 당첨 팝업 + 종이꽃
    setTimeout(function () {
      prizeName.innerHTML = "";
      var em = document.createElement("span");
      em.textContent = name;              // 사용자 입력 — textContent
      prizeName.appendChild(em);
      prizeName.appendChild(document.createTextNode("님!"));
      prizeDesc.textContent = names.length + "명 중에서 뽑혔어요. 오늘 계산 부탁드립니다.";
      prize.classList.add("is-in");
      popConfetti();
      if (againBtn) againBtn.focus({ preventScroll: true });
    }, 1360);
  }

  function popConfetti() {
    if (!confetti) return;
    var colors = ["#fd6d4a", "#fea255", "#ffd36b", "#7c6cff", "#4ecb8f", "#ffffff"];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 34; i++) {
      var d = document.createElement("i");
      d.className = "sc-conf";
      d.style.left = (Math.random() * 100).toFixed(2) + "%";
      d.style.background = colors[i % colors.length];
      d.style.animationDuration = (1.9 + Math.random() * 1.5).toFixed(2) + "s";
      d.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s";
      d.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2);
      d.style.transform = "rotate(" + Math.floor(Math.random() * 360) + "deg)";
      frag.appendChild(d);
    }
    confetti.appendChild(frag);
  }

  function closeOverlay() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    prize.classList.remove("is-in");
    // 다른 모달이 열려 있지 않을 때만 스크롤 잠금을 푼다(eatty-ui.js closeModal과 같은 판정).
    if (!document.querySelector(".e-modal.is-open")) document.body.classList.remove("is-modal-open");

    setTimeout(function () {
      if (confetti) confetti.innerHTML = "";
      flier.innerHTML = "";
      flier.classList.remove("is-front");
      flier.removeAttribute("style");
      var list = cards();
      for (var i = 0; i < list.length; i++) list[i].classList.remove("is-up", "is-gone");
      drawing = false;
      syncUI();
    }, 320);
  }

  if (closeBtn) closeBtn.addEventListener("click", closeOverlay);
  if (overlayBg) overlayBg.addEventListener("click", closeOverlay);
  if (againBtn) {
    againBtn.addEventListener("click", function () {
      closeOverlay();
      setTimeout(startDraw, 520);   // 카드가 제자리로 돌아온 뒤 다시 시작
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeOverlay();
  });

  // 창 크기가 바뀌면 부채꼴 축소 비율을 다시 계산한다(뽑는 중에는 건드리지 않는다).
  var rzTimer = null;
  window.addEventListener("resize", function () {
    if (drawing) return;
    if (rzTimer) clearTimeout(rzTimer);
    rzTimer = setTimeout(renderFan, 180);
  });

  refresh();
})();
