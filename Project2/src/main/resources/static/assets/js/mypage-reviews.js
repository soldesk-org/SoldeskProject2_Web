(function () {
  if (!Api.requireLogin()) return;

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function formatDate(iso) {
    if (!iso) return "-";
    return String(iso).slice(0, 10);
  }
  function starsHtml(rating) {
    var html = "";
    for (var i = 1; i <= 5; i++) {
      html += '<svg viewBox="0 0 24 24" fill="currentColor" class="' + (i <= rating ? "is-on" : "") + '">' +
        '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>';
    }
    return html;
  }
  function tagsHtml(keywords) {
    return (keywords || []).map(function (k) {
      var cls = k.sentiment === "NEGATIVE" ? "e-tag--neg" : "e-tag--pos";
      return '<span class="e-tag ' + cls + '">' + escapeHtml(k.keyword) + '</span>';
    }).join("");
  }

  var reviewsCache = [];
  var reviewList = document.getElementById("reviewList");
  var reviewEmpty = document.getElementById("reviewEmpty");
  var reviewPagination = document.getElementById("reviewPagination");
  var reviewPagePrev = document.getElementById("reviewPagePrev");
  var reviewPageNext = document.getElementById("reviewPageNext");
  var reviewPageNumbers = document.getElementById("reviewPageNumbers");
  var REVIEW_PAGE_SIZE = 10;
  var reviewPage = 1;
  var publishedCountEl = document.getElementById("publishedCount");
  var summaryTotal = document.getElementById("summaryTotal");
  var summaryAvgRating = document.getElementById("summaryAvgRating");
  var summaryThisMonth = document.getElementById("summaryThisMonth");
  var summaryHelpful = document.getElementById("summaryHelpful");
  // "도움됨" 누적 수는 백엔드에 없는 값이라 통계 카드에서 숨긴다(지어낸 수치 금지).
  if (summaryHelpful) {
    var helpfulCard = summaryHelpful.closest(".e-card");
    if (helpfulCard) helpfulCard.hidden = true;
  }

  function renderReviewItem(r) {
    var li = document.createElement("li");
    li.className = "rv-item";
    li.setAttribute("data-review-id", r.reviewId);
    li.setAttribute("data-shop-name", r.restaurantName);
    li.innerHTML =
      '<article class="e-card e-card-pad">' +
        '<div class="flex items-start gap-3.5">' +
          '<a href="explore" class="w-16 h-16 rounded-[var(--r)] e-img-ph flex-none"><svg viewBox="0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg></a>' +
          '<div class="min-w-0 flex-1">' +
            '<div class="flex flex-wrap items-center gap-2">' +
              '<a href="explore" class="text-[16px] font-extrabold text-[var(--ink-900)] hover:text-[var(--brand-600)]">' + escapeHtml(r.restaurantName) + '</a>' +
              (r.receiptVerified ? '<span class="e-badge e-badge--success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>영수증 인증</span>' : "") +
            '</div>' +
            '<div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">' +
              '<span class="e-rating">' + starsHtml(r.rating) + '<span class="e-rating-score">' + r.rating.toFixed(1) + '</span></span>' +
              '<span class="t-xs t-num">' + formatDate(r.createdAt) + ' 작성</span>' +
            '</div>' +
          '</div>' +
          '<div class="e-dropdown flex-none">' +
            '<button type="button" class="e-icon-btn !w-9 !h-9" data-dropdown-toggle="rvMenu' + r.reviewId + '" aria-expanded="false" aria-label="리뷰 관리 메뉴">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="5" r=".5"/><circle cx="12" cy="12" r=".5"/><circle cx="12" cy="19" r=".5"/></svg>' +
            '</button>' +
            '<div class="e-dropdown-menu !min-w-[168px]" id="rvMenu' + r.reviewId + '">' +
              '<button type="button" class="e-dropdown-item" data-edit-review>수정하기</button>' +
              '<a class="e-dropdown-item" href="explore">가게 보기</a>' +
              '<div class="e-dropdown-sep"></div>' +
              '<button type="button" class="e-dropdown-item e-dropdown-item--danger" data-delete-review>삭제하기</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex flex-wrap gap-1.5 mt-4">' + tagsHtml(r.keywords) + '</div>' +
        '<p class="t-body mt-3 leading-relaxed">' + escapeHtml(r.content) + '</p>' +
        '<div class="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-[var(--line-soft)]">' +
          '<div class="ml-auto flex gap-2">' +
            '<button type="button" class="btn btn-outline btn-sm" data-edit-review>수정</button>' +
            '<button type="button" class="btn btn-ghost btn-sm !text-[var(--danger)]" data-delete-review>삭제</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    return li;
  }

  function renderReviewPage() {
    reviewList.innerHTML = "";
    var reviews = reviewsCache;
    if (!reviews.length) {
      reviewList.hidden = true;
      reviewPagination.hidden = true;
      reviewEmpty.hidden = false;
      return;
    }
    reviewList.hidden = false;
    reviewEmpty.hidden = true;

    var totalPages = Math.max(1, Math.ceil(reviews.length / REVIEW_PAGE_SIZE));
    if (reviewPage > totalPages) reviewPage = totalPages;
    var start = (reviewPage - 1) * REVIEW_PAGE_SIZE;
    reviews.slice(start, start + REVIEW_PAGE_SIZE)
      .forEach(function (r) { reviewList.appendChild(renderReviewItem(r)); });

    if (totalPages <= 1) {
      reviewPagination.hidden = true;
      return;
    }
    reviewPagination.hidden = false;
    reviewPageNumbers.innerHTML = "";
    for (var p = 1; p <= totalPages; p++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "e-page-btn";
      btn.textContent = String(p);
      if (p === reviewPage) btn.setAttribute("aria-current", "page");
      (function (targetPage) {
        btn.addEventListener("click", function () { reviewPage = targetPage; renderReviewPage(); });
      })(p);
      reviewPageNumbers.appendChild(btn);
    }
    reviewPagePrev.disabled = reviewPage === 1;
    reviewPageNext.disabled = reviewPage === totalPages;
  }

  if (reviewPagePrev) {
    reviewPagePrev.addEventListener("click", function () {
      if (reviewPage > 1) { reviewPage--; renderReviewPage(); }
    });
  }
  if (reviewPageNext) {
    reviewPageNext.addEventListener("click", function () {
      var totalPages = Math.max(1, Math.ceil(reviewsCache.length / REVIEW_PAGE_SIZE));
      if (reviewPage < totalPages) { reviewPage++; renderReviewPage(); }
    });
  }

  function renderReviews(reviews) {
    reviewsCache = reviews;
    reviewPage = 1;
    if (publishedCountEl) publishedCountEl.textContent = reviews.length;
    if (summaryTotal) summaryTotal.textContent = reviews.length;
    if (summaryAvgRating) {
      summaryAvgRating.textContent = reviews.length
        ? (reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length).toFixed(1)
        : "-";
    }
    if (summaryThisMonth) {
      var ym = new Date().toISOString().slice(0, 7);
      summaryThisMonth.textContent = reviews.filter(function (r) { return (r.createdAt || "").slice(0, 7) === ym; }).length;
    }
    renderReviewPage();
  }

  function loadReviews() {
    return Api.request("/api/mypage/reviews").then(renderReviews).catch(function () { renderReviews([]); });
  }
  loadReviews();

  var targetId = null;

  reviewList.addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit-review]");
    var delBtn = e.target.closest("[data-delete-review]");
    var item = e.target.closest(".rv-item");
    if (!item) return;

    if (editBtn) {
      targetId = item.getAttribute("data-review-id");
      var review = reviewsCache.filter(function (r) { return String(r.reviewId) === targetId; })[0];
      if (!review) return;
      document.getElementById("editReviewId").value = targetId;
      document.getElementById("editReviewShopName").textContent = review.restaurantName;
      document.getElementById("editReviewContent").value = review.content || "";
      document.getElementById("editReviewContentCounter").textContent = (review.content || "").length + " / 1000";

      var ratingWrap = document.getElementById("editRatingInput");
      if (ratingWrap) {
        ratingWrap.querySelectorAll("[data-rating-value]").forEach(function (b) {
          b.classList.toggle("is-on", Number(b.getAttribute("data-rating-value")) <= review.rating);
        });
      }
      document.getElementById("editReviewScore").value = review.rating;
      document.getElementById("editReviewScoreText").textContent = review.rating.toFixed(1);

      var selectedKeywords = (review.keywords || []).map(function (k) { return k.keyword; });
      document.querySelectorAll('#editPositiveTagList input, #editNegativeTagList input').forEach(function (cb) {
        cb.checked = selectedKeywords.indexOf(cb.value) > -1;
      });

      Eatty.openModal("editReviewModal");
      return;
    }

    if (delBtn) {
      targetId = item.getAttribute("data-review-id");
      document.getElementById("deleteReviewShopName").textContent = item.getAttribute("data-shop-name");
      Eatty.openModal("deleteReviewModal");
    }
  });

  var editRatingInput = document.getElementById("editRatingInput");
  if (editRatingInput) {
    editRatingInput.addEventListener("click", function (e) {
      var star = e.target.closest("[data-rating-value]");
      if (!star) return;
      var v = Number(star.getAttribute("data-rating-value"));
      document.getElementById("editReviewScore").value = v;
      document.getElementById("editReviewScoreText").textContent = v.toFixed(1);
    });
  }

  document.getElementById("editReviewSaveBtn").addEventListener("click", function () {
    var rating = Number(document.getElementById("editReviewScore").value);
    var content = document.getElementById("editReviewContent").value.trim();
    var keywords = Array.prototype.map.call(
      document.querySelectorAll('#editPositiveTagList input:checked, #editNegativeTagList input:checked'),
      function (cb) { return cb.value; }
    );

    Api.request("/api/reviews/" + targetId, { method: "PATCH", body: { rating: rating, content: content, keywords: keywords } })
      .then(function () {
        Eatty.closeModal("editReviewModal");
        Eatty.toast("리뷰를 수정했습니다.", "success");
        return loadReviews();
      })
      .catch(function (err) { Eatty.toast(err.message || "수정에 실패했습니다.", "error"); });
  });

  document.getElementById("deleteReviewConfirmBtn").addEventListener("click", function () {
    Api.request("/api/reviews/" + targetId, { method: "DELETE" })
      .then(function () {
        Eatty.closeModal("deleteReviewModal");
        Eatty.toast("리뷰를 삭제했습니다.", "success");
        return loadReviews();
      })
      .catch(function (err) { Eatty.toast(err.message || "삭제에 실패했습니다.", "error"); });
  });

  var resetBtn = document.getElementById("reviewFilterResetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      document.getElementById("reviewSearchInput").value = "";
      document.getElementById("reviewRatingFilter").value = "all";
      document.getElementById("reviewPeriodFilter").value = "all";
      document.getElementById("reviewSortSelect").value = "recent";
    });
  }

  // ==========================================================
  // 임시저장 탭 — 서버 API 없이 localStorage만으로 관리(10.리뷰 001-04 3장 참고)
  // ==========================================================
  var DRAFT_KEY = "eatty.reviewDrafts";
  var draftList = document.getElementById("draftList");
  var draftEmpty = document.getElementById("draftEmpty");
  var draftCountEl = document.getElementById("draftCount");
  var draftClearAllBtn = document.getElementById("draftClearAllBtn");
  var discardTargetId = null;

  function readDrafts() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function writeDrafts(list) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(list)); } catch (e) { /* 용량 초과 무시 */ }
  }

  function renderDraftItem(d) {
    var li = document.createElement("li");
    li.className = "rv-draft";
    li.setAttribute("data-draft-id", d.draftId);
    li.setAttribute("data-shop-id", d.shopId || "");
    li.setAttribute("data-shop-name", d.shopName || "");
    li.innerHTML =
      '<article class="e-card e-card-pad">' +
        '<div class="flex items-start gap-3.5">' +
          '<span class="w-16 h-16 rounded-[var(--r)] e-img-ph e-img-ph--gray flex-none"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 2v7a3 3 0 0 0 6 0V2M6 12v10M17 2c-1.7 0-3 2.2-3 5s1.3 4 3 4 3-1.2 3-4-1.3-5-3-5ZM17 11v11"/></svg></span>' +
          '<div class="min-w-0 flex-1">' +
            '<div class="flex flex-wrap items-center gap-2">' +
              '<p class="text-[15px] font-extrabold text-[var(--ink-900)]">' + escapeHtml(d.shopName || "") + '</p>' +
              '<span class="e-badge e-badge--warning">임시저장</span>' +
            '</div>' +
            '<p class="t-xs mt-1 t-num">마지막 저장 ' + escapeHtml(d.savedAt || "") + '</p>' +
            (d.rating ? '<div class="flex items-center gap-2 mt-2.5"><span class="e-rating">' + starsHtml(d.rating) + '<span class="e-rating-score">' + Number(d.rating).toFixed(1) + '</span></span></div>' : "") +
            (d.content ? '<p class="t-body t-clamp-2 mt-2.5">' + escapeHtml(d.content) + '</p>' : "") +
          '</div>' +
          '<div class="flex flex-col gap-2 flex-none">' +
            '<button type="button" class="btn btn-primary btn-sm" data-continue-draft>이어서 쓰기</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-discard-draft>삭제</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    return li;
  }

  function renderDrafts() {
    var drafts = readDrafts();
    draftList.innerHTML = "";
    drafts.forEach(function (d) { draftList.appendChild(renderDraftItem(d)); });
    var n = drafts.length;
    draftCountEl.textContent = n;
    draftList.hidden = n === 0;
    draftEmpty.hidden = n !== 0;
    draftClearAllBtn.hidden = n === 0;
  }
  renderDrafts();

  draftList.addEventListener("click", function (e) {
    var row = e.target.closest(".rv-draft");
    if (!row) return;

    if (e.target.closest("[data-continue-draft]")) {
      var draftId = row.getAttribute("data-draft-id");
      // receipt-upload는 이 값 없이 바로/조작해서 들어오는 걸 막는다(2026-08-05 추가) — explore.js의
      // 가게 클릭 진입과 같은 패턴.
      sessionStorage.setItem("ru_entry_draft_id", draftId);
      sessionStorage.setItem("ru_entry_at", String(Date.now()));
      window.location.href = "receipt-upload?draft=" + encodeURIComponent(draftId);
      return;
    }
    if (e.target.closest("[data-discard-draft]")) {
      discardTargetId = row.getAttribute("data-draft-id");
      document.getElementById("discardDraftTarget").textContent = row.getAttribute("data-shop-name");
      Eatty.openModal("discardDraftModal");
    }
  });

  document.getElementById("discardDraftConfirmBtn").addEventListener("click", function () {
    if (discardTargetId) {
      writeDrafts(readDrafts().filter(function (d) { return d.draftId !== discardTargetId; }));
    }
    Eatty.closeModal("discardDraftModal");
    Eatty.toast("임시저장을 삭제했습니다.", "success");
    discardTargetId = null;
    renderDrafts();
  });

  draftClearAllBtn.addEventListener("click", function () {
    writeDrafts([]);
    Eatty.toast("임시저장을 모두 삭제했습니다.", "success");
    renderDrafts();
  });
})();
