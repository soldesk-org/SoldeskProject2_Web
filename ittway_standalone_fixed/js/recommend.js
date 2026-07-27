
// =========================================
// 추천 결과 샘플 데이터
// =========================================
const sampleResults = [
    {
        id: 1,
        name: "프렌치 다이닝, 라 메종",
        tags: ["분위기 좋은", "데이트", "조용한", "고급스러운"],
        description:
            "조용하고 분위기 좋은 공간에서 특별한 프렌치 요리를 즐길 수 있는 곳입니다.",
        location: "강남구 역삼동",
        walk: "도보 8분",
        favorite: false
    },
    {
        id: 2,
        name: "스시 오마카세, 스시하루",
        tags: ["데이트", "조용한", "깔끔한", "프리미엄"],
        description:
            "신선한 재료로 정성스럽게 준비하는 오마카세 스시 전문점입니다.",
        location: "서초구 서초동",
        walk: "도보 6분",
        favorite: false
    },
    {
        id: 3,
        name: "브런치 카페, 모닝테이블",
        tags: ["브런치", "분위기 좋은", "데이트", "사진이 잘 나오는"],
        description:
            "따뜻한 햇살이 들어오는 공간에서 여유로운 브런치를 즐길 수 있어요.",
        location: "강남구 청담동",
        walk: "도보 10분",
        favorite: false
    },
    {
        id: 4,
        name: "이탈리안 레스토랑, 오스테리아",
        tags: ["데이트", "분위기 좋은", "파스타 맛집", "와인"],
        description:
            "정통 이탈리안 요리와 다양한 와인을 함께 즐길 수 있는 레스토랑입니다.",
        location: "마포구 합정동",
        walk: "도보 7분",
        favorite: false
    },
    {
        id: 5,
        name: "히든 바, 바 오르",
        tags: ["조용한", "분위기 좋은", "위스키", "칵테일"],
        description:
            "아늑한 분위기에서 나만의 시간을 보낼 수 있는 감성적인 바입니다.",
        location: "용산구 한남동",
        walk: "도보 9분",
        favorite: false
    }
];


// =========================================
// 기본 DOM 요소
// =========================================
const resultList = document.querySelector("#resultList");
const resultCount = document.querySelector("#resultCount");
const searchForm = document.querySelector("#recommendSearchForm");
const queryInput = document.querySelector("#recommendQuery");


// =========================================
// HTML 특수문자 처리
// =========================================
function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================================
// 추천 결과 출력
// =========================================
function renderResults(results) {
    resultCount.textContent = `총 ${results.length}개의 결과`;

    resultList.innerHTML = results.length
        ? results
              .map(
                  (place, index) => `
                    <article
                        class="result-card"
                        data-place-id="${esc(place.id)}"
                    >
                        <div class="result-rank">
                            ${index + 1}
                        </div>

                        <div class="result-content">
                            <h2>${esc(place.name)}</h2>

                            <div class="result-tags">
                                ${(place.tags ?? [])
                                    .map(
                                        tag => `
                                            <span class="result-tag">
                                                ${esc(tag)}
                                            </span>
                                        `
                                    )
                                    .join("")}
                            </div>

                            <p class="result-description">
                                ${esc(place.description)}
                            </p>

                            <div class="result-meta">
                                ${esc(place.location)}
                                　·　
                                ${esc(place.walk)}
                            </div>
                        </div>

                        <button
                            type="button"
                            class="favorite-button ${
                                place.favorite ? "active" : ""
                            }"
                            aria-label="즐겨찾기"
                            data-favorite-id="${esc(place.id)}"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.8l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.4 1-1a5.5 5.5 0 0 0 0-7.8z"></path>
                            </svg>
                        </button>
                    </article>
                `
              )
              .join("")
        : `
            <div class="empty-result">
                조건에 맞는 추천 결과가 없습니다.
            </div>
        `;
}


// =========================================
// 현재는 샘플 데이터 검색
// 나중에 AI/FastAPI 호출로 교체
// =========================================
async function searchRecommendations(query) {
    /*
     * 현재는 실제 AI API 연결 전 데모 상태입니다.
     * 어떤 검색어를 입력해도 샘플 추천 결과를 반환합니다.
     * 추후 FastAPI 연결 시 이 함수만 API 호출 코드로 교체하면 됩니다.
     */
    return sampleResults;
}


// =========================================
// 후속 추천 팝업 목록
// =========================================
const popupRecommendations = [
    {
        type: "cafe",
        icon: "☕",
        title: "식사 후 갈 카페도 AI가 추천해드릴까요?",
        searchQuery: "카페"
    },
    {
        type: "walk",
        icon: "🚶",
        title: "식사 후 산책도 AI가 추천해드릴까요?",
        searchQuery: "산책"
    }
];


// =========================================
// 팝업 DOM 요소
// =========================================
const recommendPopup = document.querySelector("#recommendPopup");
const popupMessage = document.querySelector("#popupMessage");
const popupIcon = document.querySelector("#popupIcon");
const popupYes = document.querySelector("#popupYes");
const popupNo = document.querySelector("#popupNo");
const popupClose = document.querySelector("#popupClose");

const feedbackLike = document.querySelector("#feedbackLike");
const feedbackDislike = document.querySelector("#feedbackDislike");
const feedbackMessage = document.querySelector("#feedbackMessage");


// 현재 선택된 팝업 데이터
let selectedPopup = null;

// 팝업을 한 번만 표시하기 위한 상태
let popupShown = false;

// 후속 추천 검색인지 확인
let isFollowupSearch = false;

// 사용자가 선택한 평가
let selectedFeedback = null;


// =========================================
// 평가 UI 초기화
// =========================================
function resetFeedbackUI() {
    selectedFeedback = null;

    feedbackLike?.classList.remove("active");
    feedbackDislike?.classList.remove("active");

    if (feedbackMessage) {
        feedbackMessage.textContent = "";
    }
}


// =========================================
// 랜덤 팝업 열기
// =========================================
function openRandomRecommendPopup() {
    if (!recommendPopup) {
        return;
    }

    const randomIndex = Math.floor(
        Math.random() * popupRecommendations.length
    );

    selectedPopup = popupRecommendations[randomIndex];

    popupMessage.textContent = selectedPopup.title;
    popupIcon.textContent = selectedPopup.icon;

    resetFeedbackUI();

    recommendPopup.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}


// =========================================
// 팝업 닫기
// =========================================
function closeRecommendPopup() {
    if (!recommendPopup) {
        return;
    }

    recommendPopup.classList.add("hidden");
    document.body.style.overflow = "";
}


// =========================================
// 검색 폼 제출
// =========================================
searchForm.addEventListener("submit", async event => {
    event.preventDefault();

    const query = queryInput.value.trim();
    const results = await searchRecommendations(query);

    renderResults(results);

    /*
     * 일반 추천 결과가 존재하고,
     * 아직 팝업을 표시하지 않았으며,
     * 후속 추천 검색이 아닐 때만 표시
     */
    if (
        results.length > 0 &&
        !popupShown &&
        !isFollowupSearch
    ) {
        popupShown = true;

        setTimeout(() => {
            openRandomRecommendPopup();
        }, 800);
    }

    isFollowupSearch = false;
});


// =========================================
// 평가 버튼
// =========================================
feedbackLike?.addEventListener("click", () => {
    selectedFeedback = "like";

    feedbackLike.classList.add("active");
    feedbackDislike?.classList.remove("active");

    feedbackMessage.textContent =
        "좋은 평가 감사합니다! 다음 추천에 반영할게요.";

    console.log("AI 추천 평가:", selectedFeedback);
});

feedbackDislike?.addEventListener("click", () => {
    selectedFeedback = "dislike";

    feedbackDislike.classList.add("active");
    feedbackLike?.classList.remove("active");

    feedbackMessage.textContent =
        "의견 감사합니다. 더 나은 추천을 준비할게요.";

    console.log("AI 추천 평가:", selectedFeedback);
});


// =========================================
// 추천해주세요 버튼
// =========================================
popupYes?.addEventListener("click", () => {
    if (!selectedPopup) {
        return;
    }

    isFollowupSearch = true;
    queryInput.value = selectedPopup.searchQuery;

    closeRecommendPopup();

    /*
     * 현재는 샘플 검색을 실행합니다.
     * 나중에는 여기서 카페/산책 추천 API를 호출하면 됩니다.
     */
    searchForm.requestSubmit();
});


// =========================================
// 괜찮아요 버튼
// =========================================
popupNo?.addEventListener("click", closeRecommendPopup);


// =========================================
// 닫기 버튼
// =========================================
popupClose?.addEventListener("click", closeRecommendPopup);


// =========================================
// 바깥 영역 클릭 시 닫기
// =========================================
recommendPopup?.addEventListener("click", event => {
    if (event.target === recommendPopup) {
        closeRecommendPopup();
    }
});


// =========================================
// ESC 키로 닫기
// =========================================
document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        recommendPopup &&
        !recommendPopup.classList.contains("hidden")
    ) {
        closeRecommendPopup();
    }
});


// =========================================
// 결과 카드 및 즐겨찾기 클릭
// =========================================
resultList.addEventListener("click", event => {
    const favoriteButton =
        event.target.closest(".favorite-button");

    if (favoriteButton) {
        event.stopPropagation();
        favoriteButton.classList.toggle("active");
        return;
    }

    const card = event.target.closest(".result-card");

    if (card) {
        console.log(
            "상세페이지 이동 예정:",
            card.dataset.placeId
        );
    }
});


// =========================================
// 최초 화면 출력
// 처음 로딩할 때는 팝업이 뜨지 않음
// =========================================
renderResults(sampleResults);
