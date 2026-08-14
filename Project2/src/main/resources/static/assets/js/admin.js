(function () {
  var REASON_LABELS = { SPAM: "광고 · 도배성 내용", ABUSE: "욕설 · 비방", FALSE_INFO: "허위 사실", PRIVACY: "개인정보 노출", ETC: "기타" };
  function reasonLabel(code) { return REASON_LABELS[code] || code || "-"; }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(iso) { return iso ? String(iso).slice(0, 10) : "-"; }
  function fmtDateTime(iso) { return iso ? String(iso).replace("T", " ").slice(0, 16) : "-"; }
  function starsHtml(rating) {
    var r = Number(rating) || 0, html = "";
    for (var i = 1; i <= 5; i++) {
      html += '<svg viewBox="0 0 24 24" fill="currentColor" class="' + (i <= Math.round(r) ? "is-on" : "") + '">' +
        '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>';
    }
    return html + '<span class="e-rating-score">' + r.toFixed(1) + '</span>';
  }

  // 관리자가 아닌 계정은 아예 데이터 요청을 하지 않고 그 자리에서 바로 메인으로 돌려보낸다(2026-08-07
  // 수정) — 예전엔 로그인 여부만 확인하고 각 섹션(대시보드/회원/신고/리뷰/모니터링)이 각자 API를 병렬로
  // 호출한 뒤 403이 올 때마다 authRequest()가 alert()를 띄웠는데, 그 호출이 5~6개라 alert가 그만큼
  // 연달아 뜨고 마지막 걸 닫아야 리다이렉트가 되는 것처럼 보이는 문제가 있었다.
  if (!Api.requireRole("ADMIN", "index")) return;

  var state = { members: [], reviews: [], reportRows: [] };

  function authRequest(path, options) {
    return Api.request(path, options).catch(function (err) {
      if (err && err.status === 401) {
        Api.clearSession();
        window.location.href = "login";
      } else if (err && err.status === 403) {
        window.location.href = "index";
      }
      throw err;
    });
  }

  // ---- 섹션 전환 ----
  var SECTIONS = {
    dashboard: document.getElementById("sectionDashboard"),
    members: document.getElementById("sectionMembers"),
    reports: document.getElementById("sectionReports"),
    reviews: document.getElementById("sectionReviews"),
    monitor: document.getElementById("sectionMonitor"),
    // 2026-08-14 신규 — 약관/개인정보처리방침 버전 관리 + 변경 공지 게시.
    terms: document.getElementById("sectionTerms"),
  };
  function showSection(id) {
    Object.keys(SECTIONS).forEach(function (k) { SECTIONS[k].hidden = k !== id; });
    document.querySelectorAll(".e-admin-side-link[data-admin-nav]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-admin-nav") === id);
    });
    document.body.classList.remove("adminSideOpen");
    // Eatty.closeDrawer()로 닫아야 사이드바 자신뿐 아니라 짝을 이루는 어두운 backdrop
    // ([data-drawer-backdrop="adminSide"])의 is-open도 함께 지워진다(2026-08-07 수정) — 예전엔
    // 사이드바 요소의 is-open만 직접 지워서, 모바일에서 메뉴를 눌러 이동해도 backdrop이 계속 화면을
    // 덮은 채로 남아있었다.
    Eatty.closeDrawer("adminSide");
  }
  document.addEventListener("click", function (e) {
    var nav = e.target.closest("[data-admin-nav]");
    if (!nav) return;
    e.preventDefault();
    showSection(nav.getAttribute("data-admin-nav"));
  });
  var initial = (location.hash || "#dashboard").replace("#section", "").replace("#", "") || "dashboard";
  if (!SECTIONS[initial]) initial = "dashboard";
  showSection(initial);

  // ---- 관리자 프로필 표시 ----
  Api.request("/api/members/me").then(function (me) {
    ["adminSideName", "adminTopbarName", "adminMenuName"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = me.nickname || "관리자";
    });
    var sideEmail = document.getElementById("adminSideEmail");
    if (sideEmail) sideEmail.textContent = me.email || "";
    var menuEmail = document.getElementById("adminMenuEmail");
    if (menuEmail) menuEmail.textContent = me.email || "";
    // 기본 프로필(이미지 없음)이면 다른 페이지(헤더/드로어)와 동일하게 닉네임 첫 글자를 보여준다
    // (2026-08-06 수정 — 예전엔 "관"으로 항상 고정돼 있었다).
    var avatarEl = document.getElementById("adminTopbarAvatar");
    if (avatarEl) {
      if (me.profileImageUrl) {
        avatarEl.innerHTML = '<img src="' + me.profileImageUrl + '" class="size-full object-cover rounded-full" alt="프로필 사진">';
      } else if (me.nickname) {
        avatarEl.textContent = me.nickname.charAt(0);
      }
    }
  }).catch(function () {});

  // ==========================================================
  // 대시보드
  // ==========================================================
  function renderDashboard(dash) {
    document.getElementById("kpiTotalMembers").textContent = dash.memberTotal.toLocaleString() + "명";
    document.getElementById("kpiGeneralMembers").textContent = dash.memberGeneral.toLocaleString() + "명";
    document.getElementById("kpiBusinessMembers").textContent = dash.memberBusiness.toLocaleString() + "명";
    document.getElementById("kpiAdminMembers").textContent = dash.memberAdmin.toLocaleString() + "명";
    document.getElementById("kpiTotalReviews").textContent = dash.reviewTotal.toLocaleString() + "건";
    document.getElementById("kpiReportedReviews").textContent = dash.reviewReported.toLocaleString();
  }
  function updatePendingBadge() {
    var pending = state.reportRows.filter(function (r) { return r.status === "PENDING"; }).length;
    document.getElementById("kpiPendingReports").textContent = pending + "건";
    var sideBadge = document.getElementById("sidePendingReportBadge");
    sideBadge.hidden = pending === 0;
    sideBadge.textContent = pending;
  }

  // 공지 발송(2026-08-06 추가) — ★ POST /api/admin/notifications/broadcast
  var broadcastForm = document.getElementById("broadcastForm");
  if (broadcastForm) {
    broadcastForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var titleInput = document.getElementById("broadcastTitle");
      var bodyInput = document.getElementById("broadcastBody");
      var title = titleInput.value.trim();
      if (!title) { Eatty.toast("제목을 입력해주세요.", "error"); return; }

      var submitBtn = document.getElementById("broadcastSubmitBtn");
      submitBtn.disabled = true;
      authRequest("/api/admin/notification-broadcasts", {
        method: "POST",
        body: { title: title, body: bodyInput.value.trim() },
      })
        .then(function (res) {
          Eatty.toast(res.message || "공지를 발송했습니다.", "success");
          titleInput.value = "";
          bodyInput.value = "";
        })
        .catch(function (err) { Eatty.toast(err.message || "공지 발송에 실패했습니다.", "error"); })
        .finally(function () { submitBtn.disabled = false; });
    });
  }

  // ==========================================================
  // 회원 관리
  // ==========================================================
  var memberSearchInput = document.getElementById("memberSearchInput");
  var memberRoleFilter = document.getElementById("memberRoleFilter");
  var memberStatusFilter = document.getElementById("memberStatusFilter");
  var memberSortSelect = document.getElementById("memberSortSelect");
  var memberTableBody = document.getElementById("memberTableBody");
  var memberCheckAll = document.getElementById("memberCheckAll");
  var bulkActionBar = document.getElementById("bulkActionBar");

  var ROLE_LABEL = { USER: "일반", BUSINESS: "사업자", ADMIN: "관리자" };
  var STATUS_LABEL = { ACTIVE: "정상", SUSPENDED: "정지", WITHDRAWN: "탈퇴" };

  function renderMemberRow(m) {
    var tr = document.createElement("tr");
    tr.setAttribute("data-member-id", m.memberId);
    var disabled = m.role === "ADMIN" || m.status === "WITHDRAWN";
    var actionBtn = m.status === "SUSPENDED"
      ? '<button type="button" class="btn btn-outline btn-xs" data-release-member>해제</button>'
      : (m.role !== "ADMIN" && m.status !== "WITHDRAWN"
        ? '<button type="button" class="btn btn-danger-soft btn-xs" data-suspend-member data-modal-open="suspendModal">정지</button>'
        : "");
    tr.innerHTML =
      '<td><label class="e-check"><input type="checkbox" name="memberCheck" value="' + m.memberId + '"' + (disabled ? " disabled" : "") + '><span class="sr-only-e">선택</span></label></td>' +
      '<td><div class="flex items-center gap-2.5"><span class="e-avatar e-avatar-xs flex-none" aria-hidden="true">' + escapeHtml((m.nickname || "?").charAt(0)) + '</span>' +
      '<div class="min-w-0"><p class="cell-strong truncate">' + escapeHtml(m.nickname) + '</p><p class="t-xs truncate">' + escapeHtml(m.email) + '</p></div></div></td>' +
      '<td><span class="e-badge e-badge--gray">' + (ROLE_LABEL[m.role] || m.role) + '</span></td>' +
      '<td><span class="e-status ' + (m.status === "ACTIVE" ? "e-status--on" : m.status === "SUSPENDED" ? "e-status--off" : "e-status--idle") + ' !text-[12.5px]">' + (STATUS_LABEL[m.status] || m.status) + '</span></td>' +
      '<td class="t-num t-sm">' + fmtDate(m.createdAt) + '</td>' +
      '<td class="cell-actions"><button type="button" class="btn btn-ghost btn-xs" data-view-member data-modal-open="memberDetailModal">상세</button> ' + actionBtn + '</td>';
    return tr;
  }

  function filteredMembers() {
    var q = memberSearchInput.value.trim().toLowerCase();
    var role = memberRoleFilter.value;
    var status = memberStatusFilter.value;
    var list = state.members.filter(function (m) {
      if (q && (m.email || "").toLowerCase().indexOf(q) === -1 && (m.nickname || "").toLowerCase().indexOf(q) === -1) return false;
      if (role !== "all" && m.role !== role.toUpperCase()) return false;
      if (status !== "all" && m.status !== status.toUpperCase()) return false;
      return true;
    });
    list.sort(function (a, b) {
      var da = new Date(a.createdAt).getTime(), db = new Date(b.createdAt).getTime();
      return memberSortSelect.value === "oldest" ? da - db : db - da;
    });
    return list;
  }
  function renderMembers() {
    var list = filteredMembers();
    memberTableBody.innerHTML = "";
    list.forEach(function (m) { memberTableBody.appendChild(renderMemberRow(m)); });
    memberCheckAll.checked = false;
    updateBulkBar();
  }
  [memberSearchInput, memberRoleFilter, memberStatusFilter, memberSortSelect].forEach(function (el) {
    el.addEventListener("input", renderMembers);
    el.addEventListener("change", renderMembers);
  });
  document.getElementById("memberFilterResetBtn").addEventListener("click", function () {
    memberSearchInput.value = "";
    memberRoleFilter.value = "all";
    memberStatusFilter.value = "all";
    memberSortSelect.value = "recent";
    renderMembers();
  });

  function updateBulkBar() {
    var checked = memberTableBody.querySelectorAll('input[name="memberCheck"]:checked');
    bulkActionBar.hidden = checked.length === 0;
    document.getElementById("selectedCount").textContent = checked.length;
  }
  memberCheckAll.addEventListener("change", function () {
    memberTableBody.querySelectorAll('input[name="memberCheck"]:not(:disabled)').forEach(function (cb) { cb.checked = memberCheckAll.checked; });
    updateBulkBar();
  });
  memberTableBody.addEventListener("change", function (e) {
    if (e.target.name === "memberCheck") updateBulkBar();
  });

  function findMember(id) { return state.members.find(function (m) { return String(m.memberId) === String(id); }); }

  var suspendTargetId = null;
  memberTableBody.addEventListener("click", function (e) {
    var row = e.target.closest("tr[data-member-id]");
    if (!row) return;
    var id = row.getAttribute("data-member-id");
    var m = findMember(id);
    if (e.target.closest("[data-view-member]")) {
      document.getElementById("memberDetailName").textContent = m.nickname;
      document.getElementById("memberDetailAvatar").textContent = (m.nickname || "?").charAt(0);
      document.getElementById("memberDetailRole").textContent = ROLE_LABEL[m.role] || m.role;
      // 2026-08-13 수정 — 상태 뱃지 class가 "e-status--on"으로 고정돼 있어서 정지된 회원도 항상
      // 초록불로 보이던 문제. 목록 행(위 STATUS_KIND 매핑)과 동일한 규칙으로 맞춘다.
      var statusEl = document.getElementById("memberDetailStatus");
      statusEl.textContent = STATUS_LABEL[m.status] || m.status;
      statusEl.classList.remove("e-status--on", "e-status--off", "e-status--idle");
      statusEl.classList.add(m.status === "ACTIVE" ? "e-status--on" : m.status === "SUSPENDED" ? "e-status--off" : "e-status--idle");
      document.getElementById("memberDetailEmail").textContent = m.email;
      document.getElementById("memberDetailJoined").textContent = fmtDate(m.createdAt);
      document.getElementById("memberDetailId").textContent = m.memberId;

      // 하단 액션 버튼도 항상 "정지 처리"로 고정돼 있어서, 이미 정지된 회원을 봐도 또 정지시키려는
      // 버튼만 나오고 해제할 방법이 없었다 — 상태에 따라 정지/해제로 전환한다.
      var actionBtn = document.getElementById("memberDetailActionBtn");
      if (m.status === "SUSPENDED") {
        actionBtn.textContent = "정지 해제";
        actionBtn.removeAttribute("data-modal-open");
        actionBtn.setAttribute("data-modal-close", "");
        actionBtn.setAttribute("data-detail-release-member", id);
      } else {
        actionBtn.textContent = "정지 처리";
        actionBtn.setAttribute("data-modal-open", "suspendModal");
        actionBtn.removeAttribute("data-detail-release-member");
      }
    } else if (e.target.closest("[data-suspend-member]")) {
      suspendTargetId = id;
      document.getElementById("suspendTargetName").textContent = m.nickname;
    } else if (e.target.closest("[data-release-member]")) {
      authRequest("/api/admin/members/" + id, { method: "PATCH", body: { status: "ACTIVE" } })
        .then(function () { Eatty.toast("정지를 해제했습니다.", "success"); reloadAll(); })
        .catch(function (err) { Eatty.toast(err.message || "처리에 실패했습니다.", "error"); });
    }
  });
  document.getElementById("memberDetailActionBtn").addEventListener("click", function (e) {
    var releaseId = e.currentTarget.getAttribute("data-detail-release-member");
    if (!releaseId) return; // "정지 처리" 모드일 땐 data-modal-open이 알아서 suspendModal을 연다.
    authRequest("/api/admin/members/" + releaseId, { method: "PATCH", body: { status: "ACTIVE" } })
      .then(function () { Eatty.toast("정지를 해제했습니다.", "success"); reloadAll(); })
      .catch(function (err) { Eatty.toast(err.message || "처리에 실패했습니다.", "error"); });
  });
  document.getElementById("suspendConfirmBtn").addEventListener("click", function () {
    if (!suspendTargetId) return;
    authRequest("/api/admin/members/" + suspendTargetId, { method: "PATCH", body: { status: "SUSPENDED" } })
      .then(function () { Eatty.closeModal("suspendModal"); Eatty.toast("정지 처리했습니다.", "success"); reloadAll(); })
      .catch(function (err) { Eatty.toast(err.message || "처리에 실패했습니다.", "error"); });
  });
  document.getElementById("bulkSuspendBtn").addEventListener("click", function () {
    var ids = Array.prototype.map.call(memberTableBody.querySelectorAll('input[name="memberCheck"]:checked'), function (cb) { return cb.value; });
    Promise.all(ids.map(function (id) { return authRequest("/api/admin/members/" + id, { method: "PATCH", body: { status: "SUSPENDED" } }).catch(function () {}); }))
      .then(function () { Eatty.toast(ids.length + "명을 정지 처리했습니다.", "success"); reloadAll(); });
  });
  document.getElementById("bulkReleaseBtn").addEventListener("click", function () {
    var ids = Array.prototype.map.call(memberTableBody.querySelectorAll('input[name="memberCheck"]:checked'), function (cb) { return cb.value; });
    Promise.all(ids.map(function (id) { return authRequest("/api/admin/members/" + id, { method: "PATCH", body: { status: "ACTIVE" } }).catch(function () {}); }))
      .then(function () { Eatty.toast(ids.length + "명의 정지를 해제했습니다.", "success"); reloadAll(); });
  });

  // ==========================================================
  // 리뷰 관리
  // ==========================================================
  var reviewSearchInput = document.getElementById("reviewSearchInput");
  var reviewRatingFilter = document.getElementById("reviewRatingFilter");
  var reviewSortSelect = document.getElementById("reviewSortSelect");
  var adminReviewTableBody = document.getElementById("adminReviewTableBody");
  var reviewCheckAll = document.getElementById("reviewCheckAll");
  var reviewBulkBar = document.getElementById("reviewBulkBar");

  function renderReviewRow(r) {
    var tr = document.createElement("tr");
    tr.setAttribute("data-review-id", r.reviewId);
    tr.innerHTML =
      '<td><label class="e-check"><input type="checkbox" name="reviewCheck" value="' + r.reviewId + '"><span class="sr-only-e">선택</span></label></td>' +
      '<td class="cell-strong t-num">#' + r.reviewId + '</td>' +
      '<td class="cell-strong">' + escapeHtml(r.restaurantName || r.restaurantId) + '</td>' +
      '<td><p class="t-sm font-semibold">' + escapeHtml(r.nickname) + '</p></td>' +
      '<td><span class="e-rating">' + starsHtml(r.rating) + '</span></td>' +
      '<td><p class="t-sm t-clamp-2">' + escapeHtml(r.content || "") + '</p></td>' +
      '<td><div class="e-tag-wrap">' + (r.keywords || []).map(function (k) { return '<span class="e-tag">' + escapeHtml(k) + '</span>'; }).join("") + '</div></td>' +
      '<td class="t-num t-sm">' + fmtDate(r.createdAt) + '</td>' +
      '<td class="cell-actions"><button type="button" class="btn btn-ghost btn-xs" data-view-review data-modal-open="adminReviewModal">원문</button> ' +
      '<button type="button" class="btn btn-danger-soft btn-xs" data-delete-review data-modal-open="deleteReviewModal">삭제</button></td>';
    return tr;
  }
  function filteredReviews() {
    var q = reviewSearchInput.value.trim().toLowerCase();
    var rating = reviewRatingFilter.value;
    var list = state.reviews.filter(function (r) {
      if (rating !== "all" && String(r.rating) !== rating) return false;
      if (q) {
        var hay = ((r.restaurantName || "") + " " + (r.nickname || "") + " " + (r.content || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      if (reviewSortSelect.value === "rating-low") return a.rating - b.rating;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return list;
  }
  function renderReviews() {
    var list = filteredReviews();
    adminReviewTableBody.innerHTML = "";
    list.forEach(function (r) { adminReviewTableBody.appendChild(renderReviewRow(r)); });
    reviewCheckAll.checked = false;
    updateReviewBulkBar();
  }
  [reviewSearchInput, reviewRatingFilter, reviewSortSelect].forEach(function (el) {
    el.addEventListener("input", renderReviews);
    el.addEventListener("change", renderReviews);
  });
  document.getElementById("adminReviewResetBtn").addEventListener("click", function () {
    reviewSearchInput.value = "";
    reviewRatingFilter.value = "all";
    reviewSortSelect.value = "recent";
    renderReviews();
  });
  function updateReviewBulkBar() {
    var checked = adminReviewTableBody.querySelectorAll('input[name="reviewCheck"]:checked');
    reviewBulkBar.hidden = checked.length === 0;
    document.getElementById("reviewSelectedCount").textContent = checked.length;
  }
  reviewCheckAll.addEventListener("change", function () {
    adminReviewTableBody.querySelectorAll('input[name="reviewCheck"]').forEach(function (cb) { cb.checked = reviewCheckAll.checked; });
    updateReviewBulkBar();
  });
  adminReviewTableBody.addEventListener("change", function (e) { if (e.target.name === "reviewCheck") updateReviewBulkBar(); });

  function findReview(id) { return state.reviews.find(function (r) { return String(r.reviewId) === String(id); }); }
  var deleteReviewTargetId = null;
  adminReviewTableBody.addEventListener("click", function (e) {
    var row = e.target.closest("tr[data-review-id]");
    if (!row) return;
    var id = row.getAttribute("data-review-id");
    var r = findReview(id);
    if (e.target.closest("[data-view-review]")) {
      document.getElementById("adminReviewId").textContent = "#" + r.reviewId;
      document.getElementById("adminReviewShop").textContent = r.restaurantName || r.restaurantId;
      document.getElementById("adminReviewAuthor").textContent = r.nickname;
      document.getElementById("adminReviewDate").textContent = fmtDateTime(r.createdAt);
      document.getElementById("adminReviewRating").innerHTML = starsHtml(r.rating);
      document.getElementById("adminReviewContent").textContent = r.content || "";
      document.getElementById("adminReviewTags").innerHTML = (r.keywords || []).map(function (k) { return '<span class="e-tag">' + escapeHtml(k) + '</span>'; }).join("");
      document.getElementById("adminReviewDeleteBtn").setAttribute("data-review-id", r.reviewId);
    } else if (e.target.closest("[data-delete-review]")) {
      deleteReviewTargetId = id;
      document.getElementById("deleteReviewTarget").textContent = "#" + r.reviewId + " · " + (r.restaurantName || r.restaurantId);
    }
  });
  document.getElementById("adminReviewDeleteBtn").addEventListener("click", function () {
    deleteReviewTargetId = this.getAttribute("data-review-id");
    var r = findReview(deleteReviewTargetId);
    document.getElementById("deleteReviewTarget").textContent = "#" + r.reviewId + " · " + (r.restaurantName || r.restaurantId);
    Eatty.closeModal("adminReviewModal");
    Eatty.openModal("deleteReviewModal");
  });
  document.getElementById("deleteReviewConfirmBtn").addEventListener("click", function () {
    if (!deleteReviewTargetId) return;
    authRequest("/api/admin/reviews/" + deleteReviewTargetId, { method: "DELETE" })
      .then(function () { Eatty.closeModal("deleteReviewModal"); Eatty.toast("리뷰를 삭제했습니다.", "success"); reloadAll(); })
      .catch(function (err) { Eatty.toast(err.message || "삭제에 실패했습니다.", "error"); });
  });
  document.getElementById("reviewBulkDeleteBtn").addEventListener("click", function () {
    var ids = Array.prototype.map.call(adminReviewTableBody.querySelectorAll('input[name="reviewCheck"]:checked'), function (cb) { return cb.value; });
    if (!ids.length) return;
    Promise.all(ids.map(function (id) { return authRequest("/api/admin/reviews/" + id, { method: "DELETE" }).catch(function () {}); }))
      .then(function () { Eatty.toast(ids.length + "건을 삭제했습니다.", "success"); reloadAll(); });
  });

  // ==========================================================
  // 신고 관리 (리뷰 신고 + 채팅 신고 통합)
  // ==========================================================
  function mapReviewReport(r) {
    return {
      id: "review-" + r.reviewId, kind: "REVIEW", reviewId: r.reviewId,
      category: reasonLabel(r.latestReasonCode),
      // 2026-08-13 수정 — "대상"엔 가게 이름이 아니라 신고당한 리뷰를 쓴 사람이 나와야 하고, "신고자"는
      // "-"가 아니라 실제로 신고한 사람(여러 명이면 가장 최근 신고자 기준)이 나와야 한다.
      content: "신고 " + r.reportCount + "건 · 최근 사유: " + reasonLabel(r.latestReasonCode) + " · " + r.restaurantName,
      target: r.authorNickname, targetLabel: r.authorNickname, reporter: r.latestReporterNickname || "-",
      status: r.status, date: r.latestReportedAt,
    };
  }
  function mapChatReport(c) {
    var isRoom = c.targetType === "ROOM";
    return {
      id: (isRoom ? "chatroom-" : "chatmsg-") + c.chatReportId, kind: isRoom ? "CHATROOM" : "CHAT",
      chatReportId: c.chatReportId, chatRoomId: c.chatRoomId, chatMessageId: c.chatMessageId,
      category: reasonLabel(c.reasonCode), content: c.detail || "(상세 내용 없음)",
      target: isRoom ? c.roomTitle : c.contentSnapshot, targetLabel: c.roomTitle,
      reporter: c.reporterNickname, status: c.status, date: c.createdAt,
    };
  }
  var reportTypeFilter = document.getElementById("reportTypeFilter");
  var reportSearchInput = document.getElementById("reportSearchInput");

  function renderReportRow(r, showActions) {
    var tr = document.createElement("tr");
    tr.setAttribute("data-report-id", r.id);
    var typeBadge = r.kind === "REVIEW" ? '<span class="e-badge e-badge--brand">리뷰</span>'
      : r.kind === "CHATROOM" ? '<span class="e-badge e-badge--info">채팅방</span>'
      : '<span class="e-badge e-badge--info">채팅</span>';
    var actionsHtml = "";
    if (showActions === "pending") {
      actionsHtml = '<button type="button" class="btn btn-primary btn-xs" data-handle-report data-modal-open="handleReportModal">처리</button>';
    }
    tr.innerHTML =
      "<td>" + typeBadge + "</td>" +
      '<td><p class="cell-strong">' + escapeHtml(r.category) + '</p><p class="t-xs mt-1 t-clamp-2">' + escapeHtml(r.content) + '</p></td>' +
      '<td><p class="t-sm t-clamp-2">' + escapeHtml(r.targetLabel || r.target || "-") + '</p></td>' +
      '<td class="t-sm">' + escapeHtml(r.reporter || "-") + '</td>' +
      '<td class="t-num t-sm">' + fmtDate(r.date) + '</td>' +
      (showActions === "pending" ? '<td class="cell-actions">' + actionsHtml + '</td>' : "");
    return tr;
  }
  function filteredReports(status) {
    var type = reportTypeFilter.value;
    var q = reportSearchInput.value.trim().toLowerCase();
    return state.reportRows.filter(function (r) {
      if (r.status !== status) return false;
      if (type === "review" && r.kind !== "REVIEW") return false;
      if (type === "chat" && r.kind === "REVIEW") return false;
      if (q) {
        var hay = ((r.category || "") + " " + (r.target || "") + " " + (r.reporter || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }
  function renderReports() {
    var pending = filteredReports("PENDING");
    var done = filteredReports("RESOLVED");
    var rejected = filteredReports("REJECTED");
    var pendingBody = document.getElementById("reportPendingBody");
    var doneBody = document.getElementById("reportDoneBody");
    var rejectedBody = document.getElementById("reportRejectedBody");
    pendingBody.innerHTML = ""; doneBody.innerHTML = ""; rejectedBody.innerHTML = "";
    pending.forEach(function (r) { pendingBody.appendChild(renderReportRow(r, "pending")); });
    done.forEach(function (r) { doneBody.appendChild(renderReportRow(r)); });
    rejected.forEach(function (r) { rejectedBody.appendChild(renderReportRow(r)); });

    document.getElementById("reportCountPending").textContent = "대기 " + pending.length;
    document.getElementById("reportCountDone").textContent = "완료 " + done.length;
    document.getElementById("reportCountRejected").textContent = "반려 " + rejected.length;
    document.getElementById("tabCountPending").textContent = pending.length;
    document.getElementById("tabCountDone").textContent = done.length;
    document.getElementById("tabCountRejected").textContent = rejected.length;
    updatePendingBadge();
  }
  [reportTypeFilter, reportSearchInput].forEach(function (el) {
    el.addEventListener("input", renderReports);
    el.addEventListener("change", renderReports);
  });

  function findReport(id) { return state.reportRows.find(function (r) { return r.id === id; }); }
  var handleReportTarget = null;
  document.getElementById("reportPendingBody").addEventListener("click", function (e) {
    var row = e.target.closest("tr[data-report-id]");
    if (!row || !e.target.closest("[data-handle-report]")) return;
    var r = findReport(row.getAttribute("data-report-id"));
    handleReportTarget = r;
    document.getElementById("handleReportType").textContent = r.kind === "REVIEW" ? "리뷰 신고" : r.kind === "CHATROOM" ? "채팅방 신고" : "채팅 메시지 신고";
    document.getElementById("handleReportReporter").textContent = r.reporter || "-";
    document.getElementById("handleReportDate").textContent = fmtDateTime(r.date);
    document.getElementById("handleReportReasonBadge").textContent = r.category;
    document.getElementById("handleReportDetail").textContent = r.content;
    document.getElementById("reportTargetContent").textContent = r.target || "-";
    document.getElementById("reportDeleteContentCheck").checked = false;
  });

  function resolveOrReject(action) {
    if (!handleReportTarget) return;
    var r = handleReportTarget;
    var path = r.kind === "REVIEW"
      ? "/api/admin/reports/" + r.reviewId
      : "/api/admin/chat-reports/" + r.chatReportId;
    var status = action === "resolve" ? "RESOLVED" : "REJECTED";
    var deleteContent = document.getElementById("reportDeleteContentCheck").checked;
    authRequest(path, { method: "PATCH", body: { status: status } }).then(function () {
      if (deleteContent && action === "resolve") {
        var delPath = r.kind === "REVIEW" ? "/api/admin/reviews/" + r.reviewId
          : r.kind === "CHATROOM" ? "/api/admin/chat-rooms/" + r.chatRoomId
          : "/api/admin/chat-messages/" + r.chatMessageId;
        return authRequest(delPath, { method: "DELETE" }).catch(function () {});
      }
    }).then(function () {
      Eatty.closeModal("handleReportModal");
      Eatty.toast(action === "resolve" ? "신고를 처리했습니다." : "신고를 반려했습니다.", "success");
      reloadAll();
    }).catch(function (err) { Eatty.toast(err.message || "처리에 실패했습니다.", "error"); });
  }
  document.getElementById("handleReportConfirmBtn").addEventListener("click", function () { resolveOrReject("resolve"); });
  document.getElementById("handleReportRejectBtn").addEventListener("click", function () { resolveOrReject("reject"); });

  // ==========================================================
  // 서버 모니터링
  // ==========================================================
  var STATUS_KIND = { UP: "e-status--on", CONFIGURED: "e-status--on", DOWN: "e-status--off", NOT_CONFIGURED: "e-status--idle" };
  var STATUS_TEXT = { UP: "정상", CONFIGURED: "설정됨", DOWN: "장애", NOT_CONFIGURED: "미설정" };
  function renderMonitor(items) {
    var body = document.getElementById("monitorTableBody");
    body.innerHTML = items.map(function (it) {
      return '<tr class="svc-row"><td class="cell-strong">' + escapeHtml(it.name) + '</td>' +
        '<td><span class="e-status ' + (STATUS_KIND[it.status] || "e-status--idle") + ' !text-[12.5px]">' + (STATUS_TEXT[it.status] || it.status) + '</span></td>' +
        '<td class="cell-num">' + (it.latencyMs != null ? it.latencyMs + "ms" : "-") + '</td>' +
        '<td class="t-sm t-muted">' + escapeHtml(it.detail || "-") + '</td></tr>';
    }).join("");
    var overallBadge = document.getElementById("monitorOverallStatus");
    var allUp = items.every(function (it) { return it.status === "UP" || it.status === "CONFIGURED" || it.status === "NOT_CONFIGURED"; });
    overallBadge.className = "e-badge e-badge-lg " + (allUp ? "e-badge--success" : "e-badge--danger");
    overallBadge.textContent = allUp ? "전체 정상" : "일부 장애";
    var quick = document.getElementById("quickMonitorStatus");
    if (quick) quick.textContent = allUp ? "전체 정상" : "일부 장애 확인 필요";
  }
  function loadMonitor() {
    return authRequest("/api/admin/status").then(renderMonitor).catch(function () {});
  }
  var monitorTimer = null;
  function scheduleMonitor() {
    clearInterval(monitorTimer);
    if (document.getElementById("monitorAutoRefreshSwitch").checked) {
      monitorTimer = setInterval(loadMonitor, 5000);
    }
  }
  document.getElementById("monitorAutoRefreshSwitch").addEventListener("change", scheduleMonitor);

  // ==========================================================
  // 전역 로드
  // ==========================================================
  function reloadAll() {
    return Promise.all([
      authRequest("/api/admin/dashboard"),
      authRequest("/api/admin/members"),
      authRequest("/api/admin/reviews"),
      authRequest("/api/admin/reports?status=PENDING"),
      authRequest("/api/admin/reports?status=RESOLVED"),
      authRequest("/api/admin/reports?status=REJECTED"),
      authRequest("/api/admin/chat-reports?status=PENDING"),
      authRequest("/api/admin/chat-reports?status=RESOLVED"),
      authRequest("/api/admin/chat-reports?status=REJECTED"),
    ]).then(function (results) {
      var dash = results[0], members = results[1], reviews = results[2];
      var reportRows = []
        .concat(results[3].map(mapReviewReport), results[4].map(mapReviewReport), results[5].map(mapReviewReport))
        .concat(results[6].map(mapChatReport), results[7].map(mapChatReport), results[8].map(mapChatReport));

      state.members = members;
      state.reviews = reviews;
      state.reportRows = reportRows;

      renderDashboard(dash);
      renderMembers();
      renderReviews();
      renderReports();
      document.getElementById("adminLastUpdated").textContent = new Date().toLocaleTimeString();
    }).catch(function (err) {
      // 2026-08-12 수정 — 예전엔 실패를 그냥 삼켜서 관리자가 갱신이 안 됐는지 알 방법이 없었다.
      Eatty.toast((err && err.message) || "데이터를 불러오지 못했습니다.", "error");
      throw err; // 호출부(갱신 버튼 등)가 성공 여부를 구분할 수 있도록 다시 던진다.
    });
  }

  // 2026-08-12 추가 — 갱신 버튼을 눌렀을 때 성공해도 아무 반응이 없어 "갱신됐나?" 헷갈린다는 지적으로
  // 성공 토스트 추가(실패는 위 reloadAll()의 catch가 이미 토스트로 안내하므로 여기선 조용히 무시).
  document.getElementById("adminRefreshBtn").addEventListener("click", function () {
    reloadAll().then(function () { Eatty.toast("최신 데이터로 갱신했습니다.", "success"); }).catch(function () {});
  });
  var adminSearchInput = document.getElementById("adminSearchInput");
  adminSearchInput.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    showSection("members");
    memberSearchInput.value = this.value;
    renderMembers();
  });

  // 검색창 X(지우기) 버튼(2026-08-06 추가) — explore.html의 searchClearBtn과 동일한 패턴.
  var adminSearchClearBtn = document.getElementById("adminSearchClearBtn");
  if (adminSearchClearBtn) {
    adminSearchClearBtn.addEventListener("click", function () { adminSearchInput.value = ""; adminSearchInput.focus(); });
  }
  var memberSearchClearBtn = document.getElementById("memberSearchClearBtn");
  if (memberSearchClearBtn) {
    memberSearchClearBtn.addEventListener("click", function () {
      memberSearchInput.value = "";
      memberSearchInput.focus();
      renderMembers();
    });
  }
  var reportSearchClearBtn = document.getElementById("reportSearchClearBtn");
  if (reportSearchClearBtn) {
    reportSearchClearBtn.addEventListener("click", function () {
      reportSearchInput.value = "";
      reportSearchInput.focus();
      renderReports();
    });
  }
  var reviewSearchClearBtn = document.getElementById("reviewSearchClearBtn");
  if (reviewSearchClearBtn) {
    reviewSearchClearBtn.addEventListener("click", function () {
      reviewSearchInput.value = "";
      reviewSearchInput.focus();
      renderReviews();
    });
  }

  // ================================================================
  // 약관 관리 (2026-08-14 신규) — 새 버전 등록 + 변경 공지 게시를 한 폼으로 처리한다(백엔드
  // POST /api/admin/terms/{docType}/versions가 이미 둘을 한 번에 묶어서 처리함). 다른 섹션들처럼
  // reloadAll()의 Promise.all에 끼워 넣지 않고, "약관 관리" 탭을 눌렀을 때만 지연 로드한다 — 자주 안 쓰는
  // 관리 기능까지 매 5초 폴링/새로고침에 묶으면 불필요한 API 호출만 늘어난다.
  var termsDocTypeSelect = document.getElementById("termsDocTypeSelect");
  var termsVersionTableBody = document.getElementById("termsVersionTableBody");
  var termsNoticeTableBody = document.getElementById("termsNoticeTableBody");
  var termsVersionForm = document.getElementById("termsVersionForm");
  var termsNoticeTypeField = document.getElementById("termsNoticeTypeField");
  var termsLeadTimeHint = document.getElementById("termsLeadTimeHint");
  var termsLoaded = false;

  function termsDocTypeLabel(docType) {
    return docType === "PRIVACY" ? "개인정보처리방침" : "이용약관";
  }

  function loadTermsVersions() {
    if (!termsDocTypeSelect) return;
    var docType = termsDocTypeSelect.value;
    authRequest("/api/admin/terms/" + docType + "/versions").then(function (list) {
      termsVersionTableBody.innerHTML = "";
      if (!list.length) {
        termsVersionTableBody.innerHTML = '<tr><td colspan="4" class="t-sm">등록된 버전이 없습니다.</td></tr>';
        return;
      }
      list.forEach(function (v) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>v" + escapeHtml(v.versionLabel) + (v.current ? ' <span class="e-badge e-badge--brand">현재</span>' : "") + "</td>" +
          "<td>" + escapeHtml(v.title) + "</td>" +
          "<td>" + fmtDate(v.effectiveDate) + "</td>" +
          "<td>" + (v.termsDocumentId || "-") + "</td>";
        termsVersionTableBody.appendChild(tr);
      });
    });
  }

  function loadTermsNotices() {
    if (!termsNoticeTableBody) return;
    authRequest("/api/admin/notices").then(function (list) {
      termsNoticeTableBody.innerHTML = "";
      if (!list.length) {
        termsNoticeTableBody.innerHTML = '<tr><td colspan="5" class="t-sm">게시된 공지가 없습니다.</td></tr>';
        return;
      }
      list.forEach(function (n) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + termsDocTypeLabel(n.docType) + "</td>" +
          "<td>" + escapeHtml(n.title) + "</td>" +
          "<td>" + (n.noticeType === "MAJOR" ? "큰 변경" : "작은 변경") + "</td>" +
          "<td>" + fmtDate(n.effectiveDate) + "</td>" +
          "<td>" + fmtDateTime(n.postedAt) + "</td>";
        termsNoticeTableBody.appendChild(tr);
      });
    });
  }

  function loadTermsSection() {
    loadTermsVersions();
    loadTermsNotices();
  }

  if (termsDocTypeSelect) {
    termsDocTypeSelect.addEventListener("change", loadTermsVersions);
  }

  // 관리자 화면에서도 14일/30일 규칙을 즉시 안내(실제 검증은 서버가 최종적으로 다시 한다 — 클라이언트
  // 검증은 사용자 경험을 위한 보조 수단일 뿐, 신뢰의 기준은 항상 서버 쪽 검증이다).
  if (termsNoticeTypeField) {
    termsNoticeTypeField.addEventListener("change", updateTermsLeadTimeHint);
  }
  var termsEffectiveDateInput = document.getElementById("termsEffectiveDateInput");
  if (termsEffectiveDateInput) {
    termsEffectiveDateInput.addEventListener("change", updateTermsLeadTimeHint);
  }
  function updateTermsLeadTimeHint() {
    if (!termsLeadTimeHint) return;
    var noticeType = termsNoticeTypeField ? termsNoticeTypeField.value : "";
    var requiredDays = noticeType === "MAJOR" ? 30 : 14;
    var effectiveDateStr = termsEffectiveDateInput ? termsEffectiveDateInput.value : "";
    if (!effectiveDateStr) {
      termsLeadTimeHint.textContent = "시행일 최소 " + requiredDays + "일 전(변경 유형 기준)까지 등록해야 합니다.";
      return;
    }
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var effectiveDate = new Date(effectiveDateStr + "T00:00:00");
    var leadDays = Math.round((effectiveDate - today) / (1000 * 60 * 60 * 24));
    var ok = leadDays >= requiredDays;
    termsLeadTimeHint.textContent = (ok ? "✓ " : "⚠ ") + "시행일까지 " + leadDays + "일 남음 (필요: " + requiredDays + "일 이상)";
    termsLeadTimeHint.style.color = ok ? "var(--success, #16a34a)" : "var(--danger, #dc2626)";
  }

  if (termsVersionForm) {
    termsVersionForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var docType = termsDocTypeSelect.value;
      var body = {
        title: document.getElementById("termsTitleInput").value.trim(),
        content: document.getElementById("termsContentInput").value,
        effectiveDate: document.getElementById("termsEffectiveDateInput").value,
        changeSummary: document.getElementById("termsChangeSummaryInput").value.trim(),
        noticeType: termsNoticeTypeField.value || null,
        versionLabel: document.getElementById("termsVersionLabelInput").value.trim() || null,
      };
      if (!body.title || !body.content || !body.effectiveDate) {
        Eatty.toast("제목, 본문, 시행일자를 모두 입력해주세요.", "error");
        return;
      }
      authRequest("/api/admin/terms/" + docType + "/versions", { method: "POST", body: body })
        .then(function (res) {
          Eatty.toast(res.message || "등록되었습니다.", "success");
          termsVersionForm.reset();
          updateTermsLeadTimeHint();
          loadTermsSection();
        })
        .catch(function (err) {
          Eatty.toast((err && err.message) || "등록에 실패했습니다.", "error");
        });
    });
  }

  // "약관 관리" 탭에 처음 들어올 때만 로드(reloadAll()과 별도 경로).
  var termsNavLinks = document.querySelectorAll('[data-admin-nav="terms"]');
  termsNavLinks.forEach(function (a) {
    a.addEventListener("click", function () {
      if (termsLoaded) return;
      termsLoaded = true;
      loadTermsSection();
      updateTermsLeadTimeHint();
    });
  });
  if (initial === "terms") {
    termsLoaded = true;
    loadTermsSection();
    updateTermsLeadTimeHint();
  }

  reloadAll();
  loadMonitor();
  scheduleMonitor();
})();
