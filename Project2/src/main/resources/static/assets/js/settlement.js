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

  /* fanOrder[i] = 화면 i번째(왼쪽부터) 자리가 어떤 names 인덱스를 보여주는지.
     ⚠️ names 배열 자체는 절대 섞지 않는다 — 참가자 칩 목록은 입력한 순서를 유지해야 하는데
     names를 섞으면 칩 순서도 같이 뒤섞여 버린다(renderNames도 같은 names를 쓴다).
     그래서 "카드가 어디 있는지"만 따로 이 배열로 관리한다.
     이름을 추가/삭제할 때마다 resetFanOrder()로 다시 identity(0,1,2,...) 상태로 되돌린다 —
     참가자 목록을 편집한 뒤에는 위치도 편집한 순서 그대로 보이는 게 자연스럽다.
     뽑기 버튼을 누르면 doShuffleAnimation()이 카드를 실제로 맞바꾸며 이 배열을 갱신한다
     (2026-08-25 재작업 — 예전에는 카드를 통째로 걷었다가 다시 그리는 방식이었는데,
     "저건 사라졌다 다시 생기는 거잖아, 섞는 애니메이션으로 해달라"는 지적으로 바꿨다). */
  var fanOrder = [];
  function resetFanOrder() { fanOrder = names.map(function (_, i) { return i; }); }

  /* 화면 위치별 회전 각도. 부채꼴 펼침 각도는 카드 수(n)에만 좌우되고 어떤 이름이 그
     자리에 있는지와는 무관하므로, renderFan(최초 펼침)과 셔플 애니메이션(자리 교환)이
     이 함수 하나를 공유한다 — 따로 계산식을 두면 한쪽만 고치고 잊어버리기 쉽다. */
  function calcAngles(n) {
    var spread = Math.min(72, n * 9.5);   // 사람이 적으면 좁게, 많아지면 넓게
    var angles = [];
    for (var k = 0; k < n; k++) angles.push(n === 1 ? 0 : (-spread / 2 + spread * k / (n - 1)));
    return angles;
  }

  // 부채꼴 카드가 나타나는 타이밍(renderFan)이 쓰는 상수.
  // prefers-reduced-motion에서는 settlement.css가 .sc-card의 transition을 .01ms로 누른다.
  // 그 경우 500ms를 그대로 기다리면 카드가 이미 멈춘 뒤에도 한참 대기하게 되므로 짧게 쓴다.
  var REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CARD_ENTER_BASE = 50;                        // 첫 카드가 펼쳐지기 시작하는 지연(ms)
  var CARD_ENTER_STEP = REDUCED_MOTION ? 0 : 52;   // 카드 한 장마다 늘어나는 지연(ms)
  var CARD_ENTER_MS = REDUCED_MOTION ? 20 : 500;   // settlement.css .sc-card의 transition 시간과 일치

  // 셔플(카드 맞바꾸기) 타이밍. .sc-fan.is-shuffling .sc-card 의 transition 시간과 반드시
  // 일치시켜야 한다 — 이 값들로 "언제 다음 스텝을 시작할지"와 "언제 뽑기를 시작할지"를
  // 정하는데, CSS 쪽 시간이 다르면 애니메이션이 끝나지 않았는데 다음 단계가 시작돼 버린다.
  var SHUFFLE_MOVE_MS = REDUCED_MOTION ? 0 : 300;  // 카드 한 번 맞바꿀 때의 이동 시간
  var SHUFFLE_STEP_MS = REDUCED_MOTION ? 0 : 230;  // 다음 맞바꿈을 시작하기까지의 간격
                                                    // (MOVE보다 짧게 둬서 스텝끼리 살짝 겹치며 매끄럽게 이어진다)

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
    var angles = calcAngles(n);

    // fanOrder가 names와 길이가 안 맞으면(추가/삭제 직후 등) 안전하게 identity로 되돌린다.
    if (fanOrder.length !== n) resetFanOrder();

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

    // i = 화면 위치(왼쪽부터), fanOrder[i] = 그 자리에 보여줄 names 인덱스.
    // ⚠️ names.forEach가 아니라 위치(i) 기준으로 도는 이유 — 셔플 뒤에는 "몇 번째 자리에 누가
    // 있는지"가 이름 추가 순서와 달라지므로, 자리 인덱스를 축으로 삼아야 각도(--a)가 맞는 자리에 붙는다.
    for (var i = 0; i < n; i++) {
      var name = names[fanOrder[i]];
      var el = document.createElement("div");
      el.className = "sc-card";
      el.dataset.slot = String(i);          // 뽑기 로직이 "화면 몇 번째 자리"를 찾을 때 쓴다
      el.style.setProperty("--a", angles[i].toFixed(2) + "deg");
      el.style.zIndex = String(i + 1);
      buildCard(el, name, false);   // 부채꼴은 앞면만 — 이름을 DOM에 넣지 않는다(위 buildCard 주석)
      fanEl.appendChild(el);
      // 한 장씩 차례로 펼쳐지게 지연을 준다(트럼프 카드 펼치는 느낌).
      (function (elRef, idx) {
        setTimeout(function () { elRef.classList.add("is-in"); }, CARD_ENTER_BASE + idx * CARD_ENTER_STEP);
      })(el, i);
    }
  }

  function cards() { return fanEl.querySelectorAll(".sc-card"); }

  /* ── 카드 실제 맞바꾸기(셔플) ─────────────────────────────
     예전 방식(카드를 전부 지웠다가 다시 그리기)은 "사라졌다 다시 생기는 것"으로 보인다는
     지적을 받았다. 대신 지금은 화면의 두 카드가 서로 자리를 **실제로 이동**해서 맞바꾼다 —
     DOM 노드 자체는 그대로 있고, 각도(--a)와 z-index만 서로 교환한 뒤 CSS transition으로
     자연스럽게 미끄러져 자리를 바꾼다. 앞면이 전부 동일한 이미지라 이름표를 다시 그릴
     필요도 없다(뽑기 공정성상 부채꼴 카드에는 원래도 이름이 없다).

     swapPair(a, b): 화면상 a번째, b번째 자리의 카드를 서로 맞바꾼다.
       - fanOrder[a] <-> fanOrder[b] (실제 참가자 대응도 함께 바뀐다)
       - 두 엘리먼트의 --a(각도)와 z-index를 맞바꾼다
       - 살짝 위로 뜨는 상태(is-swap)를 짧게 얹어서 카드가 서로를 스쳐 지나가는 느낌을 준다 */
  function swapPair(a, b) {
    var t = fanOrder[a]; fanOrder[a] = fanOrder[b]; fanOrder[b] = t;

    var list = cards();
    var elA = null, elB = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].dataset.slot === String(a)) elA = list[i];
      if (list[i].dataset.slot === String(b)) elB = list[i];
    }
    if (!elA || !elB) return;

    var angleA = elA.style.getPropertyValue("--a");
    var angleB = elB.style.getPropertyValue("--a");
    var zA = elA.style.zIndex, zB = elB.style.zIndex;

    elA.style.setProperty("--a", angleB);
    elB.style.setProperty("--a", angleA);
    elA.style.zIndex = zB;
    elB.style.zIndex = zA;

    // dataset.slot도 함께 바꿔야 다음 swapPair 호출에서 "화면 a번째"를 다시 정확히 찾는다.
    elA.dataset.slot = String(b);
    elB.dataset.slot = String(a);

    elA.classList.add("is-swap");
    elB.classList.add("is-swap");
    setTimeout(function () {
      elA.classList.remove("is-swap");
      elB.classList.remove("is-swap");
    }, SHUFFLE_MOVE_MS);
  }

  /* 뽑기 전에 카드를 실제로 몇 차례 맞바꿔 뒤섞는 애니메이션.
     ⚠️ 왜 필요한가: 뽑히는 사람 자체는 이미 Math.random()으로 완전히 균등하다(실측 검증됨).
     하지만 화면상 카드 위치는 항상 참가자를 추가한 순서 그대로 고정돼 있어서, "이름 순서대로
     카드에 배정된 것처럼" 보이는 착시가 있었다(2026-08-25 지적). 카드를 실제로 맞바꾸면
     그 착시가 사라지고, 트럼프를 섞는 듀얼 셔플 같은 느낌도 더해진다.

     방식: 서로 다른 두 자리를 고른 무작위 쌍을 여러 번(카드 수에 비례) swapPair로 실행한다.
     매번 완전히 새로운 무작위 쌍을 고르므로(이전에 어떤 쌍을 섞었는지 기억하지 않는다),
     충분한 횟수를 반복하면 최종 배치는 통계적으로 균등하게 섞인다 — 그리고 어차피 최종
     승자는 이 배치와 무관하게 Math.random()으로 다시 뽑으므로, 셔플의 균등성 자체가
     공정성을 좌우하지는 않는다(순수히 "보는 재미 + 위치 고정 착시 제거" 목적). */
  function shuffleCards(onDone) {
    var n = names.length;
    if (n < 2) { onDone(); return; }

    // 카드가 많을수록 더 여러 번 섞는다. 최소 6번은 돌려야 "고작 한두 번 스쳤나" 싶은
    // 느낌이 안 든다.
    var rounds = Math.max(6, n * 2);
    var r = 0;

    (function step() {
      if (r >= rounds) { onDone(); return; }
      var a = Math.floor(Math.random() * n);
      var b = Math.floor(Math.random() * n);
      if (a === b) { b = (b + 1) % n; }   // 같은 자리를 고르면 옆자리로 밀어 항상 실제로 맞바뀌게 한다
      swapPair(a, b);
      r++;
      setTimeout(step, SHUFFLE_STEP_MS);
    })();
  }

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
    // drawing 중의 문구("카드를 섞고 있어요" → "뽑는 중이에요")는 shuffleThenDraw/startDraw가
    // 단계별로 직접 갱신한다. 여기서 획일적으로 "뽑는 중이에요"로 덮으면 섞는 단계 문구가
    // 표시될 틈도 없이 매 syncUI() 호출마다 지워진다.
    if (noteEl && !drawing) {
      noteEl.textContent = names.length < MIN ? MIN + "명 이상 담아주세요"
        : names.length + "명 중 한 명이 뽑혀요";
    }
  }

  // 참가자 목록이 바뀔 때마다 부른다(추가/삭제/전체비우기). fanOrder를 여기서 리셋해서
  // 편집 직후에는 카드 위치가 항상 최신 편집 순서를 반영하게 한다 — 셔플은 뽑기 시작
  // 버튼을 눌렀을 때만 일어난다.
  function refresh() { resetFanOrder(); renderNames(); renderFan(); syncUI(); }

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
  // idx는 **화면 자리 인덱스**다. swapPair가 각도/z-index만 바꾸고 DOM 순서(=cards()가 반환하는
  // 순서)는 그대로 두므로, "화면 몇 번째 자리인가"는 always dataset.slot으로 찾아야 한다.
  function markUp(idx) {
    var list = cards();
    for (var i = 0; i < list.length; i++) {
      list[i].classList.toggle("is-up", list[i].dataset.slot === String(idx));
    }
  }

  function shuffleThenDraw() {
    shuffleCards(function () {
      if (noteEl) noteEl.textContent = "뽑는 중이에요";
      startDraw();
    });
  }

  /* ── 뽑기 ─────────────────────────────────────────────────
     카드를 한 장씩 훑으며 튀어 오르게 하고(올라갔다 내려갔다), 간격을 점점 늘려
     감속시킨 뒤 마지막에 당첨 카드에서 멈춘다.
     총 스텝을 laps*n + winner + 1로 잡으면 마지막 스텝의 인덱스가 정확히 winner가 된다.
     ⚠️ winner는 **화면 자리 인덱스**다. shuffleThenDraw가 이미 자리를 섞어 놨으므로,
     실제로 뽑히는 사람은 fanOrder[winner]다(flyOut에서 이 대응으로 이름을 가져온다). */
  function startDraw() {
    var n = names.length;
    if (n < MIN) { drawing = false; syncUI(); return; }

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

  drawBtn.addEventListener("click", function () {
    if (drawing || names.length < MIN) return;
    drawing = true;
    flipped = false;
    syncUI();
    if (noteEl) noteEl.textContent = "카드를 섞고 있어요";
    shuffleThenDraw();
  });

  /* ── 뽑힌 카드를 중앙으로 ─────────────────────────────────
     오버레이의 카드 자리(.sc-flier)는 flex로 이미 중앙에 있다. 그래서 "부채꼴에서의
     위치/각도/배율"을 시작값으로 역산해 인라인 transform에 넣고, 다음 프레임에 그것을
     비우면 CSS 정지 상태로 전환되면서 제자리로 날아온다(FLIP 기법).

     ⚠️ CSS 정지 상태에 rotate(90deg)가 들어 있어서, 이 전환만으로 **카드가 세로에서
     가로로 돌아 눕는다.** 즉 회전은 등장 연출의 일부이고 별도 코드가 없다.
     ⚠️ 이름은 아직 보이지 않는다 — 가로로 누운 앞면이 보이고, 사용자가 눌러야 뒷면이 나온다. */
  function flyOut(i) {
    // i는 화면 자리 인덱스다. swapPair가 DOM 순서를 바꾸지 않으므로 dataset.slot으로 찾는다
    // (markUp과 같은 이유).
    var srcEl = null;
    var list = cards();
    for (var k = 0; k < list.length; k++) {
      if (list[k].dataset.slot === String(i)) { srcEl = list[k]; break; }
    }
    if (!srcEl) { drawing = false; syncUI(); return; }
    var name = names[fanOrder[i]];   // i는 화면 자리 인덱스 — fanOrder로 실제 참가자를 찾는다

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
