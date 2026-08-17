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
  // 2026-08-12 추가 — "가게 보기"를 눌렀을 때 그 가게만 보이도록 explore.js의 기존 공유 링크
  // (?shopId=...) 흐름을 재사용. 카카오는 단건 재조회가 안 돼 name/address/좌표를 함께 실어보내야
  // RestaurantServiceImpl.verifySnapshot이 검증할 수 있다(URLSearchParams가 인코딩까지 해준다).
  function shopHref(r) {
    var qp = new URLSearchParams();
    qp.set("shopId", r.restaurantId);
    if (r.restaurantName) qp.set("name", r.restaurantName);
    if (r.address) qp.set("address", r.address);
    if (r.roadAddress) qp.set("roadAddress", r.roadAddress);
    if (r.latitude != null) qp.set("latitude", r.latitude);
    if (r.longitude != null) qp.set("longitude", r.longitude);
    return "explore?" + qp.toString();
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

  function renderReviewItem(r) {
    var li = document.createElement("li");
    li.className = "rv-item";
    li.setAttribute("data-review-id", r.reviewId);
    li.setAttribute("data-shop-name", r.restaurantName);
    var shopUrl = shopHref(r);
    li.innerHTML =
      '<article class="e-card e-card-pad">' +
        '<div class="flex items-start gap-3.5">' +
          // 2026-08-12 — 박스 크기(w-16 h-16)는 그대로 두고 background-size만 키워서 "NO IMAGE"
          // 배경 이미지가 잘 보이게 한다(e-shop-thumb 클래스는 84px 고정폭까지 함께 와서 박스 자체가
          // 커지므로 대신 인라인 스타일로 background-size만 덮어쓴다).
          '<a href="' + shopUrl + '" class="w-16 h-16 rounded-[var(--r)] e-img-ph flex-none" style="background-size:130%"></a>' +
          '<div class="min-w-0 flex-1">' +
            '<div class="flex flex-wrap items-center gap-2">' +
              '<a href="' + shopUrl + '" class="text-[16px] font-extrabold text-[var(--ink-900)] hover:text-[var(--brand-600)]">' + escapeHtml(r.restaurantName) + '</a>' +
            '</div>' +
            '<div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">' +
              '<span class="e-rating">' + starsHtml(r.rating) + '<span class="e-rating-score">' + r.rating.toFixed(1) + '</span></span>' +
              '<span class="t-xs t-num">' + formatDate(r.createdAt) + ' 작성</span>' +
              (r.helpfulCount ? '<span class="t-xs" style="color:var(--ink-400)">도움돼요 ' + r.helpfulCount + '</span>' : "") +
            '</div>' +
          '</div>' +
          '<div class="e-dropdown flex-none">' +
            '<button type="button" class="e-icon-btn !w-9 !h-9" data-dropdown-toggle="rvMenu' + r.reviewId + '" aria-expanded="false" aria-label="리뷰 관리 메뉴">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="5" r=".5"/><circle cx="12" cy="12" r=".5"/><circle cx="12" cy="19" r=".5"/></svg>' +
            '</button>' +
            '<div class="e-dropdown-menu !min-w-[168px]" id="rvMenu' + r.reviewId + '">' +
              '<a class="e-dropdown-item" href="' + shopUrl + '">가게 보기</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex flex-wrap gap-1.5 mt-4">' + tagsHtml(r.keywords) + '</div>' +
        '<p class="t-body mt-3 leading-relaxed">' + escapeHtml(r.content) + '</p>' +
        // 2026-08-10 추가 — 리뷰 작성 시 첨부한 사진을 "내가 쓴 리뷰" 목록에도 노출.
        // 클릭 시 크게 보기(2026-08-18 추가, eatty-ui.js 공용 라이트박스 재사용).
        ((r.images && r.images.length)
          ? '<div class="flex gap-2 mt-3 overflow-x-auto">' + r.images.map(function (img) {
              return '<img src="' + escapeHtml(img.imageUrl) + '" class="w-20 h-20 rounded-[var(--r-md)] object-cover flex-none cursor-pointer" alt="리뷰 첨부 사진" data-lightbox="' + escapeHtml(img.imageUrl) + '">';
            }).join("") + '</div>'
          : "") +
        '<div class="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-[var(--line-soft)]">' +
          '<div class="ml-auto flex gap-2">' +
            '<button type="button" class="btn btn-outline btn-sm" data-edit-review>수정</button>' +
            '<button type="button" class="btn btn-danger-soft btn-sm" data-delete-review>삭제</button>' +
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

  var allReviews = [];

  // 2026-08-12 추가 — 검색/별점/기간/정렬 필터가 화면에만 있고 실제로는 아무 동작도 안 하던 걸 발견해서
  // 실제로 동작하도록 구현. 통계 카드(총 리뷰/평균 별점/이번 달 작성)는 필터와 무관하게 항상 전체
  // 기준으로 유지한다.
  var reviewSearchInput = document.getElementById("reviewSearchInput");
  var reviewRatingFilter = document.getElementById("reviewRatingFilter");
  var reviewPeriodFilter = document.getElementById("reviewPeriodFilter");
  var reviewSortSelect = document.getElementById("reviewSortSelect");

  function periodCutoff(period) {
    var now = new Date();
    if (period === "1m") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    if (period === "3m") return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    if (period === "1y") return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return null;
  }

  function applyFilters() {
    var search = (reviewSearchInput ? reviewSearchInput.value : "").trim().toLowerCase();
    var rating = reviewRatingFilter ? reviewRatingFilter.value : "all";
    var period = reviewPeriodFilter ? reviewPeriodFilter.value : "all";
    var sort = reviewSortSelect ? reviewSortSelect.value : "recent";
    var cutoff = periodCutoff(period);

    var filtered = allReviews.filter(function (r) {
      if (rating !== "all" && String(r.rating) !== rating) return false;
      if (cutoff && new Date(r.createdAt) < cutoff) return false;
      if (search) {
        var haystack = ((r.restaurantName || "") + " " + (r.content || "")).toLowerCase();
        if (haystack.indexOf(search) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      if (sort === "rating-high") return b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "rating-low") return a.rating - b.rating || new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "helpful") return (b.helpfulCount || 0) - (a.helpfulCount || 0) || new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    reviewsCache = filtered;
    reviewPage = 1;
    renderReviewPage();
  }

  [reviewSearchInput].forEach(function (el) { if (el) el.addEventListener("input", applyFilters); });
  [reviewRatingFilter, reviewPeriodFilter, reviewSortSelect].forEach(function (el) {
    if (el) el.addEventListener("change", applyFilters);
  });

  function renderReviews(reviews) {
    allReviews = reviews;
    if (publishedCountEl) publishedCountEl.textContent = reviews.length;
    if (summaryTotal) summaryTotal.textContent = reviews.length;
    if (summaryAvgRating) {
      summaryAvgRating.textContent = reviews.length
        ? (reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length).toFixed(1)
        : "-";
    }
    if (summaryHelpful) {
      summaryHelpful.textContent = reviews.reduce(function (s, r) { return s + (r.helpfulCount || 0); }, 0);
    }
    if (summaryThisMonth) {
      var ym = new Date().toISOString().slice(0, 7);
      summaryThisMonth.textContent = reviews.filter(function (r) { return (r.createdAt || "").slice(0, 7) === ym; }).length;
    }
    applyFilters();
  }

  function loadReviews() {
    return Api.request("/api/mypage/reviews").then(renderReviews).catch(function () { renderReviews([]); });
  }
  loadReviews();

  var targetId = null;

  // ---- 리뷰 수정 - 사진 추가/삭제(2026-08-12 추가, 최대 3장, receipt-upload.js와 동일 디자인) ----
  var EDIT_PHOTO_LIMIT = 3;
  var editExistingImages = []; // [{reviewImageId, imageUrl}] - 서버에 이미 저장된 사진
  var editNewFiles = []; // 이번 저장에서 새로 추가할 파일
  var editReviewPhotoInput = document.getElementById("editReviewPhotoInput");
  var editReviewPhotoAddBtn = document.getElementById("editReviewPhotoAddBtn");
  var editReviewPhotoList = document.getElementById("editReviewPhotoList");
  var editReviewPhotoCount = document.getElementById("editReviewPhotoCount");

  function renderEditReviewPhotos() {
    editReviewPhotoList.querySelectorAll("[data-photo-preview]").forEach(function (el) { el.remove(); });
    editExistingImages.forEach(function (img) {
      var item = document.createElement("div");
      item.className = "relative w-20 h-20 rounded-[var(--r-md)] overflow-hidden flex-none";
      item.setAttribute("data-photo-preview", "");
      item.innerHTML =
        '<img src="' + escapeHtml(img.imageUrl) + '" class="w-full h-full object-cover" alt="첨부한 리뷰 사진 미리보기">' +
        '<button type="button" class="absolute right-1 top-1 w-5 h-5 rounded-full bg-black/50 text-white grid place-items-center" data-remove-existing-photo="' + img.reviewImageId + '" aria-label="사진 삭제">' +
          '<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>';
      editReviewPhotoList.insertBefore(item, editReviewPhotoAddBtn);
    });
    editNewFiles.forEach(function (file, index) {
      var url = URL.createObjectURL(file);
      var item = document.createElement("div");
      item.className = "relative w-20 h-20 rounded-[var(--r-md)] overflow-hidden flex-none";
      item.setAttribute("data-photo-preview", "");
      item.innerHTML =
        '<img src="' + url + '" class="w-full h-full object-cover" alt="첨부한 리뷰 사진 미리보기">' +
        '<button type="button" class="absolute right-1 top-1 w-5 h-5 rounded-full bg-black/50 text-white grid place-items-center" data-remove-new-photo="' + index + '" aria-label="사진 삭제">' +
          '<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>';
      editReviewPhotoList.insertBefore(item, editReviewPhotoAddBtn);
    });
    var total = editExistingImages.length + editNewFiles.length;
    editReviewPhotoCount.textContent = total;
    editReviewPhotoAddBtn.hidden = total >= EDIT_PHOTO_LIMIT;
  }

  if (editReviewPhotoAddBtn && editReviewPhotoInput) {
    editReviewPhotoAddBtn.addEventListener("click", function () { editReviewPhotoInput.click(); });
    editReviewPhotoInput.addEventListener("change", function () {
      var picked = Array.prototype.slice.call(editReviewPhotoInput.files || []);
      var room = EDIT_PHOTO_LIMIT - (editExistingImages.length + editNewFiles.length);
      if (picked.length > room) {
        Eatty.toast("사진은 최대 " + EDIT_PHOTO_LIMIT + "장까지 첨부할 수 있어요.", "error");
      }
      editNewFiles = editNewFiles.concat(picked.slice(0, room));
      editReviewPhotoInput.value = "";
      renderEditReviewPhotos();
    });
    editReviewPhotoList.addEventListener("click", function (e) {
      var newBtn = e.target.closest("[data-remove-new-photo]");
      if (newBtn) {
        editNewFiles.splice(Number(newBtn.getAttribute("data-remove-new-photo")), 1);
        renderEditReviewPhotos();
        return;
      }
      var existingBtn = e.target.closest("[data-remove-existing-photo]");
      if (!existingBtn) return;
      var reviewImageId = existingBtn.getAttribute("data-remove-existing-photo");
      existingBtn.disabled = true;
      Api.request("/api/reviews/" + targetId + "/images/" + reviewImageId, { method: "DELETE" })
        .then(function () {
          editExistingImages = editExistingImages.filter(function (img) { return String(img.reviewImageId) !== reviewImageId; });
          renderEditReviewPhotos();
        })
        .catch(function (err) {
          Eatty.toast(err.message || "사진 삭제에 실패했습니다.", "error");
          existingBtn.disabled = false;
        });
    });
  }

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

      editExistingImages = (review.images || []).slice();
      editNewFiles = [];
      renderEditReviewPhotos();

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
        if (!editNewFiles.length) return;
        var formData = new FormData();
        editNewFiles.forEach(function (file) { formData.append("images", file); });
        return Api.request("/api/reviews/" + targetId + "/images", { method: "POST", body: formData, isForm: true })
          .catch(function (err) { Eatty.toast((err && err.message) || "리뷰 사진 등록에 실패했습니다.", "error"); });
      })
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
      if (reviewSearchInput) reviewSearchInput.value = "";
      if (reviewRatingFilter) reviewRatingFilter.value = "all";
      if (reviewPeriodFilter) reviewPeriodFilter.value = "all";
      if (reviewSortSelect) reviewSortSelect.value = "recent";
      applyFilters();
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
  var draftToolbar = document.getElementById("draftToolbar");
  var draftSearchInput = document.getElementById("draftSearchInput");
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
            '<button type="button" class="btn btn-danger-soft btn-sm" data-discard-draft>삭제</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    return li;
  }

  // 2026-08-12 추가 — 작성한 리뷰 탭과 같은 위치에 검색창을 가져오면서 실제로 가게명 검색이 되도록
  // 구현. 탭 배지 숫자(draftCount)/전체 삭제 버튼 노출 여부는 검색 결과가 아니라 항상 전체 개수 기준.
  function renderDrafts() {
    var drafts = readDrafts();
    var n = drafts.length;
    draftCountEl.textContent = n;
    draftClearAllBtn.hidden = n === 0;
    if (draftToolbar) draftToolbar.hidden = n === 0;

    var keyword = (draftSearchInput ? draftSearchInput.value : "").trim().toLowerCase();
    var filtered = keyword
      ? drafts.filter(function (d) { return (d.shopName || "").toLowerCase().indexOf(keyword) > -1; })
      : drafts;

    draftList.innerHTML = "";
    filtered.forEach(function (d) { draftList.appendChild(renderDraftItem(d)); });
    draftList.hidden = filtered.length === 0;
    draftEmpty.hidden = filtered.length !== 0;
  }
  renderDrafts();
  if (draftSearchInput) draftSearchInput.addEventListener("input", renderDrafts);

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
