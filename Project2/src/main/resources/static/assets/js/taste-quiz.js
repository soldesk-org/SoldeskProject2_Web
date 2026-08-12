(function () {
  var AXIS_LABEL = {
    l: "담백한 맛", s: "자극적인 맛",
    f: "익숙한 음식", n: "새로운 음식",
    a: "혼자 먹기", t: "함께 먹기",
    p: "계획적 선택", i: "즉흥적 선택",
  };
  var AXIS_PAIRS = [["l", "s"], ["f", "n"], ["a", "t"], ["p", "i"]];

  // 성향 축 1개당 퍼센트 막대 1개(2026-08-12 추가) — 기존 앱 전역에서 쓰는 e-progress 컴포넌트 재사용
  // (business-mypage.js의 태그/별점 분포와 같은 톤).
  function axisBarRowHtml(label, pct) {
    return (
      '<div>' +
        '<div class="flex items-center justify-between mb-1">' +
          '<span class="t-xs font-bold text-[var(--ink-700)]">' + label + '</span>' +
          '<span class="t-xs t-num">' + pct + '%</span>' +
        '</div>' +
        // 2026-08-12 — "바가 얇다"는 피드백으로 기본 e-progress(8px)보다 더 두껍게(12px) 키운다.
        '<div class="e-progress" style="height:12px"><div class="e-progress-bar" style="width:' + pct + '%"></div></div>' +
      '</div>'
    );
  }

  // 음BTI 추천 메뉴 32종 실제 사진(2026-08-08 추가) — FoodBtiServiceImpl.FOOD_CANDIDATES와 이름이
  // 정확히 같아야 매칭된다. 없는 이름이면 기존처럼 플레이스홀더 아이콘으로 대체(fallback).
  var FOOD_IMAGE = {
    "칼국수": "assets/images/food-bti/kalguksu.jpg",
    "백반": "assets/images/food-bti/baekban.jpg",
    "국밥": "assets/images/food-bti/gukbap.jpg",
    "김밥": "assets/images/food-bti/gimbap.jpg",
    "샤브샤브": "assets/images/food-bti/shabushabu.jpg",
    "한정식": "assets/images/food-bti/hanjeongsik.jpg",
    "보쌈": "assets/images/food-bti/bossam.jpg",
    "만두전골": "assets/images/food-bti/mandujeongol.jpg",
    "포케": "assets/images/food-bti/poke.jpg",
    "오차즈케": "assets/images/food-bti/ochazuke.jpg",
    "쌀국수": "assets/images/food-bti/pho.jpg",
    "후무스볼": "assets/images/food-bti/hummus-bowl.jpg",
    "딤섬": "assets/images/food-bti/dimsum.jpg",
    "스페인 타파스": "assets/images/food-bti/spanish-tapas.jpg",
    "반쎄오": "assets/images/food-bti/banhxeo.jpg",
    "월남쌈": "assets/images/food-bti/springrolls.jpg",
    "제육덮밥": "assets/images/food-bti/jeyuk-deopbap.jpg",
    "매운 돈가스": "assets/images/food-bti/spicy-donkatsu.jpg",
    "떡볶이": "assets/images/food-bti/tteokbokki.jpg",
    "매운 라면": "assets/images/food-bti/spicy-ramen.jpg",
    "닭갈비": "assets/images/food-bti/dakgalbi.jpg",
    "부대찌개": "assets/images/food-bti/budae-jjigae.jpg",
    "삼겹살": "assets/images/food-bti/samgyeopsal.jpg",
    "곱창": "assets/images/food-bti/gopchang.jpg",
    "탄탄면": "assets/images/food-bti/dandan-noodles.jpg",
    "인도 커리": "assets/images/food-bti/indian-curry.jpg",
    "마라샹궈": "assets/images/food-bti/malaxiangguo.jpg",
    "매운 쌀국수": "assets/images/food-bti/spicy-pho.jpg",
    "마라탕": "assets/images/food-bti/malatang.jpg",
    "쭈꾸미": "assets/images/food-bti/jjukkumi.jpg",
    "닭발": "assets/images/food-bti/dakbal.jpg",
    "멕시칸 타코": "assets/images/food-bti/tacos.jpg",
  };
  var FOOD_PLACEHOLDER_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg>';

  var intro = document.getElementById("quizIntroSection");
  var play = document.getElementById("quizPlaySection");
  var result = document.getElementById("quizResultSection");

  var questions = [];
  var idx = 0;
  var answers = [];
  // 2026-08-06 추가 - 선택지를 연속으로 빠르게 클릭하면 각 클릭마다 setTimeout(next, 260)이 쌓여서,
  // 아직 화면이 넘어가기 전(260ms 이내)의 클릭이 다음 문항으로 잘못 넘어가 버리는 문제가 있었다(문항이
  // null 답변인 채로 건너뛰어짐 → 마지막에 제출하면 항상 INVALID_INPUT, 마지막 문항에서 반복 클릭하면
  // finish()가 매번 다시 실행돼 토스트가 여러 번 쌓였다). 전환 중에는 선택을 잠가서 막는다.
  var transitioning = false;
  var submitting = false;

  function loadQuestions() {
    return Api.request("/api/food-bti/questions", { auth: false }).then(function (data) {
      questions = data;
      answers = new Array(questions.length).fill(null);
    });
  }

  function render() {
    var q = questions[idx];
    document.getElementById("quizQuestionText").textContent = q.question;
    document.getElementById("quizCurrentNo").textContent = idx + 1;
    document.getElementById("quizTotalNo").textContent = questions.length;

    var pct = Math.round(((idx + 1) / questions.length) * 100);
    var bar = document.getElementById("quizProgressBar");
    bar.style.width = pct + "%";
    bar.setAttribute("aria-valuenow", pct);
    document.getElementById("quizProgressPercent").textContent = pct;

    var list = document.getElementById("quizOptionList");
    var choices = [q.choiceA, q.choiceB];
    var keys = ["A", "B"];
    list.innerHTML = choices.map(function (c, i) {
      var sel = answers[idx] === c.score;
      return '<button type="button" class="q-option' + (sel ? " is-selected" : "") + '" data-choice-score="' + c.score + '" role="radio" aria-checked="' + sel + '">' +
        '<span class="q-option-key">' + keys[i] + '</span>' +
        '<span class="q-option-text"></span></button>';
    }).join("");
    list.querySelectorAll(".q-option-text").forEach(function (el, i) { el.textContent = choices[i].text; });

    document.getElementById("quizPrevBtn").disabled = idx === 0;
  }

  function next() {
    if (idx < questions.length - 1) {
      idx++;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      finish();
    }
  }

  function finish() {
    if (submitting) return;
    submitting = true;
    Api.request("/api/food-bti/result", { method: "POST", auth: Api.isLoggedIn(), body: { answers: answers } })
      .then(renderResult)
      .catch(function (err) {
        Eatty.toast(err.message || "결과 계산에 실패했습니다.", "error");
      })
      .finally(function () { submitting = false; });
  }

  function renderResult(data) {
    play.hidden = true;
    result.hidden = false;

    document.getElementById("resultTypeCode").textContent = data.resultType;
    document.getElementById("resultTypeName").textContent = data.resultName;
    document.getElementById("resultTypeDesc").textContent = data.resultText;

    var foodList = document.getElementById("resultFoodList");
    // 2026-08-08 추가 — 메뉴 이름을 누르면 지도 탐색에서 그 메뉴로 바로 검색되게(explore.js가 읽는
    // ?q= 규약 재사용).
    foodList.innerHTML = (data.food || []).map(function (f) {
      var img = FOOD_IMAGE[f];
      var media = img
        ? '<div class="e-ratio-4-3"><img src="' + img + '" alt="' + f + '" class="size-full object-cover"></div>'
        : '<div class="e-ratio-4-3 e-img-ph">' + FOOD_PLACEHOLDER_SVG + '</div>';
      return '<a href="explore?q=' + encodeURIComponent(f) + '" class="e-card e-card-flat overflow-hidden block">' +
        media +
        '<div class="p-3"><p class="text-[13.5px] font-extrabold text-[var(--ink-900)]">' + f + '</p></div></a>';
    }).join("");

    var axisList = document.getElementById("resultAxisList");
    var score = data.score;
    // 2026-08-12 — 4쌍을 양방향 막대 하나로 합쳐서 보여주던 방식에서, 각 성향을 개별 퍼센트 막대로
    // 쪼개 8개로 보여주는 방식으로 변경(요청: "4개인데 8개로 해서 %를 보여주는 형식"). 실제 선택
    // 비율을 그대로 %로 보여준다(예전처럼 55~94%로 눌러 맞추지 않음).
    // 2026-08-12 재수정 — 8개가 쭉 이어붙어 있으니 원래 4쌍이었다는 게 안 드러나서, 2개씩(원래 쌍
    // 단위로) 묶고 그 아래에 옅은 구분선을 넣어 그룹을 나눴다(마지막 쌍은 구분선 없음).
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

    var saveStatus = document.getElementById("saveResultStatus");
    if (saveStatus) saveStatus.querySelector("p").textContent = data.saved ? "✅ 내 프로필에 저장되었습니다." : "결과가 저장되지 않았습니다.";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("quizStartBtn").addEventListener("click", function () {
    loadQuestions().then(function () {
      intro.hidden = true;
      play.hidden = false;
      idx = 0;
      transitioning = false;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(function (err) {
      Eatty.toast(err.message || "문항을 불러오지 못했습니다.", "error");
    });
  });

  document.getElementById("quizOptionList").addEventListener("click", function (e) {
    if (transitioning) return;
    var btn = e.target.closest("[data-choice-score]");
    if (!btn) return;
    transitioning = true;
    answers[idx] = btn.getAttribute("data-choice-score");
    this.querySelectorAll(".q-option").forEach(function (b) {
      b.classList.toggle("is-selected", b === btn);
      b.setAttribute("aria-checked", b === btn ? "true" : "false");
    });
    setTimeout(function () {
      transitioning = false;
      next();
    }, 260);
  });

  document.getElementById("quizPrevBtn").addEventListener("click", function () {
    if (idx > 0) { idx--; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });

  // "다시 테스트하기" 버튼은 2026-08-07에 화면에서 제거됨 — 나중에 다시 넣을 수 있게 핸들러는 남겨두되,
  // 버튼이 없을 때 null 참조로 스크립트 전체가 죽지 않도록 존재 여부를 확인한다.
  var retakeQuizBtn = document.getElementById("retakeQuizBtn");
  if (retakeQuizBtn) {
    retakeQuizBtn.addEventListener("click", function () {
      result.hidden = true;
      intro.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

})();

// 팝업(iframe)으로 열렸을 때(?embed=1) 자체 헤더/탭바를 숨긴다 — signup-info.html "테스트 보기" 모달.
  if (new URLSearchParams(location.search).get("embed") === "1") {
    document.body.classList.add("is-embed");
    document.addEventListener("DOMContentLoaded", function () {
      // embed 모드에서는 "나가기"가 iframe 내부를 index로 이동시키는 대신, 부모 창(signup-info.html)에
      // 닫아달라고 알린다 — 그대로 두면 팝업 안에 메인 페이지가 통째로 떠버리는 문제가 있었다.
      var exitLink = document.getElementById("quizExitConfirmLink");
      if (exitLink) {
        exitLink.addEventListener("click", function (e) {
          e.preventDefault();
          window.parent.postMessage({ type: "taste-quiz:close" }, window.location.origin);
        });
      }
    });
  }
