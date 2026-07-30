(function () {
  var POSITIVE_KEYWORDS = ["맛있어요", "재료가 신선해요", "양이 많아요", "가성비가 좋아요", "깨끗해요", "친절해요", "차분해요", "대기시간짧아요", "음식이빨리나와요", "가게가예뻐요"];
  var NEGATIVE_KEYWORDS = ["맛이 아쉬워요", "재료가 신선하지 않아요", "양이 적어요", "가격이 비싸요", "지저분해요", "불친절해요", "소란스러워요", "대기시간길어요", "음식이늦게나와요", "가게가부산스러워요"];

  if (!Api.requireLogin()) return;

  var input = document.getElementById("upload-input");
  var labelBtn = document.getElementById("upload-label-btn");
  var restaurantInput = document.getElementById("receipt-restaurant-input");
  var restaurantSearchBtn = document.getElementById("receipt-restaurant-search-btn");
  var restaurantResults = document.getElementById("receipt-restaurant-results");
  var selectedRestaurantEl = document.getElementById("receipt-selected-restaurant");
  var submitBtn = document.getElementById("receipt-submit-btn");
  var errorEl = document.getElementById("receipt-error");
  var resultEl = document.getElementById("receipt-result");

  var selectedRestaurant = null;

  (function preselectFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var restaurantId = params.get("restaurantId");
    if (!restaurantId) return;
    selectedRestaurant = {
      restaurantId: restaurantId,
      name: params.get("name") || "",
      address: params.get("address") || "",
      roadAddress: params.get("roadAddress") || "",
      latitude: params.get("latitude") ? Number(params.get("latitude")) : null,
      longitude: params.get("longitude") ? Number(params.get("longitude")) : null,
    };
    restaurantInput.value = selectedRestaurant.name;
    selectedRestaurantEl.textContent = "선택됨: " + selectedRestaurant.name;
  })();

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? "" : "none";
  }

  function updateSubmitState() {
    var ready = !!(selectedRestaurant && input.files && input.files[0]);
    submitBtn.disabled = !ready;
    submitBtn.style.opacity = ready ? "1" : "0.4";
  }

  document.getElementById("upload-btn").addEventListener("click", function () { input.click(); });
  labelBtn.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () {
    labelBtn.textContent = (input.files && input.files[0] && input.files[0].name) || "파일 선택";
    updateSubmitState();
  });

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  restaurantSearchBtn.addEventListener("click", function () {
    var kw = restaurantInput.value.trim();
    if (!kw) return;
    restaurantResults.innerHTML = '<p class="text-[14px] text-[#74777d]">검색 중...</p>';
    Api.request("/api/restaurants/search?keyword=" + encodeURIComponent(kw) + "&page=0&size=10", { auth: false })
      .then(function (data) {
        var list = data.restaurants || [];
        if (list.length === 0) { restaurantResults.innerHTML = '<p class="text-[14px] text-[#74777d]">검색 결과가 없습니다.</p>'; return; }
        restaurantResults.innerHTML = "";
        list.forEach(function (r) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "rounded-[6px] border border-[#eaeaea] px-3 py-2 text-left text-[14px] hover:bg-[#fafbfc]";
          btn.innerHTML = "<b>" + escapeHtml(r.name) + "</b> <span class='text-[#90959c]'>" + escapeHtml(r.roadAddress || r.address || "") + "</span>";
          btn.addEventListener("click", function () {
            selectedRestaurant = r;
            selectedRestaurantEl.textContent = "선택됨: " + r.name;
            restaurantResults.innerHTML = "";
            updateSubmitState();
          });
          restaurantResults.appendChild(btn);
        });
      })
      .catch(function () { restaurantResults.innerHTML = '<p class="text-[14px] text-red-500">검색에 실패했습니다.</p>'; });
  });

  function renderReviewForm(receiptId, restaurantId, restaurantName) {
    var wrap = document.createElement("div");
    wrap.className = "mt-4 border-t border-[#eaeaea] pt-4";
    wrap.innerHTML =
      '<h3 class="text-[18px] font-bold text-[#111]">리뷰 작성하기</h3>' +
      '<div id="review-rating" class="mt-2 flex gap-1 text-[26px]"></div>' +
      '<div id="review-keywords" class="mt-3 flex flex-wrap gap-2"></div>' +
      '<textarea id="review-content" placeholder="리뷰 내용을 입력해주세요. (선택)" class="mt-3 h-[80px] w-full rounded-[8px] border border-[#dfe2e6] p-3 text-[15px] outline-none"></textarea>' +
      '<p id="review-error" class="mt-2 text-[14px] text-red-500" style="display:none"></p>' +
      '<button id="review-submit-btn" class="mt-3 w-full rounded-[10px] bg-[#ff6b00] py-3 text-[16px] font-bold text-white">리뷰 등록</button>';
    resultEl.appendChild(wrap);

    var rating = 0;
    var keywords = [];
    var ratingEl = document.getElementById("review-rating");
    for (var i = 1; i <= 5; i++) {
      (function (n) {
        var star = document.createElement("span");
        star.textContent = "☆";
        star.style.cursor = "pointer";
        star.addEventListener("click", function () {
          rating = n;
          Array.prototype.forEach.call(ratingEl.children, function (el, idx) { el.textContent = idx < rating ? "★" : "☆"; });
        });
        ratingEl.appendChild(star);
      })(i);
    }

    var keywordsEl = document.getElementById("review-keywords");
    POSITIVE_KEYWORDS.concat(NEGATIVE_KEYWORDS).forEach(function (kw) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = kw;
      chip.className = "rounded-full border border-[#dfe2e6] px-3 py-1 text-[13px]";
      chip.addEventListener("click", function () {
        var idx = keywords.indexOf(kw);
        if (idx >= 0) { keywords.splice(idx, 1); chip.className = "rounded-full border border-[#dfe2e6] px-3 py-1 text-[13px]"; }
        else { keywords.push(kw); chip.className = "rounded-full border border-[#ff6b00] bg-[#fff4ec] px-3 py-1 text-[13px] text-[#ff6b00]"; }
      });
      keywordsEl.appendChild(chip);
    });

    document.getElementById("review-submit-btn").addEventListener("click", function () {
      var reviewErrorEl = document.getElementById("review-error");
      reviewErrorEl.style.display = "none";
      if (!rating) { reviewErrorEl.textContent = "별점을 선택해주세요."; reviewErrorEl.style.display = ""; return; }
      Api.request("/api/reviews", {
        method: "POST",
        body: {
          restaurantId: restaurantId,
          restaurantName: restaurantName,
          rating: rating,
          keywords: keywords,
          content: document.getElementById("review-content").value.trim() || null,
          receiptId: receiptId,
        },
      })
        .then(function () {
          wrap.innerHTML = '<p class="text-[16px] font-bold text-[#22a55e]">리뷰가 등록되었습니다. 감사합니다!</p>';
        })
        .catch(function (err) {
          reviewErrorEl.textContent = err.message || "리뷰 등록에 실패했습니다.";
          reviewErrorEl.style.display = "";
        });
    });
  }

  submitBtn.addEventListener("click", function () {
    showError("");
    if (!selectedRestaurant || !input.files[0]) return;

    var formData = new FormData();
    formData.append("image", input.files[0]);
    formData.append("restaurantId", selectedRestaurant.restaurantId);
    formData.append("restaurantName", selectedRestaurant.name);

    submitBtn.disabled = true;
    Api.request("/api/receipts", { method: "POST", isForm: true, body: formData })
      .then(function (data) {
        resultEl.style.display = "";
        resultEl.innerHTML =
          '<h2 class="text-[20px] font-bold ' + (data.verified ? "text-[#22a55e]" : "text-[#e0983f]") + '">' + (data.verified ? "인증 성공" : "인증 미확인") + "</h2>" +
          '<p class="mt-2 text-[15px] text-[#30343a]">매장명: ' + escapeHtml(data.storeName || "-") + "</p>" +
          '<p class="mt-1 text-[15px] text-[#30343a]">방문일시: ' + escapeHtml(data.orderDatetime || "-") + "</p>" +
          '<p class="mt-1 text-[15px] text-[#30343a]">결제금액: ' + (data.totalPrice != null ? Number(data.totalPrice).toLocaleString() + "원" : "-") + "</p>";
        if (data.verified) renderReviewForm(data.receiptId, selectedRestaurant.restaurantId, selectedRestaurant.name);
      })
      .catch(function (err) { showError(err.message || "영수증 인식에 실패했습니다."); })
      .finally(function () { submitBtn.disabled = false; });
  });

  Api.request("/api/mypage/visits", {})
    .then(function (visits) {
      var el = document.getElementById("recent-visits");
      if (!visits || visits.length === 0) { el.innerHTML = '<p class="text-[15px] text-[#74777d]">아직 방문 기록이 없어요.</p>'; return; }
      el.innerHTML = "";
      visits.slice(0, 5).forEach(function (v) {
        var row = document.createElement("div");
        row.className = "flex items-center justify-between rounded-[12px] border border-[#dfe2e6] p-4";
        row.innerHTML = "<div><h2 class='text-[18px] font-bold text-[#111]'>" + escapeHtml(v.name) + "</h2><p class='mt-1 text-[14px] text-[#74777d]'>" + escapeHtml(v.roadAddress || v.address || "") + "</p></div>";
        el.appendChild(row);
      });
    })
    .catch(function () {});
})();
