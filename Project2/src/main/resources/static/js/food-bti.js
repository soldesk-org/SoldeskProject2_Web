let questions = [];
let answers = [];
let currentIndex = 0;

function showScreen(id) {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("questionScreen").classList.add("hidden");
    document.getElementById("resultScreen").classList.add("hidden");

    document.getElementById(id).classList.remove("hidden");
}

function startTest() {
    fetch("/api/food-bti/questions")
        .then(response => response.json())
        .then(data => {
            questions = data;
            answers = [];
            currentIndex = 0;

            showScreen("questionScreen");
            renderQuestion();
        })
        .catch(() => {
            alert("질문을 불러오지 못했습니다.");
        });
}

function renderQuestion() {
    const question = questions[currentIndex];

    document.getElementById("progressText").innerText =
        (currentIndex + 1) + " / " + questions.length;

    document.getElementById("progressFill").style.width =
        ((currentIndex + 1) / questions.length * 100) + "%";

    document.getElementById("questionText").innerText = question.question;

    const choiceArea = document.getElementById("choiceArea");
    choiceArea.innerHTML = "";

    question.choices.forEach(choice => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "choice-btn";
        button.innerText = choice.text;

        button.onclick = function () {
            selectAnswer(choice.score);
        };

        choiceArea.appendChild(button);
    });
}

function selectAnswer(score) {
    answers.push(score);
    currentIndex++;

    if (currentIndex >= questions.length) {
        submitResult();
    } else {
        renderQuestion();
    }
}

function submitResult() {
    fetch("/api/food-bti/result", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            answer: answers
        })
    })
        .then(response => response.json())
        .then(result => {
            renderResult(result);
        })
        .catch(() => {
            alert("결과를 불러오지 못했습니다.");
        });
}

function renderResult(result) {
    showScreen("resultScreen");

    document.getElementById("resultType").innerText = result.resultType;
    document.getElementById("resultName").innerText = result.resultName;
    document.getElementById("resultText").innerText = result.resultText;

    const foodList = document.getElementById("foodList");
    foodList.innerHTML = "";

    result.food.forEach(food => {
        const span = document.createElement("span");
        span.className = "food-item";
        span.innerText = food;
        foodList.appendChild(span);
    });
}

function restartTest() {
    showScreen("startScreen");
}

function cancelTest() {
    location.href = "/";
}

function closeResult() {
    location.href = "/";
}