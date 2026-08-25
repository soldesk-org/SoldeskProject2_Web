/* ============================================================================
   settlement.js — 정산 카드 뽑기 (2026-08-25 전면 재작업)
   ----------------------------------------------------------------------------
   흐름
     1) 참가자 이름 입력 (최대 10명, 추가/삭제). 안내는 전부 Eatty.toast로 띄운다.
     2) 카드가 트럼프 카드처럼 부채꼴로 펼쳐진다. **부채꼴 카드도 앞면이 카드 디자인**이라
        전부 똑같이 보인다(누가 누군지 알 수 없어야 뽑기가 성립한다).
     3) "랜덤 뽑기" → 카드가 하나씩 튀어 올랐다 내려가며 점점 느려지다 한 장에서 멈춘다.
     4) 뽑힌 카드가 화면 중앙으로 날아온다. **이 시점에는 아직 이름을 보여주지 않는다.**
     5) 카드를 누르면 3D로 뒤집히고, 뒷면 서명란에 뽑힌 사람 이름이 적혀 나온다.

   ⚠️ 이전 버전(2026-08-24)과 달라진 점
     · 카드가 세로형(토스뱅크 카드)이라 "가로로 90도 눕히기"와 rotate(-90deg) 역회전
       트릭이 전부 없어졌다. 덕분에 3D 뒤집기를 안전하게 쓸 수 있다.
     · 당첨 결과를 알리는 흰 박스(패널)를 없앴다. 결과는 카드 자체로만 보여준다.
     · 입력 안내를 페이지 안쪽 문구에서 토스트로 바꿨다(중복 이름 등).

   서버를 쓰지 않는다 — 순수 클라이언트 기능이라 Api 호출도, 로그인도 필요 없다
   (roulette.js와 같은 성격).

   참가자 이름은 **사용자 입력**이다. 카드 마크업을 innerHTML로 만든 뒤 이름만
   textContent로 주입해 XSS를 막는다(roulette.js 87~92의 관용구와 동일).

   defer로 로드되므로 DOM이 이미 파싱된 상태다 → DOMContentLoaded 래퍼 없이
   최상단에서 getElementById로 참조를 캐싱한다(이 프로젝트 페이지 JS 공통 패턴).
   ============================================================================ */
(function () {
  "use strict";

  var MAX = 10;
  var MIN = 2;

  var names = [];
  var drawing = false;   // 뽑기~오버레이 닫기까지 입력/삭제를 잠그는 플래그
  var flipped = false;   // 당첨 카드를 뒤집었는지

  var nameInput = document.getElementById("scName");
  var addBtn = document.getElementById("scAddBtn");
  var namesEl = document.getElementById("scNames");
  var blankEl = document.getElementById("scBlank");
  var countEl = document.getElementById("scCount");
  var stageEl = document.getElementById("scStage");
  var stageBlank = document.getElementById("scStageBlank");
  var fanEl = document.getElementById("scFan");
  var drawBtn = document.getElementById("scDrawBtn");
  var clearBtn = document.getElementById("scClearBtn");
  var noteEl = document.getElementById("scNote");

  var overlay = document.getElementById("scOverlay");
  var overlayBg = document.getElementById("scOverlayBg");
  var guideEl = document.getElementById("scGuide");
  var flier = document.getElementById("scFlier");
  var cardHost = document.getElementById("scCardHost");
  var flipBtn = document.getElementById("scFlipBtn");
  var closeBtn = document.getElementById("scCloseBtn");   // 우측 상단 X
  var confetti = document.getElementById("scConfetti");

  // 이 페이지의 필수 요소가 없으면(다른 페이지에 잘못 로드된 경우) 조용히 빠진다.
  if (!nameInput || !fanEl || !drawBtn || !flier || !cardHost) return;

  function toast(msg, type) {
    if (window.Eatty && typeof Eatty.toast === "function") Eatty.toast(msg, type || "default");
  }

  /* 카드 기본 크기는 CSS 변수에서 읽는다. CSS와 JS에 같은 숫자를 두 번 적으면
     한쪽만 바뀌었을 때 조용히 어긋나므로 단일 출처로 둔다. */
  function cardBase() {
    var cs = getComputedStyle(document.documentElement);
    return {
      w: parseFloat(cs.getPropertyValue("--sc-w")) || 160,
      h: parseFloat(cs.getPropertyValue("--sc-h")) || 254
    };
  }

  /* ── 카드 마크업 ───────────────────────────────────────────
     앞면은 참가자와 무관하게 전부 동일하다(뽑기 공정성). 이름은 뒷면 서명란에만 들어간다. */
  /* 카드 마크업.
     앞면/뒷면은 CSS가 카드 시안 **이미지**를 배경으로 깐다. 여기서 만드는 것은 상자와
     서명란 이름뿐이다(무늬·로고·칩·자기 띠·문구는 모두 이미지가 가진 그림).

     withBack: 뒷면을 만들지 여부.
       · 부채꼴 카드는 false — 뒷면이 필요 없고, 무엇보다 **이름을 DOM에 넣지 않아야 한다.**
         opacity로만 감추면 스크린리더가 펼쳐진 카드 10장의 이름을 다 읽어버려서 결과가
         미리 새어나간다(눈에는 안 보여도 접근성 트리에는 남는다).
       · 당첨 카드는 true. */
  function buildCard(el, name, withBack) {
    var html = '<div class="sc-card-inner"><div class="sc-side sc-front"></div>';
    if (withBack) html += '<div class="sc-side sc-back"><span class="sc-sign-name"></span></div>';
    el.innerHTML = html + '</div>';

    if (!withBack) return;

    var nameEl = el.querySelector(".sc-sign-name");
    if (!nameEl) return;
    nameEl.textContent = name;   // 사용자 입력 — innerHTML 경로를 타지 않게 textContent로만
    /* 서명란 폭이 정해져 있어서 긴 이름은 잘린다. 글자 수에 따라 크기를 낮춰
       maxlength(12자)까지 잘리지 않고 들어가게 한다. */
    nameEl.style.fontSize = name.length > 10 ? "9px" : name.length > 8 ? "10.5px" : "13px";
  }

  /* 부채꼴이 실제로 차지하는 영역(카드 박스 좌상단 기준, 배율 적용 전 px).
     카드마다 네 꼭짓점을 transform-origin(50% 150%) 기준으로 회전시켜 최소/최대를 구한다.
     CSS와 같은 회전식을 쓴다(y축이 아래로 향하므로 각도 부호도 CSS와 동일):
       x' = x·cos a − y·sin a
       y' = x·sin a + y·cos a */
  function fanExtent(angles, w, h) {
    var ox = w / 2, oy = h * 1.5;                     // transform-origin
    var pts = [[0, 0], [w, 0], [0, h], [w, h]];       // 카드 네 꼭짓점
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (var i = 0; i < angles.length; i++) {
      var a = angles[i] * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      for (var j = 0; j < pts.length; j++) {
        var x = pts[j][0] - ox, y = pts[j][1] - oy;
        var sx = ox + (x * ca - y * sa);
        var sy = oy + (x * sa + y * ca);
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }
    }
    return { left: minX, right: maxX, top: minY, bottom: maxY, w: maxX - minX, h: maxY - minY };
  }

  /* ── 부채꼴 렌더 ───────────────────────────────────────── */
  function renderFan() {
    fanEl.innerHTML = "";
    var n = names.length;
    if (stageBlank) stageBlank.hidden = n > 0;
    if (!n) {
      fanEl.style.removeProperty("--sc-fs");
      fanEl.style.removeProperty("--sc-lift");
      return;
    }

    var base = cardBase();
    var spread = Math.min(72, n * 9.5);   // 사람이 적으면 좁게, 많아지면 넓게

    var angles = [];
    for (var k = 0; k < n; k++) angles.push(n === 1 ? 0 : (-spread / 2 + spread * k / (n - 1)));

    /* 부채꼴이 실제로 차지하는 영역을 계산해 (1) 축소 배율과 (2) 수직 보정을 정한다.
       ⚠️ 어림셈으로는 안 된다 — 카드의 transform-origin이 50% 150%(카드 아래 바깥)라서
       회전한 카드는 위로 솟는 게 아니라 **아래로 더 내려간다**(회전축이 아래에 있으니
       카드가 축을 중심으로 옆으로 눕듯 돌면서 아래쪽으로 뻗는다). 그래서 카드 높이만으로
       어림하면 아래가 잘리거나 아래로 치우쳐 보인다. 네 꼭짓점을 직접 회전시켜 구한다. */
    var ext = fanExtent(angles, base.w, base.h);

    var availW = (stageEl ? stageEl.clientWidth : window.innerWidth) - 20;
    var availH = (stageEl ? stageEl.clientHeight : 300) - 20;
    var fs = Math.max(0.4, Math.min(1, availW / ext.w, availH / ext.h));
    fanEl.style.setProperty("--sc-fs", fs.toFixed(3));

    /* 실제 영역의 중심을 무대 정중앙에 맞춘다.
       .sc-fan은 무대에서 세로 가운데 정렬되어 있고, scale은 박스 중심(높이의 절반)을
       기준으로 걸린다. 그래서 영역 중심을 박스 중심으로 끌어오는 이동량은
       (박스중심 - 영역중심) x 배율 이다. translateY는 scale 뒤에 적용되므로 화면 px다. */
    var lift = (base.h / 2 - (ext.top + ext.bottom) / 2) * fs;
    fanEl.style.setProperty("--sc-lift", lift.toFixed(1) + "px");

    names.forEach(function (name, i) {
      var el = document.createElement("div");
      el.className = "sc-card";
      el.style.setProperty("--a", angles[i].toFixed(2) + "deg");
      el.style.zIndex = String(i + 1);
      buildCard(el, name, false);   // 부채꼴은 앞면만 — 이름을 DOM에 넣지 않는다(위 buildCard 주석)
      fanEl.appendChild(el);
      // 한 장씩 차례로 펼쳐지게 지연을 준다(트럼프 카드 펼치는 느낌).
      setTimeout(function () { el.classList.add("is-in"); }, 50 + i * 52);
    });
  }

  function cards() { return fanEl.querySelectorAll(".sc-card"); }

  /* ── 목록 / 상태 ──────────────────────────────────────── */
  function renderNames() {
    namesEl.innerHTML = "";
    names.forEach(function (name, i) {
      var chip = document.createElement("span");
      chip.className = "sc-chip";

      var label = document.createElement("span");
      label.textContent = name;                 // 사용자 입력 — textContent로만

      var x = document.createElement("button");
      x.type = "button";
      x.className = "sc-chip-x";
      x.setAttribute("aria-label", name + " 삭제");
      x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" ' +
        'stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      x.addEventListener("click", function () { removeAt(i); });

      chip.appendChild(label);
      chip.appendChild(x);
      namesEl.appendChild(chip);
    });
  }

  function syncUI() {
    if (countEl) countEl.textContent = String(names.length);
    if (blankEl) blankEl.hidden = names.length > 0;

    var full = names.length >= MAX;
    nameInput.disabled = full || drawing;
    if (addBtn) addBtn.disabled = full || drawing;
    nameInput.placeholder = full ? MAX + "명까지 다 채웠어요" : "이름 입력";

    drawBtn.disabled = names.length < MIN || drawing;
    if (clearBtn) clearBtn.disabled = !names.length || drawing;
    if (noteEl) {
      noteEl.textContent = drawing ? "뽑는 중이에요"
        : names.length < MIN ? MIN + "명 이상 담아주세요"
        : names.length + "명 중 한 명이 뽑혀요";
    }
  }

  function refresh() { renderNames(); renderFan(); syncUI(); }

  /* ── 추가 / 삭제 ──────────────────────────────────────── */
  function addName() {
    if (drawing) return;
    var v = nameInput.value.trim().replace(/\s+/g, " ");
    if (!v) { toast("이름을 입력해 주세요.", "error"); nameInput.focus(); return; }
    if (names.length >= MAX) { toast("최대 " + MAX + "명까지 담을 수 있어요.", "error"); return; }
    // 같은 이름이 두 장이면 누가 뽑혔는지 구분할 수 없으니 막는다.
    if (names.indexOf(v) > -1) {
      toast("이미 담은 이름이에요. 구분되게 적어주세요.", "error");
      nameInput.select();
      return;
    }
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
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (drawing || !names.length) return;
      names = [];
      refresh();
      toast("참가자를 모두 비웠어요.", "default");
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
    flipped = false;
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
        setTimeout(function () { flyOut(winner); }, 400);   // 잠깐 머금은 뒤 날려보낸다
        return;
      }
      var p = step / total;
      setTimeout(tick, 52 + Math.pow(p, 3) * 420);          // 뒤로 갈수록 느려진다
    })();
  }

  drawBtn.addEventListener("click", startDraw);

  /* ── 뽑힌 카드를 중앙으로 ─────────────────────────────────
     오버레이의 카드 자리(.sc-flier)는 flex로 이미 중앙에 있다. 그래서 "부채꼴에서의
     위치/각도/배율"을 시작값으로 역산해 인라인 transform에 넣고, 다음 프레임에 그것을
     비우면 CSS 정지 상태로 전환되면서 제자리로 날아온다(FLIP 기법).

     ⚠️ CSS 정지 상태에 rotate(90deg)가 들어 있어서, 이 전환만으로 **카드가 세로에서
     가로로 돌아 눕는다.** 즉 회전은 등장 연출의 일부이고 별도 코드가 없다.
     ⚠️ 이름은 아직 보이지 않는다 — 가로로 누운 앞면이 보이고, 사용자가 눌러야 뒷면이 나온다. */
  function flyOut(i) {
    var srcEl = cards()[i];
    if (!srcEl) { drawing = false; syncUI(); return; }
    var name = names[i];

    // ⚠️ flier가 아니라 cardHost에 만든다 — flier에는 클릭 레이어(.sc-flip)가 함께 들어 있어서
    // flier.innerHTML을 덮어쓰면 그 버튼이 사라진다.
    buildCard(cardHost, name, true);
    flier.classList.remove("is-flipped");
    if (flipBtn) {
      flipBtn.disabled = false;
      flipBtn.setAttribute("aria-label", "카드를 눌러 뽑힌 사람 확인하기");
    }
    if (guideEl) guideEl.innerHTML = '<b>카드가 뽑혔어요</b>카드를 눌러 확인해 보세요';

    // 오버레이를 먼저 띄워야 .sc-flier의 최종 위치를 측정할 수 있다.
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-modal-open");
    srcEl.classList.add("is-gone");          // 같은 카드가 두 장 보이지 않게 원본은 감춘다

    var from = srcEl.getBoundingClientRect();
    var to = flier.getBoundingClientRect();
    /* 회전/확대된 요소의 getBoundingClientRect()는 **변환 후 외곽 상자**를 준다. 폭/높이는
       신뢰할 수 없지만 **중심 좌표는 정확하다** — 회전과 (중심 기준) 확대 모두 중심을 보존한다.
       그래서 양쪽 모두 rect의 중심만 쓴다.
       ⚠️ 여기서 to의 크기를 카드 기본 크기로 가정하면 안 된다. .sc-flier에는 CSS가
       scale(--sc-rs) 확대를 걸어 두므로 rect가 그만큼 커져 있다(중심은 그대로다).
       translate는 scale보다 먼저 적용되므로 dx/dy는 화면 px 그대로 쓰면 된다. */
    var startS = parseFloat(fanEl.style.getPropertyValue("--sc-fs")) || 1;
    var startA = (srcEl.style.getPropertyValue("--a") || "0deg").trim();
    var dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    var dy = (from.top + from.height / 2) - (to.top + to.height / 2);

    flier.style.transition = "none";
    flier.style.transform =
      "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + startS + ") rotate(" + startA + ")";

    requestAnimationFrame(function () {
      flier.style.transition = "transform .62s cubic-bezier(.2,.85,.25,1)";
      flier.style.transform = "";          // 기울기를 펴며 제자리(중앙)로
    });
  }

  /* ── 카드 뒤집기 ─────────────────────────────────────────── */
  function flipCard() {
    if (flipped || !overlay.classList.contains("is-open")) return;
    flipped = true;
    flier.classList.add("is-flipped");
    if (flipBtn) {
      flipBtn.disabled = true;             // 한 번 뒤집으면 다시 못 뒤집게
      flipBtn.setAttribute("aria-label", "뽑힌 사람 확인 완료");
    }

    /* 타이밍은 CSS의 뒤집기 애니메이션(scTurn .66s)에 맞춘다.
       0.33s에 카드가 가장 얇아지고 그때 앞/뒷면이 교체되므로, 문구 변경과 축하 연출은
       그 직후에 넣고 버튼은 애니메이션이 끝난 뒤 띄운다. CSS 시간을 바꾸면 여기도 맞춰야 한다. */
    setTimeout(function () {
      if (guideEl) guideEl.innerHTML = '<b>오늘 계산은</b>이 카드의 주인입니다';
      popConfetti();
    }, 380);
    // 확인이 끝나면 남은 동작은 닫기뿐이라 X로 포커스를 옮긴다(키보드 사용자 배려).
    setTimeout(function () {
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }, 700);
  }

  if (flipBtn) flipBtn.addEventListener("click", flipCard);

  function popConfetti() {
    if (!confetti) return;
    var colors = ["#fd6d4a", "#fea255", "#ffd36b", "#7c6cff", "#4ecb8f", "#ffffff"];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 30; i++) {
      var d = document.createElement("i");
      d.className = "sc-conf";
      d.style.left = (Math.random() * 100).toFixed(2) + "%";
      d.style.background = colors[i % colors.length];
      d.style.animationDuration = (1.9 + Math.random() * 1.4).toFixed(2) + "s";
      d.style.animationDelay = (Math.random() * 0.45).toFixed(2) + "s";
      d.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2);
      d.style.transform = "rotate(" + Math.floor(Math.random() * 360) + "deg)";
      frag.appendChild(d);
    }
    confetti.appendChild(frag);
  }

  /* ── 닫기 ─────────────────────────────────────────────── */
  function closeOverlay() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    // 다른 모달이 열려 있지 않을 때만 스크롤 잠금을 푼다(eatty-ui.js closeModal과 같은 판정).
    if (!document.querySelector(".e-modal.is-open")) document.body.classList.remove("is-modal-open");

    setTimeout(function () {
      if (confetti) confetti.innerHTML = "";
      flier.classList.remove("is-flipped");
      flier.removeAttribute("style");
      cardHost.innerHTML = "";
      var list = cards();
      for (var i = 0; i < list.length; i++) list[i].classList.remove("is-up", "is-gone");
      drawing = false;
      flipped = false;
      syncUI();
    }, 300);
  }

  // 닫는 방법 세 가지: X 버튼, 백드롭(카드 밖 어두운 영역) 탭, Esc.
  // "다시 뽑기" 버튼은 없앴다 — 닫고 페이지의 "랜덤 뽑기"를 다시 누르면 된다.
  if (closeBtn) closeBtn.addEventListener("click", closeOverlay);
  if (overlayBg) overlayBg.addEventListener("click", closeOverlay);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !overlay.classList.contains("is-open")) return;
    closeOverlay();
  });

  // 창 크기가 바뀌면 부채꼴 축소 비율을 다시 계산한다(뽑는 중에는 건드리지 않는다).
  var rzTimer = null;
  window.addEventListener("resize", function () {
    if (drawing) return;
    if (rzTimer) clearTimeout(rzTimer);
    rzTimer = setTimeout(renderFan, 160);
  });

  refresh();
})();
