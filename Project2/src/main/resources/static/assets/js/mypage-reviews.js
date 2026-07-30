(function () {
  if (!Api.requireLogin()) return;

  var POSITIVE_KEYWORDS = ["맛있어요", "재료가 신선해요", "양이 많아요", "가성비가 좋아요", "깨끗해요", "친절해요", "차분해요", "대기시간짧아요", "음식이빨리나와요", "가게가예뻐요"];
  var NEGATIVE_KEYWORDS = ["맛이 아쉬워요", "재료가 신선하지 않아요", "양이 적어요", "가격이 비싸요", "지저분해요", "불친절해요", "소란스러워요", "대기시간길어요", "음식이늦게나와요", "가게가부산스러워요"];
  var ALL_KEYWORDS = POSITIVE_KEYWORDS.concat(NEGATIVE_KEYWORDS);

  var listEl = document.getElementById("mr-list");
  var countEl = document.getElementById("mr-count");
  var allReviews = [];
  var activeTab = "all";

  var tabButtons = {
    all: document.getElementById("mr-tab-all"),
    done: document.getElementById("mr-tab-done"),
    draft: document.getElementById("mr-tab-draft"),
  };

  function tabClass(active) {
    return "rounded-full px-5 py-2 text-[16px] font-semibold transition-colors " +
      (active ? "bg-[#fd6d4a] text-white" : "border border-[rgba(37,55,75,0.15)] text-[#25374b] hover:border-[#fd6d4a] hover:text-[#fd6d4a]");
  }

  function renderTabs() {
    Object.keys(tabButtons).forEach(function (t) {
      tabButtons[t].className = tabClass(t === activeTab);
    });
  }

  function selectTab(t) {
    activeTab = t;
    renderTabs();
    renderList();
  }

  Object.keys(tabButtons).forEach(function (t) {
    tabButtons[t].addEventListener("click", function () { selectTab(t); });
  });

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function formatDate(s) {
    if (!s) return "";
    return String(s).slice(0, 10).replace(/-/g, ".");
  }

  function starsSvg(rating) {
    var html = "";
    for (var i = 1; i <= 5; i++) {
      var filled = i <= Math.round(rating);
      html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="' + (filled ? "#fd5435" : "none") + '" stroke="' + (filled ? "#fd5435" : "#c7cdd5") + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z"/></svg>';
    }
    return html;
  }

  function updateStats(reviews) {
    document.getElementById("mr-stat-count").textContent = reviews.length + "개";
    if (reviews.length === 0) {
      document.getElementById("mr-stat-rating").textContent = "-";
      document.getElementById("mr-stat-verified").textContent = "0개";
      document.getElementById("mr-stat-recent").textContent = "-";
      return;
    }
    var avg = reviews.reduce(function (sum, r) { return sum + Number(r.rating || 0); }, 0) / reviews.length;
    document.getElementById("mr-stat-rating").textContent = avg.toFixed(1);
    document.getElementById("mr-stat-verified").textContent = reviews.filter(function (r) { return r.receiptVerified; }).length + "개";
    var mostRecent = reviews.reduce(function (latest, r) { return !latest || (r.createdAt || "") > latest ? r.createdAt : latest; }, null);
    document.getElementById("mr-stat-recent").textContent = formatDate(mostRecent) || "-";
  }

  function loadReviews() {
    Api.request("/api/mypage/reviews", {})
      .then(function (reviews) {
        allReviews = reviews;
        updateStats(reviews);
        renderTabs();
        renderList();
      })
      .catch(function () {
        countEl.textContent = "";
        listEl.innerHTML = '<p class="text-[16px] text-red-500">리뷰를 불러오지 못했습니다.</p>';
      });
  }

  function renderList() {
    if (activeTab === "draft") {
      countEl.textContent = "";
      listEl.innerHTML = '<p class="text-[16px] text-[rgba(37,55,75,0.5)]">임시저장된 리뷰가 없어요.</p>';
      return;
    }
    // 전체/작성 완료 둘 다 실제로 등록된 리뷰 목록을 그대로 보여준다 — 이 API가 반환하는 리뷰는
    // 전부 이미 작성 완료된 상태이고, 별도의 임시저장 상태는 서버에 없다.
    var reviews = allReviews;
    countEl.textContent = "내가 남긴 리뷰 " + reviews.length + "개";
    if (reviews.length === 0) {
      listEl.innerHTML = '<p class="text-[16px] text-[rgba(37,55,75,0.5)]">아직 작성한 리뷰가 없어요.</p>';
      return;
    }
    listEl.innerHTML = "";
    reviews.forEach(function (r) { listEl.appendChild(renderCard(r)); });
  }

  function renderCard(r) {
    var card = document.createElement("div");
    card.className = "flex flex-wrap gap-6 rounded-[10px] border border-[#dee3e9] p-6 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.05)]";
    var keywordText = (r.keywords || []).map(function (k) { return k.keyword; }).join(", ");
    card.innerHTML =
      '<div class="size-[140px] shrink-0 overflow-hidden rounded-[10px]">' + Api.photoPlaceholder + "</div>" +
      '<div class="flex-1">' +
      '<div class="flex flex-wrap items-baseline justify-between gap-2">' +
      '<h2 class="text-[26px] font-semibold tracking-[-1.3px] text-[#25374b]">' + escapeHtml(r.restaurantName) + "</h2>" +
      '<span class="text-[16px] font-medium text-[rgba(37,55,75,0.45)]">' + formatDate(r.createdAt) + (r.receiptVerified ? " · 영수증 인증" : "") + "</span>" +
      "</div>" +
      '<div class="mt-3 flex items-center gap-1">' + starsSvg(r.rating) + '<span class="ml-2 text-[18px] font-semibold text-[#25374b]">' + Number(r.rating).toFixed(1) + "</span></div>" +
      (keywordText ? '<p class="mt-2 text-[15px] text-[rgba(37,55,75,0.6)]">' + escapeHtml(keywordText) + "</p>" : "") +
      (r.content ? '<p class="mt-3 text-[18px] text-[#25374b]">' + escapeHtml(r.content) + "</p>" : "") +
      '<div class="mt-4 flex items-center gap-6">' +
      '<button data-edit class="text-[16px] font-medium text-[rgba(37,55,75,0.6)] hover:text-[#fd6d4a]">수정</button>' +
      '<button data-delete class="text-[16px] font-medium text-[rgba(37,55,75,0.6)] hover:text-red-500">삭제</button>' +
      "</div>" +
      '<div data-edit-form style="display:none" class="mt-4 border-t border-[#eaeaea] pt-4"></div>' +
      "</div>";

    card.querySelector("[data-delete]").addEventListener("click", function () {
      if (!window.confirm("이 리뷰를 삭제하시겠습니까?")) return;
      Api.request("/api/reviews/" + r.reviewId, { method: "DELETE" })
        .then(loadReviews)
        .catch(function (err) { window.alert(err.message || "삭제에 실패했습니다."); });
    });

    card.querySelector("[data-edit]").addEventListener("click", function () {
      var form = card.querySelector("[data-edit-form]");
      var open = form.style.display !== "none";
      if (open) { form.style.display = "none"; return; }
      renderEditForm(form, r);
      form.style.display = "";
    });

    return card;
  }

  function renderEditForm(form, r) {
    var selectedKeywords = (r.keywords || []).map(function (k) { return k.keyword; });
    var rating = r.rating;

    form.innerHTML =
      '<div class="edit-rating flex gap-1 text-[24px]"></div>' +
      '<div class="edit-keywords mt-3 flex flex-wrap gap-2"></div>' +
      '<textarea class="edit-content mt-3 h-[70px] w-full rounded-[8px] border border-[#dfe2e6] p-3 text-[15px] outline-none">' + escapeHtml(r.content || "") + "</textarea>" +
      '<p class="edit-error mt-2 text-[14px] text-red-500" style="display:none"></p>' +
      '<button class="edit-save mt-3 rounded-[10px] bg-[#ff6b00] px-6 py-2 text-[15px] font-bold text-white">저장</button>';

    var ratingEl = form.querySelector(".edit-rating");
    for (var i = 1; i <= 5; i++) {
      (function (n) {
        var star = document.createElement("span");
        star.textContent = n <= rating ? "★" : "☆";
        star.style.cursor = "pointer";
        star.addEventListener("click", function () {
          rating = n;
          Array.prototype.forEach.call(ratingEl.children, function (el, idx) { el.textContent = idx < rating ? "★" : "☆"; });
        });
        ratingEl.appendChild(star);
      })(i);
    }

    var keywordsEl = form.querySelector(".edit-keywords");
    ALL_KEYWORDS.forEach(function (kw) {
      var active = selectedKeywords.indexOf(kw) >= 0;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = kw;
      chip.className = "rounded-full border px-3 py-1 text-[13px] " + (active ? "border-[#ff6b00] bg-[#fff4ec] text-[#ff6b00]" : "border-[#dfe2e6]");
      chip.addEventListener("click", function () {
        var idx = selectedKeywords.indexOf(kw);
        if (idx >= 0) { selectedKeywords.splice(idx, 1); chip.className = "rounded-full border border-[#dfe2e6] px-3 py-1 text-[13px]"; }
        else { selectedKeywords.push(kw); chip.className = "rounded-full border border-[#ff6b00] bg-[#fff4ec] px-3 py-1 text-[13px] text-[#ff6b00]"; }
      });
      keywordsEl.appendChild(chip);
    });

    form.querySelector(".edit-save").addEventListener("click", function () {
      var errorEl = form.querySelector(".edit-error");
      errorEl.style.display = "none";
      Api.request("/api/reviews/" + r.reviewId, {
        method: "PATCH",
        body: { rating: rating, keywords: selectedKeywords, content: form.querySelector(".edit-content").value.trim() || null },
      })
        .then(loadReviews)
        .catch(function (err) {
          errorEl.textContent = err.message || "수정에 실패했습니다.";
          errorEl.style.display = "";
        });
    });
  }

  renderTabs();
  loadReviews();
})();
