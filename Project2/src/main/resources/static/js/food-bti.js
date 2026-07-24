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
        .then(function(response) {
            if (!response.ok) {
                throw new Error("\uc9c8\ubb38\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.");
            }
            return response.json();
        })
        .then(function(data) {
            questions = data;
            answers = [];
            currentIndex = 0;

            if (!Array.isArray(questions) || questions.length === 0) {
                alert("\ub4f1\ub85d\ub41c \uc9c8\ubb38\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.");
                return;
            }

            showScreen("questionScreen");
            renderQuestion();
        })
        .catch(function(error) {
            alert(error.message);
        });
}

function getChoices(question) {
    if (Array.isArray(question.choices)) {
        return question.choices;
    }

    return [question.choiceA, question.choiceB].filter(function(choice) {
        return choice && choice.text && choice.score;
    });
}

function renderQuestion() {
    const question = questions[currentIndex];
    const choices = getChoices(question);

    document.getElementById("progressText").innerText =
        (currentIndex + 1) + " / " + questions.length;

    document.getElementById("progressFill").style.width =
        ((currentIndex + 1) / questions.length * 100) + "%";

    document.getElementById("questionText").innerText = question.question;

    const choiceArea = document.getElementById("choiceArea");
    choiceArea.innerHTML = "";

    choices.forEach(function(choice, index) {
        const button = document.createElement("button");
        const prefix = index === 0 ? "A. " : "B. ";

        button.type = "button";
        button.className = "choice-btn";
        button.innerText = prefix + choice.text;

        button.onclick = function() {
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
        .then(function(response) {
            if (!response.ok) {
                throw new Error("\uacb0\uacfc\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.");
            }
            return response.json();
        })
        .then(function(result) {
            renderResult(result);
        })
        .catch(function(error) {
            alert(error.message);
        });
}

function renderResult(result) {
    showScreen("resultScreen");

    document.getElementById("resultType").innerText = result.resultType || "";
    document.getElementById("resultName").innerText = result.resultName || "";
    document.getElementById("resultText").innerText = result.resultText || "";

    const foodList = document.getElementById("foodList");
    foodList.innerHTML = "";

    (result.food || []).forEach(function(food) {
        const span = document.createElement("span");
        span.className = "food-item";
        span.innerText = food;
        foodList.appendChild(span);
    });
}

function restartTest() {
    answers = [];
    currentIndex = 0;
    showScreen("startScreen");
}

function cancelTest() {
    showScreen("startScreen");
}

function closeResult() {
    showScreen("startScreen");
}
