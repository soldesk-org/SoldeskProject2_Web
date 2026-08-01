(function () {
  if (!Api.requireLogin()) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var sections = {
    1: document.getElementById("step1Section"),
    2: document.getElementById("step2Section"),
    3: document.getElementById("step3Section"),
  };
  var doneSection = document.getElementById("doneSection");
  var stepsRoot = document.getElementById("receiptSteps");

  function goStep(n) {
    Object.keys(sections).forEach(function (k) { sections[k].hidden = Number(k) !== n; });
    doneSection.hidden = true;
    stepsRoot.parentElement.hidden = false;
    stepsRoot.querySelectorAll(".e-step").forEach(function (s) {
      var v = Number(s.getAttribute("data-step"));
      s.classList.toggle("is-current", v === n);
      s.classList.toggle("is-done", v < n);
      var dot = s.querySelector(".e-step-dot");
      dot.innerHTML = v < n
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
        : String(v);
    });
    stepsRoot.querySelectorAll(".e-step-line").forEach(function (l) {
      l.style.background = Number(l.getAttribute("data-line")) < n ? "var(--brand-300)" : "";
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- 대상 매장 (explore.html의 "리뷰 작성" 링크로 넘어온 쿼리 파라미터) ----
  var params = new URLSearchParams(location.search);
  var restaurant = params.get("restaurantId") ? {
    restaurantId: params.get("restaurantId"),
    name: params.get("name") || "",
    address: params.get("address") || "",
    roadAddress: params.get("roadAddress") || "",
    latitude: params.get("latitude") ? Number(params.get("latitude")) : null,
    longitude: params.get("longitude") ? Number(params.get("longitude")) : null,
  } : null;

  if (restaurant) {
    document.getElementById("targetRestaurantName").textContent = restaurant.name;
  } else {
    document.getElementById("noRestaurantAlert").hidden = false;
    document.getElementById("runOcrBtn") && (document.getElementById("runOcrBtn").disabled = true);
  }

  var ocrResult = null;

  // ---- 드롭존/미리보기는 eatty-ui.js가 처리, 여기서는 실행 버튼만 담당 ----
  document.getElementById("cameraCaptureBtn").addEventListener("click", function () {
    document.getElementById("cameraInput").click();
  });
  document.getElementById("receiptRemoveBtn").addEventListener("click", function () {
    document.getElementById("receiptFileInput").value = "";
    document.getElementById("receiptPreview").hidden = true;
    document.getElementById("receiptFileName").textContent = "선택된 파일이 없습니다";
  });

  document.getElementById("runOcrBtn").addEventListener("click", function () {
    if (!restaurant) return;
    var fileInput = document.getElementById("receiptFileInput");
    var file = fileInput.files && fileInput.files[0];
    if (!file) { Eatty.toast("영수증 사진을 선택해주세요.", "error"); return; }

    var btn = this;
    btn.classList.add("is-loading");
    document.getElementById("ocrFailAlert").hidden = true;

    var formData = new FormData();
    formData.append("image", file);
    formData.append("restaurantId", restaurant.restaurantId);
    formData.append("restaurantName", restaurant.name);

    Api.request("/api/receipts", { method: "POST", isForm: true, body: formData })
      .then(function (data) {
        ocrResult = data;
        renderStep2(data);
        goStep(2);
      })
      .catch(function (err) {
        document.getElementById("ocrFailAlert").hidden = false;
        Eatty.toast(err.message || "영수증 인식에 실패했습니다.", "error");
      })
      .finally(function () { btn.classList.remove("is-loading"); });
  });

  function renderStep2(data) {
    var badge = document.getElementById("ocrVerifiedBadge");
    badge.textContent = data.verified ? "인증 성공" : "인증 실패";
    badge.className = "e-badge e-badge-lg flex-none " + (data.verified ? "e-badge--success" : "e-badge--danger");

    document.getElementById("ocrShopName").textContent = data.storeName || "-";
    document.getElementById("ocrTotalAmount").textContent = data.totalPrice != null ? Number(data.totalPrice).toLocaleString() + "원" : "-";
    document.getElementById("ocrVisitDatetime").textContent = data.orderDatetime || "-";

    var menuList = document.getElementById("ocrMenuList");
    if (data.menuItems && data.menuItems.length) {
      menuList.innerHTML = data.menuItems.map(function (m) {
        return '<div class="flex items-center justify-between p-3.5"><span class="text-sm text-[var(--ink-800)]">' + escapeHtml(m.name) + '</span>' +
          '<span class="text-sm t-num text-[var(--ink-800)]">' + (m.price != null ? Number(m.price).toLocaleString() + "원" : "") + '</span></div>';
      }).join("");
    } else {
      menuList.innerHTML = '<p class="p-3.5 t-sm">인식된 메뉴가 없습니다.</p>';
    }

    document.getElementById("ocrDuplicateAlert").hidden = !!data.verified;
    document.getElementById("ocrConfirmBtn").disabled = !data.verified;
  }

  document.getElementById("ocrRetryBtn").addEventListener("click", function () { goStep(1); });
  document.getElementById("ocrConfirmBtn").addEventListener("click", function () {
    if (!ocrResult || !ocrResult.verified) return;
    document.getElementById("step3RestaurantName").textContent = restaurant.name;
    document.getElementById("step3VisitSummary").textContent =
      (ocrResult.orderDatetime || "-") + " 방문 · " + (ocrResult.totalPrice != null ? Number(ocrResult.totalPrice).toLocaleString() + "원" : "-");
    goStep(3);
  });
  document.getElementById("reviewBackBtn").addEventListener("click", function () { goStep(2); });

  // ---- 별점 라벨 ----
  var LABELS = { 1: "많이 아쉬웠어요", 2: "조금 아쉬웠어요", 3: "보통이에요", 4: "만족했어요", 5: "아주 좋았어요!" };
  document.getElementById("reviewRatingInput").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rating-value]");
    if (!b) return;
    var v = Number(b.getAttribute("data-rating-value"));
    document.getElementById("reviewScoreLabel").textContent = LABELS[v];
    document.getElementById("ratingError").classList.remove("is-visible");
  });

  // ---- 태그 선택 개수 ----
  var tagInputs = document.querySelectorAll("#positiveTagList input, #negativeTagList input");
  tagInputs.forEach(function (i) {
    i.addEventListener("change", function () {
      var n = Array.prototype.filter.call(tagInputs, function (x) { return x.checked; }).length;
      document.getElementById("tagSelectedCount").textContent = n;
    });
  });

  // ---- 리뷰 등록 ----
  document.getElementById("reviewForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var score = Number(document.getElementById("reviewScore").value);
    if (!score) {
      document.getElementById("ratingError").classList.add("is-visible");
      Eatty.toast("별점을 선택해주세요.", "error");
      return;
    }
    if (!document.getElementById("agreeReviewPolicy").checked) {
      Eatty.toast("리뷰 정책에 동의해주세요.", "error");
      return;
    }
    if (!ocrResult || !ocrResult.receiptId) {
      Eatty.toast("영수증 인증 정보가 없습니다. 처음부터 다시 진행해주세요.", "error");
      return;
    }

    var keywords = Array.prototype.filter.call(tagInputs, function (i) { return i.checked; }).map(function (i) { return i.value; });
    var content = document.getElementById("reviewContent").value.trim();

    var submitBtn = document.getElementById("reviewSubmitBtn");
    submitBtn.disabled = true;
    Api.request("/api/reviews", {
      method: "POST",
      body: {
        restaurantId: restaurant.restaurantId,
        restaurantName: restaurant.name,
        address: restaurant.address,
        roadAddress: restaurant.roadAddress,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        rating: score,
        content: content || null,
        keywords: keywords,
        receiptId: ocrResult.receiptId,
      },
    }).then(function () {
      document.getElementById("step3Section").hidden = true;
      stepsRoot.parentElement.hidden = true;
      document.getElementById("doneRestaurantName").textContent = restaurant.name;
      document.getElementById("doneRatingStars").innerHTML = new Array(5).fill(0).map(function (_, i) {
        return '<svg viewBox="0 0 24 24" fill="currentColor"' + (i < score ? ' class="is-on"' : "") + '><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>';
      }).join("");
      doneSection.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(function (err) {
      Eatty.toast(err.message || "리뷰 등록에 실패했습니다.", "error");
    }).finally(function () { submitBtn.disabled = false; });
  });

  document.getElementById("writeAnotherBtn").addEventListener("click", function () {
    document.getElementById("reviewForm").reset();
    document.getElementById("reviewScore").value = "0";
    document.querySelectorAll("#reviewRatingInput [data-rating-value]").forEach(function (b) { b.classList.remove("is-on"); });
    document.getElementById("reviewScoreText").textContent = "-";
    document.getElementById("reviewScoreLabel").textContent = "별점을 선택해주세요";
    document.getElementById("tagSelectedCount").textContent = "0";
    ocrResult = null;
    goStep(1);
  });
})();
