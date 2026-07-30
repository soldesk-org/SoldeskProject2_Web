(function () {
  var quizView = document.getElementById("quiz-view");
  var resultView = document.getElementById("result-view");
  var progressLabel = document.getElementById("progress-label");
  var progressBar = document.getElementById("progress-bar");
  var questionText = document.getElementById("question-text");
  var optionA = document.getElementById("option-a");
  var optionB = document.getElementById("option-b");

  var resultCode = document.getElementById("result-code");
  var resultTitle = document.getElementById("result-title");
  var resultDesc = document.getElementById("result-desc");
  var resultFoods = document.getElementById("result-foods");
  var resetBtn = document.getElementById("reset-btn");
  var closeBtn = document.getElementById("close-btn");

  var questions = [];
  var step = 0;
  var answers = [];

  function renderQuestion() {
    var q = questions[step];
    progressLabel.textContent = (step + 1) + " / " + questions.length;
    progressBar.style.width = ((step + 1) / questions.length) * 100 + "%";
    questionText.textContent = "Q. " + q.question;
    optionA.textContent = "A. " + q.choiceA.text;
    optionB.textContent = "B. " + q.choiceB.text;
  }

  function renderResult(result) {
    resultCode.textContent = result.resultType;
    resultTitle.textContent = result.resultName;
    resultDesc.textContent = result.resultText;
    resultFoods.innerHTML = "";
    (result.food || []).forEach(function (f) {
      var span = document.createElement("span");
      span.className = "rounded-full bg-gradient-to-r from-[#fea255] to-[#fd6d4a] px-6 py-2 text-[20px] font-semibold text-white";
      span.textContent = f;
      resultFoods.appendChild(span);
    });
    quizView.style.display = "none";
    resultView.style.display = "";
  }

  function submitAnswers() {
    Api.request("/api/food-bti/result", { method: "POST", body: { answers: answers } })
      .then(renderResult)
      .catch(function () {
        questionText.textContent = "결과를 불러오지 못했습니다. 다시 시도해주세요.";
      });
  }

  function choose(letter) {
    answers[step] = letter;
    if (step + 1 < questions.length) {
      step += 1;
      renderQuestion();
    } else {
      submitAnswers();
    }
  }

  optionA.addEventListener("click", function () { choose(questions[step].choiceA.score); });
  optionB.addEventListener("click", function () { choose(questions[step].choiceB.score); });

  resetBtn.addEventListener("click", function () {
    step = 0;
    answers = [];
    quizView.style.display = "";
    resultView.style.display = "none";
    renderQuestion();
  });

  closeBtn.addEventListener("click", function () {
    window.location.href = "mypage";
  });

  Api.request("/api/food-bti/questions", { auth: false })
    .then(function (data) {
      questions = data;
      renderQuestion();
    })
    .catch(function () {
      questionText.textContent = "질문을 불러오지 못했습니다.";
    });
})();
