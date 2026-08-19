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

  // 2026-08-19 재작업 — 촬영 즉시 자동 인식 + 인식완료 애니메이션 → 방문확인 카드로 넘어가는 흐름으로
  // 바뀌면서, "1 업로드 / 2 인식확인 / 3 리뷰작성" 숫자 스테퍼는 더 이상 안 쓴다(카메라가 곧바로 뜨는
  // 지금 구조에서는 "업로드 단계"라는 개념 자체가 없어져서 스테퍼가 오히려 혼란을 줌). 마크업/CSS는
  // 그대로 두고 항상 숨김 처리만 한다 — 다른 곳에서 다시 필요해지면 되돌리기 쉽게.
  function goStep(n) {
    Object.keys(sections).forEach(function (k) { sections[k].hidden = Number(k) !== n; });
    doneSection.hidden = true;
    stepsRoot.parentElement.hidden = true;
    // 2026-08-20 추가 — 방문확인 화면(2단계)은 참고 이미지처럼 헤더/하단 탭바 없이 카드만 꽉 차게
    // 몰입형으로 보여준다(eatty.css 참고).
    document.body.classList.toggle("e-immersive-step2", n === 2);
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
    category: entrySnapshot.category || null,
  } : null;

  if (!restaurant) {
    document.getElementById("noRestaurantAlert").hidden = false;
  }

  var ocrResult = resumedDraft && resumedDraft.receiptId ? {
    receiptId: resumedDraft.receiptId,
    verified: true,
    orderDatetime: resumedDraft.orderDatetime || null,
    totalPrice: resumedDraft.totalPrice != null ? resumedDraft.totalPrice : null,
  } : null;

  // ---- 드롭존/미리보기는 eatty-ui.js가 처리, 여기서는 실행 버튼만 담당 ----
  var receiptDrop = document.getElementById("receiptDrop");
  var successOverlay = document.getElementById("receiptCameraSuccessOverlay");
  var successImg = document.getElementById("receiptCameraSuccessImg");
  var bandsContainer = document.getElementById("receiptCameraBands");
  var wordBoxesContainer = document.getElementById("receiptCameraWordBoxes");
  var scanningCaption = document.getElementById("receiptCameraScanningCaption");
  var resultBadge = document.getElementById("receiptCameraResultBadge");
  var resultIcon = document.getElementById("receiptCameraResultIcon");
  var resultText = document.getElementById("receiptCameraResultText");

  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  // 2026-08-19 3차 수정 — 박스 여러 개가 한꺼번에 뜨는 대신, 바코드 스캐너처럼 얇은 선 하나만
  // 위아래로 훑도록 단순화(요청: "바코드 스캐너처럼 엄청 얇은 한 줄로").
  function playBands() {
    bandsContainer.innerHTML = "";
    var line = document.createElement("div");
    line.className = "e-camera-highlight-band";
    bandsContainer.appendChild(line);
  }

  function showResultBadge(ok) {
    resultBadge.className = "e-camera-result-badge is-shown " + (ok ? "is-success" : "is-fail");
    resultIcon.innerHTML = ok ? CHECK_SVG : X_SVG;
    resultText.textContent = ok ? "인식 성공" : "인식 실패";
  }

  // 2026-08-19 추가 — object-fit:contain인 <img>는 실제 그려지는 이미지가 박스 전체를 안 채우고
  // 위아래(또는 좌우)에 여백(letterbox)이 생길 수 있어서, 단순히 "이미지 박스의 N%" 위치로 계산하면
  // 어긋난다. naturalWidth/Height와 실제 렌더 크기를 비교해서 진짜 그려지는 영역만 계산한다.
  function containedImageRect(img) {
    var boxW = img.clientWidth, boxH = img.clientHeight;
    var natW = img.naturalWidth, natH = img.naturalHeight;
    if (!boxW || !boxH || !natW || !natH) return null;
    var scale = Math.min(boxW / natW, boxH / natH);
    var drawW = natW * scale, drawH = natH * scale;
    return { offsetX: (boxW - drawW) / 2, offsetY: (boxH - drawH) / 2, drawW: drawW, drawH: drawH };
  }

  // 실제 OCR이 인식한 줄 위치(ocr_lines, 0~1 정규화 좌표)를 촬영 사진 위에 그대로 초록 박스로
  // 표시한다(과장 없이 진짜 인식 위치 그대로 — 네이버 영수증 리뷰 참고 화면의 하이라이트와 동일한
  // 효과). 인식 성공 배지가 뜰 때 함께 순서대로(살짝 스태거) 나타난다.
  function renderWordBoxes(ocrLines) {
    wordBoxesContainer.innerHTML = "";
    if (!ocrLines || !ocrLines.length) return;
    var rect = containedImageRect(successImg);
    if (!rect) return;
    ocrLines.forEach(function (line, i) {
      var box = document.createElement("div");
      box.className = "e-camera-word-box";
      box.style.left = (rect.offsetX + line.x * rect.drawW) + "px";
      box.style.top = (rect.offsetY + line.y * rect.drawH) + "px";
      box.style.width = Math.max(line.w * rect.drawW, 4) + "px";
      box.style.height = Math.max(line.h * rect.drawH, 4) + "px";
      box.style.animationDelay = (i * 25) + "ms";
      wordBoxesContainer.appendChild(box);
    });
  }

  // 매장명/주소를 URL에 그대로 신뢰하지 않는 이 페이지의 원칙과 달리, 여기서는 "우리가 직접 갖고
  // 있던 restaurant 스냅샷"을 그대로 매장 상세 페이지로 되돌려 보내는 것뿐이라 안전하다.
  function buildShopDetailUrl() {
    if (!restaurant) return "explore";
    var params = new URLSearchParams({
      shopId: restaurant.restaurantId,
      name: restaurant.name || "",
      address: restaurant.address || "",
      roadAddress: restaurant.roadAddress || "",
      latitude: restaurant.latitude != null ? restaurant.latitude : "",
      longitude: restaurant.longitude != null ? restaurant.longitude : "",
    });
    return "explore?" + params.toString();
  }

  // 2026-08-19 재작업 — 사진이 어떤 경로로 선택됐든(우리가 만든 카메라의 셔터 / 카메라 권한이 막혀
  // OS 기본 카메라로 폴백한 경우 / PC 파일 선택) 이 이벤트 하나로 전부 모인다(eatty-ui.js가 file
  // input의 change를 처리한 뒤 항상 이걸 쏴줌). 그래서 "수동 OCR 인식 버튼을 눌러야만 다음으로
  // 넘어간다"는 문제를 경로에 상관없이 근본적으로 없애려면, 자동 OCR 실행을 여기 한 곳에서만
  // 처리하면 된다(예전엔 카메라 셔터 핸들러 안에서만 처리해서, 카메라가 못 열리고 OS 기본 카메라로
  // 폴백된 경우엔 여전히 수동 버튼이 필요했다).
  // 2026-08-19 후속 — 성공/실패 배지 추가. 실패 시엔 토스트 대신 빨간 X 배지를 보여준 뒤 매장 상세
  // 페이지로 돌려보낸다(이 페이지는 특정 매장 전용이라, 인증에 실패했으면 여기 계속 남아있을 이유가
  // 없다는 판단 — "OCR 버튼 있는 페이지로 가버린다"는 지적에 대한 근본 대응).
  receiptDrop.addEventListener("eatty:filepicked", function (e) {
    var file = e.detail && e.detail.file;
    if (!file || !restaurant) return;
    successImg.src = URL.createObjectURL(file);
    resultBadge.className = "e-camera-result-badge";
    wordBoxesContainer.innerHTML = "";
    scanningCaption.hidden = false;
    playBands(); // 결과가 올 때까지 계속 반복 재생(아래에서 결과가 오면 멈춘다)
    successOverlay.hidden = false;

    // 2026-08-19 수정 — 최소 대기시간을 인위적으로 두지 않는다. 실제 OCR 결과가 오기 전까지는
    // "인식 성공/실패" 배지가 절대 먼저 뜨면 안 된다는 지적 — 결과가 오는 즉시(길게 걸리면 길게,
    // 짧게 걸리면 짧게) 배지를 보여주고, 그 전까지는 줄 하이라이트가 계속 반복된다.
    runOcr(file, { silent: true }).then(function (ok) {
      bandsContainer.innerHTML = ""; // 반복 애니메이션 정지
      scanningCaption.hidden = true;
      showResultBadge(ok);
      if (ok && ocrResult) {
        // successImg가 이미 로드돼 있어야 clientWidth/naturalWidth를 정확히 잴 수 있다 — 캡처
        // 직후라 대부분 이미 로드돼 있지만, 혹시 아직이면 load 이벤트까지 기다린다.
        if (successImg.complete) {
          renderWordBoxes(ocrResult.ocrLines);
        } else {
          successImg.addEventListener("load", function onLoad() {
            successImg.removeEventListener("load", onLoad);
            renderWordBoxes(ocrResult.ocrLines);
          });
        }
      }
      window.setTimeout(function () {
        if (ok) {
          successOverlay.hidden = true;
        } else {
          window.location.href = buildShopDetailUrl();
        }
      }, 1800);
    });
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
    var stream = null;
    var bypass = false; // 폴백으로 원래 input.click()을 트리거할 때 재차 가로채지 않기 위한 플래그
    var guideShownOnce = false; // 카메라 첫 오픈 시 가이드 자동 표시(2026-08-20 추가) 여부
    var facingMode = "environment"; // 카메라 전환 버튼으로 "user"와 토글

    // 2026-08-19 수정 — getUserMedia 지원 여부만 보고 가로챘더니, 웹캠이 달린 PC에서도 파일 선택창
    // 대신 커스텀 카메라가 강제로 열려버렸다. capture="environment"는 원래 데스크톱 브라우저가 무시하고
    // 파일 선택창을 그대로 보여주는 속성이라, 그 원래 동작을 지켜야 한다 — 모바일 기기에서만 가로챈다.
    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    var supported = isMobile && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

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

    var cameraStartPrompt = document.getElementById("cameraStartPrompt");
    var cameraStartBtn = document.getElementById("cameraStartBtn");

    function openCamera(isAutoAttempt) {
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
          cameraStartPrompt.hidden = true;
          // 2026-08-20 추가 — 카메라를 처음 여는 순간 촬영 가이드를 1.5초 정도 자동으로 보여주고
          // 사라지게 한다(그동안은 "?" 버튼을 눌러야만 보였음). 세션당 한 번만.
          if (!guideShownOnce) {
            guideShownOnce = true;
            guideOverlay.classList.add("is-open");
            window.setTimeout(function () { guideOverlay.classList.remove("is-open"); }, 1500);
          }
        })
        .catch(function () {
          modal.hidden = true;
          if (isAutoAttempt) {
            // 페이지 진입 자동 시도가 실패한 경우(주로 iOS의 "실제 탭 필요" 정책) — 조용히 OS 기본
            // 카메라로 넘어가는 대신, 한 번 더 탭하면 우리 카메라가 확실히 열리도록 버튼을 보여준다.
            cameraStartPrompt.hidden = false;
          } else {
            // 사용자가 직접 탭했는데도 실패(권한 거부/카메라 없음 등) — 원래 방식(OS 카메라 앱/파일선택)으로 폴백
            fallbackToNativePicker();
          }
        });
    }

    if (cameraStartBtn) {
      cameraStartBtn.addEventListener("click", function () { openCamera(false); });
    }

    shutterBtn.addEventListener("click", function () {
      if (!stream) return;
      var w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(video, 0, 0, w, h);
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var file = new File([blob], "receipt-" + Date.now() + ".jpg", { type: "image/jpeg" });
        var dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        // 2026-08-19 재작업 — 촬영 즉시 OCR 자동 실행 + 인식완료 애니메이션은 이제 페이지 최상위의
        // eatty:filepicked 핸들러(위쪽, 카메라/OS폴백/PC선택 공통) 하나가 전담한다. 여기서는 파일만
        // 넘기고 모달을 바로 닫으면, 그 애니메이션이 카메라 모달보다 더 위(z-index 250)에서 이어서
        // 보이므로 시각적 끊김이 없다.
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        closeModal();
      }, "image/jpeg", 0.92);
    });

    // 2026-08-20 수정 — 카메라 취소(X)를 누르면 예전엔 모달만 닫혀서 뒤에 있던 옛날 업로드 화면이
    // 보였다. 그 화면 자체를 없앤 지금 구조에서는 취소 = "리뷰 작성을 그만둔다"는 뜻이므로 매장
    // 상세 페이지로 바로 돌려보낸다.
    cancelBtn.addEventListener("click", function () {
      window.location.href = buildShopDetailUrl();
    });

    // 2026-08-19 수정 — 썸네일로 사진첩 선택하는 기능을 넣었다가 제거함(영수증 인증 무결성 때문에
    // 실시간 촬영만 허용해야 한다는 판단). thumbSlot은 이제 클릭 불가, 마지막 촬영 미리보기만 표시.

    helpBtn.addEventListener("click", function () { guideOverlay.classList.add("is-open"); });
    guideCloseBtn.addEventListener("click", function () { guideOverlay.classList.remove("is-open"); });
    guideOverlay.addEventListener("click", function (e) {
      if (e.target === guideOverlay) guideOverlay.classList.remove("is-open"); // 바깥 영역 클릭으로도 닫힘
    });

    flipBtn.addEventListener("click", function () {
      facingMode = facingMode === "environment" ? "user" : "environment";
      openCamera(false);
    });

    if (supported) {
      fileInput.addEventListener("click", function (e) {
        if (bypass) { bypass = false; return; } // 폴백 클릭은 그대로 통과
        e.preventDefault();
        openCamera(false);
      });

      // 2026-08-19 추가 — "가게 상세 → 영수증으로 리뷰 작성하기" 버튼을 누르면 1단계 업로드 화면
      // (드롭존을 다시 클릭해야 카메라가 열리던 방식) 없이 카메라가 곧바로 뜨도록 한다. 임시저장을
      // 이어서 쓰는 진입(resumedDraft)은 이미 영수증 인증이 끝난 상태라 카메라가 필요 없으므로 제외.
      // isAutoAttempt=true — 실제 탭 없이 자동 실행이라 iOS 등에서 막히면 cameraStartPrompt로 안내한다.
      if (restaurant && !resumedDraft) {
        openCamera(true);
      }
    }
  })();

  // ---- OCR 실행(2026-08-19 리팩터링, 2026-08-20 수동 버튼 제거) — 예전엔 수동 "OCR 인식" 버튼과
  // 카메라 촬영 직후 자동 실행 두 곳에서 썼는데, 수동 버튼이 있던 화면 자체를 없애면서 이제 호출부는
  // eatty:filepicked 핸들러 하나뿐이다(공용 함수 구조는 그대로 유지). 성공 시 true, 실패(인증
  // 실패/에러) 시 false로
  // resolve하는 Promise를 돌려준다(호출자가 UI 후처리를 알아서 하도록).
  function runOcr(file, opts) {
    var silent = opts && opts.silent;
    if (!restaurant || !file) return Promise.resolve(false);
    var formData = new FormData();
    formData.append("image", file);
    formData.append("restaurantId", restaurant.restaurantId);
    formData.append("restaurantName", restaurant.name);

    return Api.request("/api/receipts", { method: "POST", isForm: true, body: formData })
      .then(function (data) {
        // 2026-08-18 수정 — 예전엔 인증 실패(다른 매장 영수증 등)여도 일단 2단계로 넘어가서 박스 형태
        // 경고문을 보여주고 "정보 확인 완료" 버튼만 비활성화했다. 그러면 사용자가 못 쓰는 화면을 한 번
        // 더 거쳐야 했다 — 인증 실패는 그 자리(1단계)에서 토스트로 바로 알리고 다시 올리게 한다.
        // 2026-08-19 추가 — silent(자동 촬영 흐름)면 토스트 대신 결과 오버레이의 빨간 X 배지로
        // 실패를 알리므로 여기서는 토스트를 띄우지 않는다(수동 "OCR 인식" 버튼 경로는 계속 토스트).
        if (!data.verified) {
          if (!silent) {
            Eatty.toast("이 매장의 영수증으로 인증되지 않았어요. 영수증 상의 가게명이 선택한 매장과 다르면 리뷰를 작성할 수 없습니다. 다시 업로드해주세요.", "error");
          }
          return false;
        }
        ocrResult = data;
        renderStep2(data);
        goStep(2);
        return true;
      })
      .catch(function (err) {
        if (!silent) Eatty.toast(err.message || "영수증 인식에 실패했습니다.", "error");
        return false;
      });
  }


  var WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];
  // "YYYY-MM-DD HH:mm[:ss]" 형태(서버가 그대로 내려주는 orderDatetime)를 파싱한다. 형식이 다르면
  // 그냥 원문을 그대로 보여주는 쪽으로 안전하게 폴백한다.
  function parseOrderDatetime(str) {
    if (!str) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(str);
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // ---- 방문확인 미니맵(2026-08-19 추가) — explore.js와 동일한 카테고리별 마커 이미지를 재사용한다
  // (파일이 달라 공유는 안 하고 값만 복제 — CLAUDE.md 2장에서 이미 굳어진 이 프로젝트의 패턴).
  // 드래그/줌/더블클릭 확대를 전부 꺼서 위치 확인용으로만 고정 표시한다.
  var CATEGORY_MARKER = {
    "한식": "img/markers/marker-korean.png",
    "양식": "img/markers/marker-western.png",
    "중식": "img/markers/marker-chinese.png",
    "일식": "img/markers/marker-japanese.png",
    "분식": "img/markers/marker-snack.png",
    "패스트푸드": "img/markers/marker-fastfood.png",
    "아시안": "img/markers/marker-asian.png",
    "술집": "img/markers/marker-bar.png",
    "뷔페": "img/markers/marker-buffet.png",
    "카페\디저트": "img/markers/marker-cafe.png",
  };
  var visitConfirmMap = null;
  function renderVisitConfirmMap() {
    var mapEl = document.getElementById("visitConfirmMap");
    if (!mapEl || !restaurant || restaurant.latitude == null || restaurant.longitude == null) return;
    if (!window.naver || !window.naver.maps) return;
    var center = new naver.maps.LatLng(restaurant.latitude, restaurant.longitude);
    if (!visitConfirmMap) {
      visitConfirmMap = new naver.maps.Map(mapEl, {
        center: center, zoom: 16,
        draggable: false, scrollWheel: false, pinchZoom: false,
        disableDoubleClickZoom: true, disableDoubleTapZoom: true, disableTwoFingerTapZoom: true,
        keyboardShortcuts: false, scaleControl: false, zoomControl: false, mapDataControl: false,
      });
      var iconUrl = CATEGORY_MARKER[restaurant.category];
      new naver.maps.Marker({
        position: center, map: visitConfirmMap, title: restaurant.name,
        icon: iconUrl ? { url: iconUrl, size: new naver.maps.Size(27, 35), scaledSize: new naver.maps.Size(27, 35), anchor: new naver.maps.Point(13.5, 35) } : undefined,
      });
    } else {
      visitConfirmMap.setCenter(center);
    }
  }

  var visitShopLabel = "";
  var visitDate = null; // 화면 표시용(수정 가능) Date — 실제 인증에 쓰인 영수증 원본과는 별개

  // 방문확인 카드의 제목/날짜칩/시간칩을 다시 그린다 — 최초 렌더와, 사용자가 "수정"으로 날짜/시간을
  // 직접 바꿨을 때 둘 다 이 함수 하나로 처리한다.
  function renderVisitDateUI() {
    if (visitDate) {
      document.getElementById("visitConfirmTitle").innerHTML =
        (visitDate.getMonth() + 1) + "월 " + visitDate.getDate() + "일 " + WEEKDAY_KR[visitDate.getDay()] + "요일에<br>" +
        escapeHtml(visitShopLabel) + " 다녀오셨네요!";
      document.getElementById("visitConfirmDate").textContent =
        (visitDate.getMonth() + 1) + "월 " + visitDate.getDate() + "일 " + WEEKDAY_KR[visitDate.getDay()];
      var hour24 = visitDate.getHours();
      var ampm = hour24 < 12 ? "오전" : "오후";
      var hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
      document.getElementById("visitConfirmTime").textContent =
        ampm + " " + hour12 + ":" + String(visitDate.getMinutes()).padStart(2, "0");
    } else {
      document.getElementById("visitConfirmTitle").textContent = escapeHtml(visitShopLabel) + " 다녀오셨네요!";
      document.getElementById("visitConfirmDate").textContent = "-";
      document.getElementById("visitConfirmTime").textContent = "-";
    }
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  // ---- 날짜/시간 수정용 iOS 스타일 휠 피커(2026-08-20 재작업) — 네이티브 input[type=date/time]은
  // OS가 그리는 부분이라 우리가 모양을 못 바꾼다("100% 동일하게 만들어달라"는 요청에 대응하려면
  // 직접 만든 스크롤 휠 컴포넌트가 필요했다). 화면 표시용으로만 수정한다(서버에 반영하는 API가
  // 없어 영수증 인증 원본 데이터는 그대로다).
  var ROW_H = 40;
  var wheelBackdrop = document.getElementById("wheelBackdrop");
  var wheelSheet = document.getElementById("wheelSheet");
  var wheelCols = document.getElementById("wheelCols");
  var wheelConfirmBtn = document.getElementById("wheelConfirmBtn");
  var wheelOnConfirm = null;
  var wheelColEls = [];

  function buildWheelColumn(values, selectedIndex) {
    var col = document.createElement("div");
    col.className = "e-wheel-col";
    values.forEach(function (v) {
      var item = document.createElement("div");
      item.className = "e-wheel-col-item";
      item.textContent = v.label;
      col.appendChild(item);
    });
    wheelCols.appendChild(col);
    // 최초 위치를 선택값으로 스크롤(애니메이션 없이 즉시) — 시트가 열리는 트랜지션과 겹치지 않게
    // 다음 프레임에 설정한다.
    requestAnimationFrame(function () { col.scrollTop = selectedIndex * ROW_H; });
    return col;
  }

  // columns: [{ values: [{label}], selectedIndex }, ...]. onConfirm(selectedIndexes)에서 각 열의
  // 최종 선택 인덱스 배열을 받는다.
  function openWheelPicker(columns, onConfirm) {
    wheelCols.innerHTML = "";
    wheelColEls = columns.map(function (c) { return buildWheelColumn(c.values, c.selectedIndex); });
    wheelOnConfirm = onConfirm;
    wheelBackdrop.hidden = false;
    wheelSheet.hidden = false;
    requestAnimationFrame(function () {
      wheelBackdrop.classList.add("is-open");
      wheelSheet.classList.add("is-open");
    });
  }
  function closeWheelPicker() {
    wheelBackdrop.classList.remove("is-open");
    wheelSheet.classList.remove("is-open");
    window.setTimeout(function () { wheelBackdrop.hidden = true; wheelSheet.hidden = true; }, 260);
  }
  wheelBackdrop.addEventListener("click", closeWheelPicker);
  wheelConfirmBtn.addEventListener("click", function () {
    var indexes = wheelColEls.map(function (col) {
      var idx = Math.round(col.scrollTop / ROW_H);
      return Math.max(0, Math.min(idx, col.children.length - 1));
    });
    if (wheelOnConfirm) wheelOnConfirm(indexes);
    closeWheelPicker();
  });

  var YEAR_RANGE = []; // 현재 연도 기준 -5 ~ +2
  (function () {
    var y0 = new Date().getFullYear() - 5;
    for (var i = 0; i < 8; i++) YEAR_RANGE.push(y0 + i);
  })();
  function daysInMonth(year, month1to12) { return new Date(year, month1to12, 0).getDate(); }

  function openDateWheel() {
    var base = visitDate || new Date();
    var yIdx = Math.max(0, YEAR_RANGE.indexOf(base.getFullYear()));
    var mIdx = base.getMonth(); // 0-11
    var dCount = daysInMonth(base.getFullYear(), mIdx + 1);
    var dIdx = Math.min(base.getDate(), dCount) - 1;
    openWheelPicker([
      { values: YEAR_RANGE.map(function (y) { return { label: y + "년" }; }), selectedIndex: yIdx },
      { values: Array.from({ length: 12 }, function (_, i) { return { label: (i + 1) + "월" }; }), selectedIndex: mIdx },
      { values: Array.from({ length: dCount }, function (_, i) { return { label: (i + 1) + "일" }; }), selectedIndex: dIdx },
    ], function (idx) {
      var y = YEAR_RANGE[idx[0]], m = idx[1] + 1, dMax = daysInMonth(y, m), d = Math.min(idx[2] + 1, dMax);
      var d2 = visitDate || new Date();
      visitDate = new Date(y, m - 1, d, d2.getHours(), d2.getMinutes());
      renderVisitDateUI();
    });
  }

  function openTimeWheel() {
    var base = visitDate || new Date();
    var hour24 = base.getHours();
    var ampmIdx = hour24 < 12 ? 0 : 1;
    var hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    openWheelPicker([
      { values: [{ label: "오전" }, { label: "오후" }], selectedIndex: ampmIdx },
      { values: Array.from({ length: 12 }, function (_, i) { return { label: String(i + 1) }; }), selectedIndex: hour12 - 1 },
      { values: Array.from({ length: 60 }, function (_, i) { return { label: pad2(i) }; }), selectedIndex: base.getMinutes() },
    ], function (idx) {
      var isPm = idx[0] === 1;
      var h12 = idx[1] + 1;
      var h24 = isPm ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
      var d2 = visitDate || new Date();
      visitDate = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate(), h24, idx[2]);
      renderVisitDateUI();
    });
  }

  document.getElementById("visitConfirmDateEditBtn").addEventListener("click", openDateWheel);
  document.getElementById("visitConfirmTimeEditBtn").addEventListener("click", openTimeWheel);

  function renderStep2(data) {
    document.getElementById("ocrShopName").textContent = data.storeName || restaurant.name || "-";
    document.getElementById("ocrTotalAmount").textContent = data.totalPrice != null ? Number(data.totalPrice).toLocaleString() + "원" : "-";
    document.getElementById("ocrVisitDatetime").textContent = data.orderDatetime || "-";

    // "다녀오셨네요" 방문 확인 카드
    visitDate = parseOrderDatetime(data.orderDatetime);
    visitShopLabel = (data.storeName || restaurant.name || "").length > 10
      ? (data.storeName || restaurant.name).slice(0, 10) + "..."
      : (data.storeName || restaurant.name || "");
    renderVisitDateUI();
    document.getElementById("visitConfirmAddress").textContent = restaurant.roadAddress || restaurant.address || "-";
    renderVisitConfirmMap();

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

  // 2026-08-20 수정 — "이 장소가 아니에요"를 누르면 1단계(업로드) 화면으로 되돌아갔는데, 지금 구조는
  // 그 화면 자체를 안 쓰기로 했으므로(1/2/3 스테퍼 제거와 같은 맥락) 아예 매장 상세 페이지로 돌려보낸다.
  document.getElementById("ocrRetryBtn").addEventListener("click", function () {
    window.location.href = buildShopDetailUrl();
  });
  document.getElementById("visitConfirmCloseBtn").addEventListener("click", function () {
    window.location.href = buildShopDetailUrl();
  });
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

  // 2026-08-20 수정 — 카메라가 자동으로 뜨는 지금 구조에서는 이 페이지 안에서 다시 처음(1단계)으로
  // 되돌아가도 카메라가 다시 열리지 않는다(자동 오픈은 페이지 로드 시 한 번뿐). "또 작성하기"는
  // 매장 상세로 돌아가서 "리뷰 작성"을 다시 누르는 걸로 대체한다 — 완전히 새로 시작하는 게 더 확실하다.
  document.getElementById("writeAnotherBtn").addEventListener("click", function () {
    window.location.href = buildShopDetailUrl();
  });
})();
