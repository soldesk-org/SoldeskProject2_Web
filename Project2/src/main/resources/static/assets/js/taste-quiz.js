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
    Api.request("/api/food-bti/result", { method: "POST", auth: Api.isLoggedIn(), body: { answers: answers } })
      .then(renderResult)
      .catch(function (err) {
        Eatty.toast(err.message || "결과 계산에 실패했습니다.", "error");
      });
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
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(function (err) {
      Eatty.toast(err.message || "문항을 불러오지 못했습니다.", "error");
    });
  });

  document.getElementById("quizOptionList").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-choice-score]");
    if (!btn) return;
    answers[idx] = btn.getAttribute("data-choice-score");
    this.querySelectorAll(".q-option").forEach(function (b) {
      b.classList.toggle("is-selected", b === btn);
      b.setAttribute("aria-checked", b === btn ? "true" : "false");
    });
    setTimeout(next, 260);
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
