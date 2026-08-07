(function () {
  var AXIS_LABEL = {
    l: "담백한 맛", s: "자극적인 맛",
    f: "익숙한 음식", n: "새로운 음식",
    a: "혼자 먹기", t: "함께 먹기",
    p: "계획적 선택", i: "즉흥적 선택",
  };
  var AXIS_PAIRS = [["l", "s"], ["f", "n"], ["a", "t"], ["p", "i"]];

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
    foodList.innerHTML = (data.food || []).map(function (f) {
      return '<div class="e-card e-card-flat overflow-hidden">' +
        '<div class="e-ratio-4-3 e-img-ph"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg></div>' +
        '<div class="p-3"><p class="text-[13.5px] font-extrabold text-[var(--ink-900)]">' + f + '</p></div></div>';
    }).join("");

    var axisList = document.getElementById("resultAxisList");
    var score = data.score;
    axisList.innerHTML = AXIS_PAIRS.map(function (pair) {
      var left = score[pair[0]], right = score[pair[1]];
      var total = left + right || 1;
      var pct = Math.round((left / total) * 100);
      // 2026-08-06 추가 - 한쪽으로 전부(예: 0:3) 선택하면 pct가 0/100이 되어 막대가 아예 안 채워진
      // 것처럼 보였다("바가 안 채워진다" 리포트). 어느 쪽이 우세한지는 항상 보이도록 최소/최대치를 둔다.
      pct = Math.max(6, Math.min(94, pct));
      return '<div class="axis-row">' +
        '<span class="axis-label ' + (left >= right ? "axis-label--on" : "axis-label--off") + ' text-right">' + AXIS_LABEL[pair[0]] + '</span>' +
        '<span class="axis-bar"><span class="axis-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="axis-label ' + (right > left ? "axis-label--on" : "axis-label--off") + '">' + AXIS_LABEL[pair[1]] + '</span>' +
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

  document.getElementById("retakeQuizBtn").addEventListener("click", function () {
    result.hidden = true;
    intro.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.getElementById("shareResultBtn").addEventListener("click", function () {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(function () {
        Eatty.toast("결과 링크를 복사했습니다.", "success");
      });
    }
  });
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
