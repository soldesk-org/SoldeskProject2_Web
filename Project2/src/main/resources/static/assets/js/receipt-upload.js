(function () {
  if (!Api.requireLogin()) return;

  // ---- 접근 제어(2026-08-05 추가) ----
  // 이 페이지는 반드시 explore.html에서 가게를 클릭(→ restaurantId)하거나, 마이페이지 내 리뷰의
  // 임시저장 "이어서 쓰기"(→ draft)를 통해서만 들어올 수 있다. 주소창에 이 URL을 직접 치거나
  // restaurantId를 조작해서 들어오는 건 막는다 — sessionStorage에 그 클릭 시점에만 심어지는 값을
  // 확인해서 판단한다(explore.js/mypage-reviews.js가 이동 직전에 심어둠).
  //
  // restaurantId만 맞으면 통과시키는 걸로는 부족했다(2026-08-05 강화) — restaurantId는 그대로 두고
  // name/address 같은 URL의 다른 파라미터만 주소창에서 바꿔서 엉뚱한 가게 이름으로 들어올 수 있었다.
  // 그래서 URL의 name/address/roadAddress/latitude/longitude는 아예 신뢰하지 않고, 클릭 시점에
  // sessionStorage에 통째로 저장해둔 스냅샷(entrySnapshot)에서만 읽는다.
  var entryParams = new URLSearchParams(location.search);
  var entryRestaurantId = entryParams.get("restaurantId");
  var entryDraftId = entryParams.get("draft");
  var entryAt = Number(sessionStorage.getItem("ru_entry_at"));
  var entryWithinWindow = entryAt && (Date.now() - entryAt) < 30 * 60 * 1000; // 30분

  var entrySnapshot = null;
  try { entrySnapshot = JSON.parse(sessionStorage.getItem("ru_entry_restaurant") || "null"); } catch (e) { entrySnapshot = null; }

  var entryAllowed = entryDraftId
    ? (entryWithinWindow && sessionStorage.getItem("ru_entry_draft_id") === entryDraftId)
    : entryRestaurantId
      ? (entryWithinWindow && entrySnapshot && String(entrySnapshot.restaurantId) === entryRestaurantId)
      : false;

  if (!entryAllowed) {
    window.location.replace("explore");
    return;
  }

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

  // ---- 대상 매장 (explore.html에서 가게를 클릭한 시점에 저장해둔 신뢰 스냅샷 — URL 파라미터는
  // 안 쓴다. entrySnapshot은 위 접근 제어 통과 시점에 이미 restaurantId까지 검증된 값이다.) ----
  var restaurant = entrySnapshot ? {
    restaurantId: entrySnapshot.restaurantId,
    name: entrySnapshot.name || "",
    address: entrySnapshot.address || "",
    roadAddress: entrySnapshot.roadAddress || "",
    latitude: entrySnapshot.latitude != null ? Number(entrySnapshot.latitude) : null,
    longitude: entrySnapshot.longitude != null ? Number(entrySnapshot.longitude) : null,
  } : null;

  if (restaurant) {
    document.getElementById("targetRestaurantName").textContent = restaurant.name;
  } else {
    document.getElementById("noRestaurantAlert").hidden = false;
    document.getElementById("runOcrBtn") && (document.getElementById("runOcrBtn").disabled = true);
  }

  var ocrResult = null;

  // ---- 드롭존/미리보기는 eatty-ui.js가 처리, 여기서는 실행 버튼만 담당 ----
  var receiptDrop = document.getElementById("receiptDrop");
  // 파일을 고르면 미리보기가 바로 아래에 나오니, 클릭해서 선택하는 드롭존 박스는 중복이라 숨긴다
  // (2026-08-05 추가). 파일을 지우면 다시 보여준다.
  receiptDrop.addEventListener("eatty:filepicked", function () {
    receiptDrop.hidden = true;
  });
  document.getElementById("receiptRemoveBtn").addEventListener("click", function () {
    document.getElementById("receiptFileInput").value = "";
    document.getElementById("receiptPreview").hidden = true;
    document.getElementById("receiptFileName").textContent = "선택된 파일이 없습니다";
    receiptDrop.hidden = false;
  });

  document.getElementById("runOcrBtn").addEventListener("click", function () {
    if (!restaurant) return;
    var fileInput = document.getElementById("receiptFileInput");
    var file = fileInput.files && fileInput.files[0];
    if (!file) { Eatty.toast("영수증 사진을 선택해주세요.", "error"); return; }

    // 사업자등록증 OCR(signup-business.js runBusinessVerify)과 동일하게 버튼 문구만 "확인 중..."으로
    // 바꾸는 방식으로 통일한다(2026-08-06 - 서로 다른 로딩 애니메이션을 쓰던 걸 맞춤).
    var btn = this;
    var originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "확인 중...";

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
        Eatty.toast(err.message || "영수증 인식에 실패했습니다.", "error");
      })
      .finally(function () { btn.disabled = false; btn.innerHTML = originalHtml; });
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

    // 2026-08-06 추가 - "또 작성하기"를 눌러도 처음 올렸던 영수증 사진/OCR 결과가 그대로 남아있던
    // 문제. step1의 파일 입력·미리보기·드롭존, step2의 OCR 표시 필드까지 처음 접속한 상태로 되돌린다.
    document.getElementById("receiptFileInput").value = "";
    document.getElementById("receiptPreview").hidden = true;
    document.getElementById("receiptFileName").textContent = "선택된 파일이 없습니다";
    receiptDrop.hidden = false;
    document.getElementById("ocrShopName").textContent = "-";
    document.getElementById("ocrTotalAmount").textContent = "-";
    document.getElementById("ocrVisitDatetime").textContent = "-";
    document.getElementById("ocrMenuList").innerHTML = "";
    document.getElementById("ocrDuplicateAlert").hidden = true;

    goStep(1);
  });
})();
