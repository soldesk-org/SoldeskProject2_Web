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

  if (!Api.isLoggedIn()) { window.location.href = "login"; return; }

  var state = { members: [], reviews: [], reportRows: [] };

  function authRequest(path, options) {
    return Api.request(path, options).catch(function (err) {
      if (err && err.status === 401) {
        Api.clearSession();
        window.location.href = "login";
      } else if (err && err.status === 403) {
        window.alert("관리자 권한이 없는 계정입니다.");
        window.location.href = Api.landingPageForRole();
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
  };
  function showSection(id) {
    Object.keys(SECTIONS).forEach(function (k) { SECTIONS[k].hidden = k !== id; });
    document.querySelectorAll(".e-admin-side-link[data-admin-nav]").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-admin-nav") === id);
    });
    document.body.classList.remove("adminSideOpen");
    document.getElementById("adminSide").classList.remove("is-open");
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
  }).catch(function () {});

  // ==========================================================
  // 대시보드
  // ==========================================================
  function renderDashboard(dash) {
    document.getElementById("kpiTotalMembers").textContent = dash.memberTotal.toLocaleString();
    document.getElementById("kpiGeneralMembers").textContent = dash.memberGeneral.toLocaleString();
    document.getElementById("kpiBusinessMembers").textContent = dash.memberBusiness.toLocaleString();
    document.getElementById("kpiAdminMembers").textContent = dash.memberAdmin.toLocaleString();
    document.getElementById("kpiTotalReviews").textContent = dash.reviewTotal.toLocaleString();
    document.getElementById("kpiReportedReviews").textContent = dash.reviewReported.toLocaleString();
  }
  function updatePendingBadge() {
    var pending = state.reportRows.filter(function (r) { return r.status === "PENDING"; }).length;
    document.getElementById("kpiPendingReports").textContent = pending;
    var sideBadge = document.getElementById("sidePendingReportBadge");
    sideBadge.hidden = pending === 0;
    sideBadge.textContent = pending;
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
    document.getElementById("memberTotalCount").textContent = list.length;
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
      document.getElementById("memberDetailStatus").textContent = STATUS_LABEL[m.status] || m.status;
      document.getElementById("memberDetailEmail").textContent = m.email;
      document.getElementById("memberDetailJoined").textContent = fmtDate(m.createdAt);
      document.getElementById("memberDetailId").textContent = m.memberId;
    } else if (e.target.closest("[data-suspend-member]")) {
      suspendTargetId = id;
      document.getElementById("suspendTargetName").textContent = m.nickname;
    } else if (e.target.closest("[data-release-member]")) {
      authRequest("/api/admin/members/" + id + "/unsuspend", { method: "PATCH" })
        .then(function () { Eatty.toast("정지를 해제했습니다.", "success"); reloadAll(); })
        .catch(function (err) { Eatty.toast(err.message || "처리에 실패했습니다.", "error"); });
    }
  });
  document.getElementById("suspendConfirmBtn").addEventListener("click", function () {
    if (!suspendTargetId) return;
    authRequest("/api/admin/members/" + suspendTargetId + "/suspend", { method: "PATCH" })
      .then(function () { Eatty.closeModal("suspendModal"); Eatty.toast("정지 처리했습니다.", "success"); reloadAll(); })
      .catch(function (err) { Eatty.toast(err.message || "처리에 실패했습니다.", "error"); });
  });
  document.getElementById("bulkSuspendBtn").addEventListener("click", function () {
    var ids = Array.prototype.map.call(memberTableBody.querySelectorAll('input[name="memberCheck"]:checked'), function (cb) { return cb.value; });
    Promise.all(ids.map(function (id) { return authRequest("/api/admin/members/" + id + "/suspend", { method: "PATCH" }).catch(function () {}); }))
      .then(function () { Eatty.toast(ids.length + "명을 정지 처리했습니다.", "success"); reloadAll(); });
  });
  document.getElementById("bulkReleaseBtn").addEventListener("click", function () {
    var ids = Array.prototype.map.call(memberTableBody.querySelectorAll('input[name="memberCheck"]:checked'), function (cb) { return cb.value; });
    Promise.all(ids.map(function (id) { return authRequest("/api/admin/members/" + id + "/unsuspend", { method: "PATCH" }).catch(function () {}); }))
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
      '<td>' + (r.keywords || []).map(function (k) { return '<span class="e-tag">' + escapeHtml(k) + '</span>'; }).join(" ") + '</td>' +
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
    document.getElementById("reviewTotalCount").textContent = list.length;
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
      content: "신고 " + r.reportCount + "건 · 최근 사유: " + reasonLabel(r.latestReasonCode),
      target: r.content, targetLabel: r.restaurantName, reporter: "-",
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
      ? "/api/admin/reports/" + r.reviewId + "/" + action
      : "/api/admin/chat-reports/" + r.chatReportId + "/" + action;
    var deleteContent = document.getElementById("reportDeleteContentCheck").checked;
    authRequest(path, { method: "PATCH" }).then(function () {
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

  document.getElementById("parkingSyncBtn").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    btn.classList.add("is-loading");
    authRequest("/api/admin/parking-lots/sync?maxPages=5", { method: "POST" })
      .then(function (res) {
        document.getElementById("parkingSyncStatus").textContent = "실행 완료";
        document.getElementById("parkingSyncCount").textContent = res.facilitySynced;
        document.getElementById("parkingSyncedAt").textContent = new Date().toLocaleString();
        Eatty.toast(res.message || "주차장 데이터를 동기화했습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "동기화에 실패했습니다.", "error"); })
      .finally(function () { btn.disabled = false; btn.classList.remove("is-loading"); });
  });

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
    }).catch(function () {});
  }

  document.getElementById("adminRefreshBtn").addEventListener("click", reloadAll);
  document.getElementById("adminSearchInput").addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    showSection("members");
    memberSearchInput.value = this.value;
    renderMembers();
  });

  reloadAll();
  loadMonitor();
  scheduleMonitor();
})();
