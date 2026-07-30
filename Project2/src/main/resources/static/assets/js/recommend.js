(function () {
  var DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 }; // 강남역

  var input = document.getElementById("recommend-input");
  var searchBtn = document.getElementById("recommend-search-btn");
  var resultsList = document.getElementById("results-list");
  var resultsCount = document.getElementById("results-count");

  var modal = document.getElementById("ai-eval-modal");
  var modalIcon = document.getElementById("modal-icon");
  var modalTitle = document.getElementById("modal-title");
  var feedbackButtons = document.getElementById("feedback-buttons");
  var feedbackLoginHint = document.getElementById("feedback-login-hint");
  var upBtn = document.getElementById("feedback-up");
  var downBtn = document.getElementById("feedback-down");
  var followupPrompt = document.getElementById("followup-prompt");
  var followupResults = document.getElementById("followup-results");
  var continueBtn = document.getElementById("modal-continue");
  var closeBtn = document.getElementById("modal-close");
  var xBtn = document.getElementById("modal-x");

  var lastHistoryId = null;
  var lastFeedback = null;
  var feedbackLocked = false;
  var anchorPlace = null;
  var followupVariant = "CAFE";
  var FOLLOWUP_LABEL = { CAFE: "카페", PARK: "공원" };

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderFeedbackButtons() {
    var disabled = feedbackLocked || !lastHistoryId;
    upBtn.disabled = disabled;
    downBtn.disabled = disabled;
    upBtn.className = "flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left transition-colors " +
      (lastFeedback === true ? "border-[#ff6b00] bg-[#fff7f2]" : "border-[#dfe2e6] bg-white hover:bg-[#fafbfc]") +
      (feedbackLocked && lastFeedback !== true ? " opacity-40" : "");
    downBtn.className = "flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left transition-colors " +
      (lastFeedback === false ? "border-[#ff6b00] bg-[#fff7f2]" : "border-[#dfe2e6] bg-white hover:bg-[#fafbfc]") +
      (feedbackLocked && lastFeedback !== false ? " opacity-40" : "");
  }

  function submitFeedback(wasHelpful) {
    if (!lastHistoryId || feedbackLocked) return;
    lastFeedback = wasHelpful;
    feedbackLocked = true;
    renderFeedbackButtons();
    Api.request("/api/recommendation/" + lastHistoryId + "/feedback", { method: "PATCH", body: { wasHelpful: wasHelpful } })
      .catch(function () {});
  }
  upBtn.addEventListener("click", function () { submitFeedback(true); });
  downBtn.addEventListener("click", function () { submitFeedback(false); });

  function placeTags(place) {
    if (place.matched_keywords && place.matched_keywords.length) return place.matched_keywords;
    if (place.category_name) return place.category_name.split(">").map(function (s) { return s.trim(); }).filter(Boolean).slice(-2);
    return [];
  }

  function distanceLabel(place) {
    var meters = place.distance ? Number(place.distance) : null;
    if (!meters) return "";
    if (meters < 1000) return Math.round(meters) + "m";
    return (meters / 1000).toFixed(1) + "km";
  }

  function renderResults(data) {
    var recommendations = data.recommendations || [];
    lastHistoryId = data.history_id || null;
    lastFeedback = null;

    resultsCount.textContent = "총 " + recommendations.length + "개의 결과";
    resultsList.innerHTML = "";

    if (recommendations.length === 0) {
      resultsList.innerHTML = '<p class="text-[16px] text-[#74777d]">추천 결과를 찾지 못했어요. 다른 표현으로 다시 시도해보세요.</p>';
      return;
    }

    anchorPlace = recommendations[0];

    recommendations.forEach(function (place, i) {
      var card = document.createElement("div");
      card.className = "flex items-start gap-4 rounded-[12px] border border-[#dfe2e6] bg-white p-5 transition-shadow hover:shadow-md";
      var tags = placeTags(place);
      var dist = distanceLabel(place);
      card.innerHTML =
        '<span class="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#fff4ec] text-[17px] font-bold text-[#ff6b00]">' + (i + 1) + "</span>" +
        '<div class="min-w-0 flex-1">' +
        '<h2 class="text-[22px] font-bold text-[#111]">' + escapeHtml(place.place_name) + "</h2>" +
        '<div class="mt-2 flex flex-wrap gap-2">' +
        tags.map(function (t) { return '<span class="rounded-full bg-[#f1f2f4] px-3 py-1 text-[14px] text-[#30343a]">' + escapeHtml(t) + "</span>"; }).join("") +
        "</div>" +
        (place.reason ? '<p class="mt-3 text-[16px] text-[#30343a]">' + escapeHtml(place.reason) + "</p>" : "") +
        '<p class="mt-2 text-[14px] text-[#555b63]">' + escapeHtml(place.road_address_name || place.address_name || "") + (dist ? "　·　" + dist : "") + "</p>" +
        "</div>" +
        '<button data-fav class="shrink-0 p-1 text-[24px] text-[#fd6d4a]">♡</button>';

      card.querySelector("[data-fav]").addEventListener("click", function (e) {
        e.stopPropagation();
        if (!Api.isLoggedIn()) { window.location.href = "login"; return; }
        var btn = e.currentTarget;
        var favored = btn.textContent === "♥";
        Api.request("/api/restaurants/" + encodeURIComponent(place.place_id) + "/favorite", {
          method: favored ? "DELETE" : "POST",
          body: { name: place.place_name, address: place.address_name, roadAddress: place.road_address_name, latitude: Number(place.y), longitude: Number(place.x) },
        })
          .then(function (res) { btn.textContent = res.favorite ? "♥" : "♡"; })
          .catch(function () {});
      });

      resultsList.appendChild(card);
    });

    openFeedbackModal();
  }

  function openFeedbackModal() {
    followupVariant = Math.random() < 0.5 ? "CAFE" : "PARK";
    modalIcon.textContent = followupVariant === "CAFE" ? "☕" : "🌳";
    modalTitle.textContent = followupVariant === "CAFE"
      ? "식사 후 갈 카페도 AI가 추천해드릴까요?"
      : "식사 후 산책할 공원도 AI가 추천해드릴까요?";

    feedbackLocked = false;
    feedbackButtons.style.display = lastHistoryId ? "" : "none";
    feedbackLoginHint.style.display = lastHistoryId ? "none" : "";
    renderFeedbackButtons();

    followupPrompt.style.display = "";
    followupResults.style.display = "none";
    followupResults.innerHTML = "";

    modal.style.display = "flex";
  }

  function followupDistanceLabel(m) {
    if (m == null) return "";
    return m < 1000 ? Math.round(m) + "m" : (m / 1000).toFixed(1) + "km";
  }

  function renderFollowupResults(data) {
    followupPrompt.style.display = "none";
    followupResults.style.display = "";
    var places = data.places || [];
    var label = FOLLOWUP_LABEL[followupVariant] || "장소";

    if (places.length === 0) {
      followupResults.innerHTML = '<p class="text-[15px] text-[#74777d]">근처에서 갈 만한 ' + escapeHtml(label) + '을 찾지 못했어요.</p>';
      return;
    }

    followupResults.innerHTML =
      '<p class="text-[15px] font-semibold text-[#25374b]">근처 ' + escapeHtml(label) + " " + places.length + '곳을 찾았어요</p>' +
      '<div class="mt-3 flex flex-col gap-2">' +
      places.map(function (p, i) {
        return '<div class="flex items-center gap-3 rounded-[10px] border border-[#eceef1] bg-white p-3 transition-shadow hover:shadow-sm">' +
          '<span class="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#fff4ec] text-[13px] font-bold text-[#ff6b00]">' + (i + 1) + "</span>" +
          '<div class="min-w-0 flex-1">' +
          '<p class="truncate text-[15px] font-semibold text-[#25374b]">' + escapeHtml(p.placeName) + "</p>" +
          '<p class="truncate text-[13px] text-[#8a8f98]">' + escapeHtml(p.roadAddressName || p.addressName || "") + "</p>" +
          "</div>" +
          (p.distanceMeters != null ? '<span class="shrink-0 text-[13px] font-semibold text-[#ff6b00]">' + followupDistanceLabel(p.distanceMeters) + "</span>" : "") +
          "</div>";
      }).join("") +
      "</div>";
  }

  function followupLoadingRow() {
    return '<div class="flex items-center gap-3 rounded-[10px] border border-[#eceef1] bg-white p-3">' +
      '<span class="size-[26px] shrink-0 animate-pulse rounded-full bg-[#f1f2f4]"></span>' +
      '<div class="min-w-0 flex-1">' +
      '<div class="h-[15px] w-2/3 animate-pulse rounded-[5px] bg-[#f1f2f4]"></div>' +
      '<div class="mt-1.5 h-[13px] w-1/2 animate-pulse rounded-[5px] bg-[#f1f2f4]"></div>' +
      "</div></div>";
  }

  continueBtn.addEventListener("click", function () {
    if (!anchorPlace) return;
    followupResults.style.display = "";
    followupPrompt.style.display = "none";
    followupResults.innerHTML =
      '<div class="mb-1 flex items-center gap-2 text-[14px] font-semibold text-[#ff6b00]">' +
      '<span class="relative flex size-[14px]">' +
      '<span class="absolute inline-flex size-full animate-ping rounded-full bg-[#ff6b00] opacity-40"></span>' +
      '<span class="relative inline-flex size-[14px] rounded-full bg-[#ff6b00]"></span>' +
      "</span>주변을 찾고 있어요</div>" +
      '<div class="flex flex-col gap-2">' + followupLoadingRow() + followupLoadingRow() + followupLoadingRow() + "</div>";
    Api.request("/api/recommendation/nearby-course", {
      method: "POST",
      auth: false,
      body: { type: followupVariant, anchorName: anchorPlace.place_name, x: Number(anchorPlace.x), y: Number(anchorPlace.y) },
    })
      .then(renderFollowupResults)
      .catch(function (err) {
        followupResults.innerHTML = '<p class="text-[15px] text-red-500">' + escapeHtml(err.message || "추천을 가져오지 못했습니다.") + "</p>";
      });
  });

  function closeModal() { modal.style.display = "none"; }
  closeBtn.addEventListener("click", closeModal);
  xBtn.addEventListener("click", closeModal);

  function loadingCardSkeleton() {
    return '<div class="flex items-start gap-4 rounded-[12px] border border-[#eceef1] bg-white p-5">' +
      '<span class="size-[34px] shrink-0 animate-pulse rounded-full bg-[#f1f2f4]"></span>' +
      '<div class="min-w-0 flex-1">' +
      '<div class="h-[22px] w-2/5 animate-pulse rounded-[6px] bg-[#f1f2f4]"></div>' +
      '<div class="mt-3 flex gap-2">' +
      '<span class="h-[24px] w-[64px] animate-pulse rounded-full bg-[#f1f2f4]"></span>' +
      '<span class="h-[24px] w-[80px] animate-pulse rounded-full bg-[#f1f2f4]"></span>' +
      '<span class="h-[24px] w-[56px] animate-pulse rounded-full bg-[#f1f2f4]"></span>' +
      '</div>' +
      '<div class="mt-3 h-[16px] w-full animate-pulse rounded-[6px] bg-[#f1f2f4]"></div>' +
      '<div class="mt-2 h-[16px] w-3/5 animate-pulse rounded-[6px] bg-[#f1f2f4]"></div>' +
      '</div>' +
      '</div>';
  }

  function renderLoadingState() {
    resultsCount.textContent = "";
    resultsList.innerHTML =
      '<div class="mb-1 flex items-center gap-2 text-[15px] font-semibold text-[#ff6b00]">' +
      '<span class="relative flex size-[16px]">' +
      '<span class="absolute inline-flex size-full animate-ping rounded-full bg-[#ff6b00] opacity-40"></span>' +
      '<span class="relative inline-flex size-[16px] rounded-full bg-[#ff6b00]"></span>' +
      '</span>' +
      'AI가 취향을 분석하고 있어요' +
      '</div>' +
      loadingCardSkeleton() + loadingCardSkeleton() + loadingCardSkeleton();
  }

  function runSearch() {
    var text = input.value.trim();
    if (!text) return;
    renderLoadingState();

    function query(center) {
      Api.request("/api/recommendation/query", {
        method: "POST",
        body: { text: text, x: center.lng, y: center.lat, radius: 3000, size: 10 },
      })
        .then(renderResults)
        .catch(function (err) {
          resultsList.innerHTML = '<p class="text-[16px] text-red-500">' + escapeHtml(err.message || "추천 요청에 실패했습니다.") + "</p>";
        });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) { query({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        function () { query(DEFAULT_CENTER); }
      );
    } else {
      query(DEFAULT_CENTER);
    }
  }

  searchBtn.addEventListener("click", runSearch);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") runSearch(); });
})();
