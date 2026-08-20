/* ---------------------------------------------------------------------------
   admin-test — 실제 /api/admin/* 엔드포인트에 연결된 테스트 스크립트
   2026-08-20 재작성 — 예전엔 전부 mock(_mock:true)이었다. 이제 Api.request()로 실제 fetch를
   보내고, 실패하면 status/message를 그대로 화면에 보여준다.
   --------------------------------------------------------------------------- */
(function () {
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(s) {
    if (!s) return "-";
    return String(s).replace("T", " ").slice(0, 16);
  }
  function errText(err) {
    if (!err) return "알 수 없는 오류";
    var status = err.status != null ? err.status + " " : "";
    return status + (err.message || err.code || "요청 실패");
  }

  /* ---------------- API 테스트 콘솔 ---------------- */
  var apiOut = document.getElementById("apiResponseBox");
  var apiStatusEl = document.getElementById("apiStatusText");

  function sendApiRequest(method, path, bodyText) {
    var t0 = performance.now();
    var options = { method: method };
    if (bodyText && method !== "GET" && method !== "DELETE") {
      try { options.body = JSON.parse(bodyText); }
      catch (e) {
        apiOut.textContent = "Request Body가 올바른 JSON이 아닙니다: " + e.message;
        apiStatusEl.textContent = "ERROR";
        apiStatusEl.className = "tstatus tstatus--err";
        return;
      }
    }
    apiStatusEl.textContent = "요청 중...";
    apiStatusEl.className = "tstatus";
    Api.request(path, options)
      .then(function (data) {
        var ms = Math.round(performance.now() - t0);
        apiOut.textContent = JSON.stringify(data, null, 2);
        apiStatusEl.textContent = "200 OK · " + ms + "ms";
        apiStatusEl.className = "tstatus tstatus--ok";
      })
      .catch(function (err) {
        var ms = Math.round(performance.now() - t0);
        apiOut.textContent = JSON.stringify(err, null, 2);
        apiStatusEl.textContent = errText(err) + " · " + ms + "ms";
        apiStatusEl.className = "tstatus tstatus--err";
      });
  }

  document.getElementById("apiPresetList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-preset-path]");
    if (!b) return;
    document.getElementById("apiMethodSelect").value = b.getAttribute("data-preset-method");
    document.getElementById("apiPathInput").value = b.getAttribute("data-preset-path");
  });

  document.getElementById("apiSendBtn").addEventListener("click", function () {
    var method = document.getElementById("apiMethodSelect").value;
    var path = document.getElementById("apiPathInput").value.trim();
    var body = document.getElementById("apiBodyInput").value.trim();
    if (!path) return;
    sendApiRequest(method, path, body);
  });

  /* ---------------- 회원 관리 ---------------- */
  var memberTbody = document.querySelector("#testMemberTable tbody");

  function loadMembers() {
    var role = document.getElementById("testMemberRoleFilter").value;
    var q = document.getElementById("testMemberSearchInput").value.trim().toLowerCase();
    memberTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-400)">불러오는 중...</td></tr>';
    Api.request("/api/admin/members" + (role ? "?role=" + encodeURIComponent(role) : ""))
      .then(function (list) {
        var filtered = q
          ? list.filter(function (m) {
              return (m.email || "").toLowerCase().indexOf(q) > -1 || (m.nickname || "").toLowerCase().indexOf(q) > -1;
            })
          : list;
        if (!filtered.length) {
          memberTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-400)">결과가 없습니다</td></tr>';
          return;
        }
        memberTbody.innerHTML = filtered.map(function (m) {
          var canToggle = m.role !== "ADMIN";
          var actions = !canToggle ? "-" : (m.status === "SUSPENDED"
            ? '<button type="button" class="tbtn tbtn--xs" data-member-action="ACTIVE" data-member-id="' + m.memberId + '">정지 해제</button>'
            : '<button type="button" class="tbtn tbtn--xs tbtn--danger" data-member-action="SUSPENDED" data-member-id="' + m.memberId + '">정지</button>');
          return "<tr>" +
            "<td>" + m.memberId + "</td>" +
            "<td>" + escapeHtml(m.email) + "</td>" +
            "<td>" + escapeHtml(m.nickname) + "</td>" +
            "<td>" + escapeHtml(m.role) + "</td>" +
            "<td>" + escapeHtml(m.status) + "</td>" +
            "<td>" + fmtDate(m.createdAt) + "</td>" +
            "<td>" + actions + "</td>" +
            "</tr>";
        }).join("");
      })
      .catch(function (err) {
        memberTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger)">' + escapeHtml(errText(err)) + "</td></tr>";
      });
  }
  document.getElementById("testMemberLoadBtn").addEventListener("click", loadMembers);

  memberTbody.addEventListener("click", function (e) {
    var b = e.target.closest("[data-member-action]");
    if (!b) return;
    var status = b.getAttribute("data-member-action");
    var id = b.getAttribute("data-member-id");
    if (!window.confirm((status === "SUSPENDED" ? "정지" : "정지 해제") + "하시겠습니까? (memberId=" + id + ")")) return;
    Api.request("/api/admin/members/" + id, { method: "PATCH", body: { status: status } })
      .then(function () { loadMembers(); })
      .catch(function (err) { window.alert(errText(err)); });
  });

  /* ---------------- 리뷰 관리 ---------------- */
  var reviewTbody = document.querySelector("#testReviewTable tbody");

  function loadReviews() {
    reviewTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--ink-400)">불러오는 중...</td></tr>';
    Api.request("/api/admin/reviews")
      .then(function (list) {
        if (!list.length) {
          reviewTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--ink-400)">결과가 없습니다</td></tr>';
          return;
        }
        reviewTbody.innerHTML = list.map(function (r) {
          return "<tr>" +
            "<td>" + r.reviewId + "</td>" +
            "<td>" + escapeHtml(r.nickname) + "</td>" +
            "<td>" + escapeHtml(r.restaurantName) + "</td>" +
            "<td>" + r.rating + "</td>" +
            "<td>" + escapeHtml(r.content) + "</td>" +
            "<td>" + escapeHtml((r.keywords || []).join(", ")) + "</td>" +
            "<td>" + fmtDate(r.createdAt) + "</td>" +
            '<td><button type="button" class="tbtn tbtn--xs tbtn--danger" data-review-delete="' + r.reviewId + '">삭제</button></td>' +
            "</tr>";
        }).join("");
      })
      .catch(function (err) {
        reviewTbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger)">' + escapeHtml(errText(err)) + "</td></tr>";
      });
  }
  document.getElementById("testReviewLoadBtn").addEventListener("click", loadReviews);

  reviewTbody.addEventListener("click", function (e) {
    var b = e.target.closest("[data-review-delete]");
    if (!b) return;
    var id = b.getAttribute("data-review-delete");
    if (!window.confirm("이 리뷰를 강제 삭제하시겠습니까? (reviewId=" + id + ")")) return;
    Api.request("/api/admin/reviews/" + id, { method: "DELETE" })
      .then(function () { loadReviews(); })
      .catch(function (err) { window.alert(errText(err)); });
  });

  /* ---------------- 리뷰 신고 관리 ---------------- */
  var reportTbody = document.querySelector("#testReportTable tbody");

  function loadReports() {
    var status = document.getElementById("testReportStatusFilter").value;
    reportTbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--ink-400)">불러오는 중...</td></tr>';
    Api.request("/api/admin/reports?status=" + encodeURIComponent(status))
      .then(function (list) {
        if (!list.length) {
          reportTbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--ink-400)">결과가 없습니다</td></tr>';
          return;
        }
        reportTbody.innerHTML = list.map(function (r) {
          var actions = r.status !== "PENDING" ? "-" :
            '<button type="button" class="tbtn tbtn--xs tbtn--primary" data-report-action="RESOLVED" data-report-id="' + r.reviewId + '">처리완료</button> ' +
            '<button type="button" class="tbtn tbtn--xs" data-report-action="REJECTED" data-report-id="' + r.reviewId + '">반려</button>';
          return "<tr>" +
            "<td>" + r.reviewId + "</td>" +
            "<td>" + escapeHtml(r.authorNickname) + "</td>" +
            "<td>" + escapeHtml(r.restaurantName) + "</td>" +
            "<td>" + r.rating + "</td>" +
            "<td>" + escapeHtml(r.content) + "</td>" +
            "<td>" + r.reportCount + "</td>" +
            "<td>" + escapeHtml(r.latestReasonCode) + "</td>" +
            "<td>" + escapeHtml(r.latestReporterNickname) + "</td>" +
            "<td>" + actions + "</td>" +
            "</tr>";
        }).join("");
      })
      .catch(function (err) {
        reportTbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger)">' + escapeHtml(errText(err)) + "</td></tr>";
      });
  }
  document.getElementById("testReportLoadBtn").addEventListener("click", loadReports);

  reportTbody.addEventListener("click", function (e) {
    var b = e.target.closest("[data-report-action]");
    if (!b) return;
    var status = b.getAttribute("data-report-action");
    var id = b.getAttribute("data-report-id");
    Api.request("/api/admin/reports/" + id, { method: "PATCH", body: { status: status } })
      .then(function () { loadReports(); })
      .catch(function (err) { window.alert(errText(err)); });
  });

  /* ---------------- 채팅 신고 관리 ---------------- */
  var chatReportTbody = document.querySelector("#testChatReportTable tbody");

  function loadChatReports() {
    var status = document.getElementById("testChatReportStatusFilter").value;
    chatReportTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-400)">불러오는 중...</td></tr>';
    Api.request("/api/admin/chat-reports?status=" + encodeURIComponent(status))
      .then(function (list) {
        if (!list.length) {
          chatReportTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-400)">결과가 없습니다</td></tr>';
          return;
        }
        chatReportTbody.innerHTML = list.map(function (r) {
          var statusActions = r.status !== "PENDING" ? "" :
            '<button type="button" class="tbtn tbtn--xs tbtn--primary" data-chatreport-status="RESOLVED" data-chatreport-id="' + r.chatReportId + '">처리완료</button> ' +
            '<button type="button" class="tbtn tbtn--xs" data-chatreport-status="REJECTED" data-chatreport-id="' + r.chatReportId + '">반려</button> ';
          var deleteAction = r.targetType === "MESSAGE"
            ? '<button type="button" class="tbtn tbtn--xs tbtn--danger" data-chatmessage-delete="' + r.chatMessageId + '">메시지삭제</button>'
            : '<button type="button" class="tbtn tbtn--xs tbtn--danger" data-chatroom-explode="' + r.chatRoomId + '">방폭파</button>';
          return "<tr>" +
            "<td>" + r.chatReportId + "</td>" +
            "<td>" + escapeHtml(r.targetType) + "</td>" +
            "<td>" + escapeHtml(r.roomTitle) + "</td>" +
            "<td>" + escapeHtml(r.reporterNickname) + "</td>" +
            "<td>" + escapeHtml(r.reasonCode) + "</td>" +
            "<td>" + escapeHtml(r.contentSnapshot) + "</td>" +
            "<td>" + statusActions + deleteAction + "</td>" +
            "</tr>";
        }).join("");
      })
      .catch(function (err) {
        chatReportTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger)">' + escapeHtml(errText(err)) + "</td></tr>";
      });
  }
  document.getElementById("testChatReportLoadBtn").addEventListener("click", loadChatReports);

  chatReportTbody.addEventListener("click", function (e) {
    var statusBtn = e.target.closest("[data-chatreport-status]");
    if (statusBtn) {
      Api.request("/api/admin/chat-reports/" + statusBtn.getAttribute("data-chatreport-id"),
        { method: "PATCH", body: { status: statusBtn.getAttribute("data-chatreport-status") } })
        .then(function () { loadChatReports(); })
        .catch(function (err) { window.alert(errText(err)); });
      return;
    }
    var msgBtn = e.target.closest("[data-chatmessage-delete]");
    if (msgBtn) {
      if (!window.confirm("이 메시지를 삭제하시겠습니까?")) return;
      Api.request("/api/admin/chat-messages/" + msgBtn.getAttribute("data-chatmessage-delete"), { method: "DELETE" })
        .then(function () { loadChatReports(); })
        .catch(function (err) { window.alert(errText(err)); });
      return;
    }
    var roomBtn = e.target.closest("[data-chatroom-explode]");
    if (roomBtn) {
      if (!window.confirm("이 채팅방을 폭파(모든 메시지 삭제 + 종료)하시겠습니까?")) return;
      Api.request("/api/admin/chat-rooms/" + roomBtn.getAttribute("data-chatroom-explode"), { method: "DELETE" })
        .then(function () { loadChatReports(); })
        .catch(function (err) { window.alert(errText(err)); });
    }
  });

  /* ---------------- 시스템 상태 ---------------- */
  var statusTbody = document.querySelector("#testStatusTable tbody");
  document.getElementById("testStatusLoadBtn").addEventListener("click", function () {
    statusTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--ink-400)">불러오는 중...</td></tr>';
    Api.request("/api/admin/status")
      .then(function (list) {
        statusTbody.innerHTML = list.map(function (s) {
          var cls = s.status === "UP" || s.status === "CONFIGURED" ? "tstatus--ok" : "tstatus--err";
          return "<tr>" +
            "<td>" + escapeHtml(s.name) + "</td>" +
            '<td><span class="tstatus ' + cls + '">' + escapeHtml(s.status) + "</span></td>" +
            "<td>" + (s.latencyMs != null ? s.latencyMs + "ms" : "-") + "</td>" +
            "<td>" + escapeHtml(s.detail || "-") + "</td>" +
            "</tr>";
        }).join("");
      })
      .catch(function (err) {
        statusTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger)">' + escapeHtml(errText(err)) + "</td></tr>";
      });
  });

  /* ---------------- 대시보드 ---------------- */
  var dashTbody = document.querySelector("#testDashboardTable tbody");
  document.getElementById("testDashboardLoadBtn").addEventListener("click", function () {
    dashTbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--ink-400)">불러오는 중...</td></tr>';
    Api.request("/api/admin/dashboard")
      .then(function (d) {
        var rows = [
          ["전체 회원 수", d.memberTotal], ["일반 회원 수", d.memberGeneral],
          ["사업자 회원 수", d.memberBusiness], ["관리자 수", d.memberAdmin],
          ["전체 리뷰 수", d.reviewTotal], ["신고된 리뷰 수", d.reviewReported],
        ];
        dashTbody.innerHTML = rows.map(function (r) {
          return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>";
        }).join("");
      })
      .catch(function (err) {
        dashTbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--danger)">' + escapeHtml(errText(err)) + "</td></tr>";
      });
  });

  /* ---------------- 주차장 동기화 ---------------- */
  document.getElementById("testParkingSyncBtn").addEventListener("click", function () {
    var box = document.getElementById("testParkingResultBox");
    var maxPages = Number(document.getElementById("testParkingMaxPages").value) || 5;
    box.textContent = "동기화 중... (시간이 걸릴 수 있습니다)";
    Api.request("/api/admin/parking-lot-syncs?maxPages=" + maxPages, { method: "POST" })
      .then(function (data) { box.textContent = JSON.stringify(data, null, 2); })
      .catch(function (err) { box.textContent = errText(err); });
  });

  /* ---------------- 공지 발송 ---------------- */
  document.getElementById("testBroadcastBtn").addEventListener("click", function () {
    var box = document.getElementById("testBroadcastResultBox");
    var title = document.getElementById("testBroadcastTitle").value.trim();
    var body = document.getElementById("testBroadcastBody").value.trim();
    if (!title) { window.alert("제목을 입력해주세요."); return; }
    if (!window.confirm("활성 회원 전체에게 공지를 발송하시겠습니까?")) return;
    box.textContent = "발송 중...";
    Api.request("/api/admin/notification-broadcasts", { method: "POST", body: { title: title, body: body } })
      .then(function (data) { box.textContent = JSON.stringify(data, null, 2); })
      .catch(function (err) { box.textContent = errText(err); });
  });

  /* ---------------- WebSocket(STOMP) 테스트 — 실제 잇티챗 엔드포인트 재사용 ---------------- */
  var wsLog = document.getElementById("wsLogBox");
  var wsStatus = document.getElementById("wsStatusText");
  var stompClient = null;
  function wlog(line) {
    wsLog.textContent += "\n" + new Date().toLocaleTimeString() + "  " + line;
    wsLog.scrollTop = wsLog.scrollHeight;
  }

  document.getElementById("wsConnectBtn").addEventListener("click", function () {
    if (stompClient) return;
    var roomId = document.getElementById("wsRoomInput").value.trim();
    var wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    stompClient = new StompJs.Client({
      brokerURL: wsProtocol + "//" + window.location.host + "/ws-chat",
      connectHeaders: { Authorization: "Bearer " + Api.getAccessToken() },
      onConnect: function () {
        wsStatus.textContent = "connected";
        wsStatus.className = "tstatus tstatus--ok";
        wlog("CONNECTED");
        stompClient.subscribe("/topic/rooms/" + roomId, function (frame) { wlog("RECV /topic/rooms/" + roomId + " " + frame.body); });
        stompClient.subscribe("/user/queue/errors", function (frame) { wlog("ERROR(개인큐) " + frame.body); });
      },
      onStompError: function (frame) { wlog("STOMP ERROR " + JSON.stringify(frame.headers)); },
      onWebSocketClose: function () {
        wsStatus.textContent = "disconnected";
        wsStatus.className = "tstatus";
        wlog("DISCONNECTED");
        stompClient = null;
      },
    });
    wlog("CONNECT 시도 → " + stompClient.brokerURL);
    stompClient.activate();
  });

  document.getElementById("wsDisconnectBtn").addEventListener("click", function () {
    if (!stompClient) return;
    stompClient.deactivate();
    stompClient = null;
    wsStatus.textContent = "disconnected";
    wsStatus.className = "tstatus";
  });

  document.getElementById("wsSendBtn").addEventListener("click", function () {
    if (!stompClient || !stompClient.connected) { window.alert("먼저 connect 해주세요."); return; }
    var roomId = document.getElementById("wsRoomInput").value.trim();
    var msg = document.getElementById("wsSendInput").value.trim();
    if (!msg) return;
    stompClient.publish({ destination: "/app/rooms/" + roomId + "/send", body: JSON.stringify({ content: msg }) });
    wlog("SEND /app/rooms/" + roomId + "/send " + msg);
    document.getElementById("wsSendInput").value = "";
  });
})();
