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

  // ---- 임시저장(2026-08-12 추가) — 서버 API 없이 localStorage만 사용(mypage-reviews.js와 동일 키).
  // 지금까지는 "이어서 쓰기"로 들어와도 draft 파라미터가 접근 제어에만 쓰이고 실제로 저장된 내용을
  // 복원하지 않아서, 다시 영수증부터 처음부터 해야 했다 — 영수증은 이미 인증됐으므로(receiptId가
  // 있으므로) 사진을 다시 올릴 필요 없이 3단계(별점/태그/내용)로 바로 복원한다.
  var DRAFT_KEY = "eatty.reviewDrafts";
  function readDrafts() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "[]"); } catch (e) { return []; }
  }
  function writeDrafts(list) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(list)); } catch (e) { /* 용량 초과 무시 */ }
  }
  var resumedDraft = entryDraftId
    ? readDrafts().filter(function (d) { return d.draftId === entryDraftId; })[0] || null
    : null;
  var currentDraftId = resumedDraft ? resumedDraft.draftId : null;

  // ---- 대상 매장 ----
  // 일반 진입(explore.html에서 가게를 클릭)은 그 시점 sessionStorage 스냅샷(entrySnapshot)을 쓰고,
  // 임시저장 이어서 쓰기는 draft 자체에 저장해둔 스냅샷을 쓴다(둘 다 URL 파라미터는 신뢰하지 않는다).
  var restaurant = resumedDraft ? {
    restaurantId: resumedDraft.shopId,
    name: resumedDraft.shopName || "",
    address: resumedDraft.address || "",
    roadAddress: resumedDraft.roadAddress || "",
    latitude: resumedDraft.latitude != null ? Number(resumedDraft.latitude) : null,
    longitude: resumedDraft.longitude != null ? Number(resumedDraft.longitude) : null,
  } : entrySnapshot ? {
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

  var ocrResult = resumedDraft && resumedDraft.receiptId ? {
    receiptId: resumedDraft.receiptId,
    verified: true,
    orderDatetime: resumedDraft.orderDatetime || null,
    totalPrice: resumedDraft.totalPrice != null ? resumedDraft.totalPrice : null,
  } : null;

  // ---- 드롭존/미리보기는 eatty-ui.js가 처리, 여기서는 실행 버튼만 담당 ----
  var receiptDrop = document.getElementById("receiptDrop");
  // 파일을 고르면 미리보기가 바로 아래에 나오니, 클릭해서 선택하는 드롭존 박스는 중복이라 숨긴다
  // (2026-08-05 추가). 파일을 지우면 다시 보여준다.
  receiptDrop.addEventListener("eatty:filepicked", function () {
    receiptDrop.hidden = true;
  });
  // ---- 커스텀 카메라(2026-08-19 추가) ----
  // input의 capture="environment"만 쓰면 OS 기본 카메라 앱이 열려서 셔터음을 끌 수 없다. getUserMedia로
  // 카메라 스트림을 직접 받아 캡처하면 OS/브라우저 셔터음이 아예 재생되지 않는다. 카메라 접근이
  // 안 되는 환경(권한 거부, 미지원 브라우저, PC 등)에서는 원래 input 클릭(OS 파일선택/카메라)으로
  // 자동 폴백한다.
  (function () {
    var fileInput = document.getElementById("receiptFileInput");
    var modal = document.getElementById("receiptCameraModal");
    var video = document.getElementById("receiptCameraVideo");
    var canvas = document.getElementById("receiptCameraCanvas");
    var shutterBtn = document.getElementById("receiptCameraShutterBtn");
    var cancelBtn = document.getElementById("receiptCameraCancelBtn");
    var flipBtn = document.getElementById("receiptCameraFlipBtn");
    var helpBtn = document.getElementById("receiptCameraHelpBtn");
    var guideOverlay = document.getElementById("receiptCameraGuideOverlay");
    var guideCloseBtn = document.getElementById("receiptCameraGuideCloseBtn");
    var thumbSlot = document.getElementById("receiptCameraThumbSlot");
    var stream = null;
    var bypass = false; // 폴백으로 원래 input.click()을 트리거할 때 재차 가로채지 않기 위한 플래그
    var facingMode = "environment"; // 카메라 전환 버튼으로 "user"와 토글

    var supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    function stopStream() {
      if (stream) {
        stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null;
      }
      video.srcObject = null;
    }

    function closeModal() {
      modal.hidden = true;
      guideOverlay.classList.remove("is-open");
      stopStream();
    }

    function fallbackToNativePicker() {
      bypass = true;
      fileInput.click();
    }

    function openCamera() {
      modal.hidden = false;
      // 2026-08-19 추가 — 해상도 제약이 없으면 기기가 낮은 해상도를 골라 흐릿하게 나올 수 있어 ideal
      // 해상도를 명시. focusMode: continuous는 초점이 한 번 잡힌 뒤 안 바뀌던 문제(영수증처럼 가까운
      // 거리를 다시 겨눌 때) 대응 — 지원 안 하는 브라우저에선 무시되므로 안전하다.
      // (2026-08-19 수정 — 스트림을 받은 직후 track.applyConstraints()로 focusMode를 다시 한번 적용하는
      // 후처리를 넣었었는데, 그게 카메라 파이프라인을 재협상시켜서 프리뷰가 한 번씩 끊기는 원인으로
      // 보고됨. getUserMedia 호출 시점의 constraints만으로 충분하므로 후처리 호출은 제거한다.)
      stopStream();
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: "continuous",
          advanced: [{ focusMode: "continuous" }],
        },
        audio: false,
      })
        .then(function (s) {
          stream = s;
          video.srcObject = s;
        })
        .catch(function () {
          // 권한 거부/카메라 없음 등 — 모달 닫고 원래 방식(OS 카메라 앱/파일선택)으로 폴백
          modal.hidden = true;
          fallbackToNativePicker();
        });
    }

    shutterBtn.addEventListener("click", function () {
      if (!stream) return;
      var w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(video, 0, 0, w, h);
      thumbSlot.style.backgroundImage = "url(" + canvas.toDataURL("image/jpeg", 0.7) + ")";
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var file = new File([blob], "receipt-" + Date.now() + ".jpg", { type: "image/jpeg" });
        var dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        closeModal();
      }, "image/jpeg", 0.92);
    });

    cancelBtn.addEventListener("click", closeModal);

    // 2026-08-19 수정 — 썸네일로 사진첩 선택하는 기능을 넣었다가 제거함(영수증 인증 무결성 때문에
    // 실시간 촬영만 허용해야 한다는 판단). thumbSlot은 이제 클릭 불가, 마지막 촬영 미리보기만 표시.

    helpBtn.addEventListener("click", function () { guideOverlay.classList.add("is-open"); });
    guideCloseBtn.addEventListener("click", function () { guideOverlay.classList.remove("is-open"); });
    guideOverlay.addEventListener("click", function (e) {
      if (e.target === guideOverlay) guideOverlay.classList.remove("is-open"); // 바깥 영역 클릭으로도 닫힘
    });

    flipBtn.addEventListener("click", function () {
      facingMode = facingMode === "environment" ? "user" : "environment";
      openCamera();
    });

    if (supported) {
      fileInput.addEventListener("click", function (e) {
        if (bypass) { bypass = false; return; } // 폴백 클릭은 그대로 통과
        e.preventDefault();
        openCamera();
      });
    }
  })();

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
        // 2026-08-18 수정 — 예전엔 인증 실패(다른 매장 영수증 등)여도 일단 2단계로 넘어가서 박스 형태
        // 경고문을 보여주고 "정보 확인 완료" 버튼만 비활성화했다. 그러면 사용자가 못 쓰는 화면을 한 번
        // 더 거쳐야 했다 — 인증 실패는 그 자리(1단계)에서 토스트로 바로 알리고 다시 올리게 한다.
        if (!data.verified) {
          Eatty.toast("이 매장의 영수증으로 인증되지 않았어요. 영수증 상의 가게명이 선택한 매장과 다르면 리뷰를 작성할 수 없습니다. 다시 업로드해주세요.", "error");
          return;
        }
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
    badge.textContent = "인증 성공";
    badge.className = "e-badge e-badge-lg flex-none e-badge--success";

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
  }

  // ---- 메뉴 공개 토글(2026-08-18 추가) — 항목별이 아니라 목록 전체를 한 번에 공개/비공개하는
  // 단일 토글. 기본값은 공개(true), 사용자가 끄면 리뷰 등록 시 서버에 menuVisible: false로 전달된다.
  var menuVisibleToggle = document.getElementById("menuVisibleToggle");
  var menuVisibleLabel = document.getElementById("menuVisibleLabel");
  if (menuVisibleToggle) {
    menuVisibleToggle.addEventListener("change", function () {
      menuVisibleLabel.textContent = menuVisibleToggle.checked ? "공개하기" : "공개하지 않기";
    });
  }

  document.getElementById("ocrRetryBtn").addEventListener("click", function () { goStep(1); });
  document.getElementById("ocrConfirmBtn").addEventListener("click", function () {
    if (!ocrResult || !ocrResult.verified) return;
    document.getElementById("step3RestaurantName").textContent = restaurant.name;
    document.getElementById("step3VisitSummary").textContent = ocrResult.orderDatetime || "-";
    goStep(3);
  });
  document.getElementById("reviewBackBtn").addEventListener("click", function () { goStep(2); });

  // ---- 작성 중 이탈 감지(2026-08-12 추가) — 별점을 고르거나 내용을 입력한 뒤 페이지를 벗어나려 하면
  // 아래쪽의 링크 클릭 가로채기/beforeunload 핸들러가 이 플래그를 보고 임시저장 여부를 처리한다.
  var leaveGuardArmed = false;

  // ---- 별점 라벨 ----
  var LABELS = { 1: "많이 아쉬웠어요", 2: "조금 아쉬웠어요", 3: "보통이에요", 4: "만족했어요", 5: "아주 좋았어요!" };
  document.getElementById("reviewRatingInput").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rating-value]");
    if (!b) return;
    var v = Number(b.getAttribute("data-rating-value"));
    document.getElementById("reviewScoreLabel").textContent = LABELS[v];
    document.getElementById("ratingError").classList.remove("is-visible");
    leaveGuardArmed = true;
  });

  // ---- 태그 선택 개수(2026-08-18 — 최대 5개로 제한) ----
  var TAG_SELECT_LIMIT = 5;
  var tagInputs = document.querySelectorAll("#positiveTagList input, #negativeTagList input");
  tagInputs.forEach(function (i) {
    i.addEventListener("change", function () {
      var checked = Array.prototype.filter.call(tagInputs, function (x) { return x.checked; });
      if (checked.length > TAG_SELECT_LIMIT) {
        this.checked = false;
        Eatty.toast("태그는 최대 " + TAG_SELECT_LIMIT + "개까지 선택할 수 있어요.", "error");
        checked = Array.prototype.filter.call(tagInputs, function (x) { return x.checked; });
      }
      document.getElementById("tagSelectedCount").textContent = checked.length;
      leaveGuardArmed = true;
    });
  });
  var reviewContentInput = document.getElementById("reviewContent");
  if (reviewContentInput) reviewContentInput.addEventListener("input", function () { leaveGuardArmed = true; });

  // ---- 리뷰 사진(2026-08-10 추가, 최대 3장) ----
  var REVIEW_PHOTO_LIMIT = 3;
  var reviewPhotoFiles = [];
  var reviewPhotoInput = document.getElementById("reviewPhotoInput");
  var reviewPhotoAddBtn = document.getElementById("reviewPhotoAddBtn");
  var reviewPhotoList = document.getElementById("reviewPhotoList");
  var reviewPhotoCount = document.getElementById("reviewPhotoCount");

  function renderReviewPhotos() {
    reviewPhotoList.querySelectorAll("[data-photo-preview]").forEach(function (el) { el.remove(); });
    reviewPhotoFiles.forEach(function (file, index) {
      var url = URL.createObjectURL(file);
      var item = document.createElement("div");
      item.className = "relative w-20 h-20 rounded-[var(--r-md)] overflow-hidden flex-none";
      item.setAttribute("data-photo-preview", "");
      item.innerHTML =
        '<img src="' + url + '" class="w-full h-full object-cover" alt="첨부한 리뷰 사진 미리보기">' +
        '<button type="button" class="absolute right-1 top-1 w-5 h-5 rounded-full bg-black/50 text-white grid place-items-center" data-remove-photo="' + index + '" aria-label="사진 삭제">' +
          '<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>';
      reviewPhotoList.insertBefore(item, reviewPhotoAddBtn);
    });
    reviewPhotoCount.textContent = reviewPhotoFiles.length;
    reviewPhotoAddBtn.hidden = reviewPhotoFiles.length >= REVIEW_PHOTO_LIMIT;
  }

  if (reviewPhotoAddBtn && reviewPhotoInput) {
    reviewPhotoAddBtn.addEventListener("click", function () { reviewPhotoInput.click(); });
    reviewPhotoInput.addEventListener("change", function () {
      var picked = Array.prototype.slice.call(reviewPhotoInput.files || []);
      var room = REVIEW_PHOTO_LIMIT - reviewPhotoFiles.length;
      if (picked.length > room) {
        Eatty.toast("사진은 최대 " + REVIEW_PHOTO_LIMIT + "장까지 첨부할 수 있어요.", "error");
      }
      reviewPhotoFiles = reviewPhotoFiles.concat(picked.slice(0, room));
      reviewPhotoInput.value = "";
      renderReviewPhotos();
    });
    reviewPhotoList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-photo]");
      if (!btn) return;
      reviewPhotoFiles.splice(Number(btn.getAttribute("data-remove-photo")), 1);
      renderReviewPhotos();
    });
  }

  // ---- 리뷰 등록 ----
  document.getElementById("reviewForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var score = Number(document.getElementById("reviewScore").value);
    if (!score) {
      document.getElementById("ratingError").classList.add("is-visible");
      Eatty.toast("별점을 선택해주세요.", "error");
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
        menuVisible: menuVisibleToggle ? menuVisibleToggle.checked : true,
      },
    }).then(function (review) {
      // 리뷰 사진(2026-08-10 추가) — 리뷰 자체는 이미 등록됐으니, 사진 업로드가 실패해도 리뷰 등록
      // 자체를 실패로 보지 않는다(완료 화면은 그대로 보여주고 사진 실패만 토스트로 안내).
      var uploadPhotos = reviewPhotoFiles.length
        ? (function () {
            var formData = new FormData();
            reviewPhotoFiles.forEach(function (file) { formData.append("images", file); });
            return Api.request("/api/reviews/" + review.reviewId + "/images", { method: "POST", body: formData, isForm: true })
              .catch(function (err) { Eatty.toast((err && err.message) || "리뷰 사진 등록에 실패했습니다.", "error"); });
          })()
        : Promise.resolve();
      return uploadPhotos.then(function () {
        leaveGuardArmed = false;
        // 2026-08-13 수정 — currentDraftId(이 페이지 세션에서 "이어서 쓰기"로 들어왔을 때만 채워짐)만
        // 지우다 보니, 작성 도중 한 번이라도 다른 곳으로 나갔다가(자동 임시저장 생성) 다시 "새 리뷰
        // 쓰기"로 처음부터 새로 써서 등록을 마친 경우엔 그 예전 임시저장이 안 지워지고 그대로 남아있었다.
        // 같은 receiptId는 리뷰 하나에만 쓰일 수 있으므로, receiptId가 같은 임시저장은 세션과 무관하게
        // 전부 정리한다.
        var thisReceiptId = ocrResult && ocrResult.receiptId;
        writeDrafts(readDrafts().filter(function (d) {
          return d.draftId !== currentDraftId && d.receiptId !== thisReceiptId;
        }));
        currentDraftId = null;
        document.getElementById("step3Section").hidden = true;
        stepsRoot.parentElement.hidden = true;
        doneSection.hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }).catch(function (err) {
      Eatty.toast(err.message || "리뷰 등록에 실패했습니다.", "error");
    }).finally(function () { submitBtn.disabled = false; });
  });

  // ---- 임시저장(2026-08-12 추가, 2026-08-12 버튼 제거하고 이탈 시점으로 변경) — 별도 버튼 없이,
  // 작성 중(leaveGuardArmed)에 다른 페이지로 이동하려고 하면 그 시점에 저장한다. mypage-reviews.js가
  // 읽는 것과 동일한 localStorage 목록에 upsert. 영수증은 이미 인증된 상태이므로 receiptId만 있으면
  // 사진 재업로드 없이 복원 가능하다.
  function saveDraft() {
    if (!restaurant || !ocrResult || !ocrResult.receiptId) return false;
    var score = Number(document.getElementById("reviewScore").value);
    var content = document.getElementById("reviewContent").value.trim();
    // 2026-08-13 수정 — toISOString()은 항상 UTC라 "마지막 저장" 시각이 한국 시간보다 9시간 느리게
    // 보였다. 브라우저 로컬 시간(사용자가 보는 시계 기준) 그대로 저장한다.
    function formatLocalDateTime(d) {
      var pad = function (n) { return String(n).padStart(2, "0"); };
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
    var draftId = currentDraftId || ("draft-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
    var draft = {
      draftId: draftId,
      shopId: restaurant.restaurantId,
      shopName: restaurant.name,
      address: restaurant.address,
      roadAddress: restaurant.roadAddress,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      receiptId: ocrResult.receiptId,
      orderDatetime: ocrResult.orderDatetime || null,
      totalPrice: ocrResult.totalPrice != null ? ocrResult.totalPrice : null,
      rating: score,
      content: content,
      positiveTags: Array.prototype.filter.call(
        document.querySelectorAll("#positiveTagList input:checked"), function () { return true; }
      ).map(function (i) { return i.value; }),
      negativeTags: Array.prototype.filter.call(
        document.querySelectorAll("#negativeTagList input:checked"), function () { return true; }
      ).map(function (i) { return i.value; }),
      savedAt: formatLocalDateTime(new Date()),
    };
    var list = readDrafts().filter(function (d) { return d.draftId !== draftId; });
    list.unshift(draft);
    writeDrafts(list);
    currentDraftId = draftId;
    leaveGuardArmed = false;
    return true;
  }

  // 사이트 안에서 다른 페이지로 이동하는 링크(헤더 로고/메뉴 등)를 눌렀을 때는 브라우저 기본 confirm()
  // 대화상자로 저장 여부를 직접 묻는다(커스텀으로 만든 창이 아니라 window.confirm 자체가 브라우저 기본
  // 기능). "이전"(goStep) 버튼처럼 페이지 안에서만 이동하는 요소는 href가 없거나 "#"이라 걸리지 않는다.
  document.addEventListener("click", function (e) {
    if (!leaveGuardArmed) return;
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;
    e.preventDefault();
    var wantsSave = window.confirm("작성 중인 리뷰가 있습니다. 임시저장하고 이동할까요?\n(취소를 누르면 저장하지 않고 이동합니다)");
    if (wantsSave) saveDraft();
    leaveGuardArmed = false;
    window.location.href = a.href;
  }, true);

  // 새로고침/탭 닫기/주소창 직접 이동(2026-08-12 수정) — 이 경우는 브라우저가 커스텀 창을 막고 자기
  // 자신의 고정된 "나가시겠습니까?" 알럿만 허용한다(그 알럿에서 사용자가 뭘 선택했는지도 스크립트가 알
  // 방법이 없음, 브라우저 표준 정책). 위 링크 클릭과 동일하게 "브라우저 기본 알럿"으로 물어보되, 그
  // 알럿은 저장 여부를 선택할 수 없으므로 나가기 전에 항상 조용히 임시저장까지 함께 해둔다(선택해서 안
  // 나가면 그냥 leaveGuardArmed 유지, 다음에 또 이 핸들러가 실행됨).
  window.addEventListener("beforeunload", function (e) {
    if (!leaveGuardArmed) return;
    saveDraft();
    e.preventDefault();
    e.returnValue = "";
  });

  // ---- 임시저장 이어서 쓰기 복원(2026-08-12 추가) — 별점/태그/내용을 그대로 되돌려서 3단계로 바로 진입.
  if (resumedDraft && restaurant && ocrResult) {
    document.getElementById("step3RestaurantName").textContent = restaurant.name;
    document.getElementById("step3VisitSummary").textContent = ocrResult.orderDatetime || "-";

    var resumeRating = Number(resumedDraft.rating) || 0;
    document.getElementById("reviewScore").value = resumeRating;
    document.getElementById("reviewScoreText").textContent = resumeRating > 0 ? resumeRating.toFixed(1) : "-";
    document.getElementById("reviewScoreLabel").textContent = resumeRating > 0 ? LABELS[resumeRating] : "별점을 선택해주세요";
    document.querySelectorAll("#reviewRatingInput [data-rating-value]").forEach(function (b) {
      var v = Number(b.getAttribute("data-rating-value"));
      b.classList.toggle("is-on", v <= resumeRating);
      b.setAttribute("aria-checked", v === resumeRating ? "true" : "false");
    });

    var resumeKeywords = (resumedDraft.positiveTags || []).concat(resumedDraft.negativeTags || []);
    tagInputs.forEach(function (cb) { cb.checked = resumeKeywords.indexOf(cb.value) > -1; });
    document.getElementById("tagSelectedCount").textContent = resumeKeywords.length;

    if (reviewContentInput) {
      reviewContentInput.value = resumedDraft.content || "";
      reviewContentInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    leaveGuardArmed = false;

    goStep(3);
  }

  document.getElementById("writeAnotherBtn").addEventListener("click", function () {
    document.getElementById("reviewForm").reset();
    document.getElementById("reviewScore").value = "0";
    document.querySelectorAll("#reviewRatingInput [data-rating-value]").forEach(function (b) { b.classList.remove("is-on"); });
    document.getElementById("reviewScoreText").textContent = "-";
    document.getElementById("reviewScoreLabel").textContent = "별점을 선택해주세요";
    document.getElementById("tagSelectedCount").textContent = "0";
    ocrResult = null;
    reviewPhotoFiles = [];
    renderReviewPhotos();

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
    if (menuVisibleToggle) {
      menuVisibleToggle.checked = true;
      menuVisibleLabel.textContent = "공개하기";
    }

    goStep(1);
  });
})();
