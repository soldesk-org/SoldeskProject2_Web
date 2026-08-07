(function () {
  if (!Api.requireLogin()) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var myMemberId = Number(Api.getMemberId());
  var roomList = document.getElementById("roomList");
  var roomListEmpty = document.getElementById("roomListEmpty");
  var chatRoomEmpty = document.getElementById("chatRoomEmpty");
  var chatRoomActive = document.getElementById("chatRoomActive");
  var messageArea = document.getElementById("messageArea");

  var currentRoom = null;
  var stompClient = null;

  // ---- 방 목록 ----
  function renderRoomItem(room) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "e-chat-item";
    btn.setAttribute("data-room-id", room.chatRoomId);
    if (currentRoom && currentRoom.chatRoomId === room.chatRoomId) btn.classList.add("is-active");
    var isOwner = room.hostMemberId === myMemberId;
    btn.innerHTML =
      '<span class="e-avatar flex-none" aria-hidden="true">' + escapeHtml(room.title.charAt(0)) + '</span>' +
      '<span class="min-w-0 flex-1">' +
      '<span class="flex items-center gap-1.5">' +
      '<b class="text-[14.5px] font-extrabold text-[var(--ink-900)] truncate">' + escapeHtml(room.title) + '</b>' +
      (isOwner ? '<span class="e-badge e-badge--brand-solid flex-none !text-[10px] !px-1.5">방장</span>' : "") +
      '</span>' +
      '<span class="flex items-center gap-2 mt-1.5">' +
      '<span class="t-xs flex items-center gap-1">' +
      '<svg style="width:12px;height:12px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M2 20c0-3.2 3.1-5 7-5s7 1.8 7 5"/><path d="M17 11a3 3 0 1 0 0-6"/></svg>' +
      room.memberCount + " / " + room.maxMembers +
      '</span></span></span>';
    btn.addEventListener("click", function () { enterRoom(room); });
    return btn;
  }

  function loadMyRooms() {
    Api.request("/api/chat/rooms/my").then(function (rooms) {
      roomList.querySelectorAll(".e-chat-item").forEach(function (el) { el.remove(); });
      document.getElementById("myRoomCountBadge").textContent = (rooms || []).length + "개 방";
      if (!rooms || !rooms.length) {
        roomListEmpty.hidden = false;
        return;
      }
      roomListEmpty.hidden = true;
      rooms.forEach(function (room) { roomList.insertBefore(renderRoomItem(room), roomListEmpty); });
    }).catch(function () {});
  }
  loadMyRooms();

  // ---- 메시지 렌더 ----
  function scrollToBottom() { messageArea.scrollTop = messageArea.scrollHeight; }

  function renderMessage(m) {
    if (m.type === "SYSTEM") {
      var sys = document.createElement("div");
      sys.className = "e-msg-system";
      sys.textContent = m.content;
      messageArea.appendChild(sys);
      scrollToBottom();
      // 2026-08-05 추가 - 입장/퇴장 알림에는 갱신된 인원수가 함께 실려온다("인원도 실시간으로 표시"
      // 요청). 화면 여러 곳(방 헤더, 참여자 모달, 사이드바 목록)의 인원수 표시를 재조회 없이 갱신한다.
      if (m.memberCount != null && currentRoom && currentRoom.chatRoomId === m.chatRoomId) {
        currentRoom.memberCount = m.memberCount;
        document.getElementById("roomMemberCount").textContent = m.memberCount + " / " + currentRoom.maxMembers;
        document.getElementById("memberListTitle").textContent = "참여자 " + m.memberCount + "명";
        if (!document.getElementById("memberListModal").hasAttribute("aria-hidden") ||
            document.getElementById("memberListModal").getAttribute("aria-hidden") === "false") {
          loadMemberList(currentRoom.chatRoomId);
        }
        loadMyRooms();
      }
      return;
    }
    if (m.type === "ROOM_CLOSED") {
      Eatty.toast("방이 폭파되어 나가집니다.", "error");
      setTimeout(backToList, 900);
      return;
    }
    if (m.type === "DELETED") {
      var existing = messageArea.querySelector('[data-message-id="' + m.chatMessageId + '"] .e-msg-bubble');
      if (existing) existing.textContent = "삭제된 메시지입니다.";
      return;
    }

    var mine = m.memberId === myMemberId;
    var wrap = document.createElement("div");
    wrap.setAttribute("data-message-id", m.chatMessageId || "");
    if (mine) {
      wrap.className = "e-msg e-msg--me";
      wrap.innerHTML = '<div class="min-w-0"><div class="flex items-end gap-1.5 flex-row-reverse">' +
        '<p class="e-msg-bubble"></p><span class="e-msg-time"></span></div></div>';
    } else {
      wrap.className = "e-msg";
      wrap.innerHTML =
        '<span class="e-avatar e-avatar-sm e-avatar--gray flex-none" aria-hidden="true"></span>' +
        '<div class="min-w-0"><p class="e-msg-name"></p>' +
        '<div class="flex items-end gap-1.5"><p class="e-msg-bubble"></p><span class="e-msg-time"></span>' +
        '<span class="e-msg-actions"><button type="button" class="e-icon-btn !w-7 !h-7" data-report-message data-modal-open="reportMsgModal" aria-label="메시지 신고">' +
        '<svg style="width:13px;height:13px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4h11l-1 3h6l-1 4 1 4h-8l1-3H4"/></svg>' +
        '</button></span></div></div>';
      wrap.querySelector(".e-avatar").textContent = (m.nickname || "?").charAt(0);
      wrap.querySelector(".e-msg-name").textContent = m.nickname || "";
      wrap.querySelector("[data-report-message]").addEventListener("click", function () {
        openReport("MESSAGE", m.chatMessageId, m.content);
      });
    }
    wrap.querySelector(".e-msg-bubble").textContent = m.content || "";
    var timeEl = wrap.querySelector(".e-msg-time");
    if (timeEl && m.createdAt) timeEl.textContent = m.createdAt.slice(11, 16);
    messageArea.appendChild(wrap);
    scrollToBottom();
  }

  function loadHistory(roomId) {
    messageArea.innerHTML = "";
    Api.request("/api/chat/rooms/" + roomId + "/messages").then(function (messages) {
      (messages || []).forEach(renderMessage);
    }).catch(function () {});
  }

  // ---- STOMP ----
  function connectStomp(roomId) {
    disconnectStomp();
    var wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    stompClient = new StompJs.Client({
      brokerURL: wsProtocol + "//" + window.location.host + "/ws-chat",
      connectHeaders: { Authorization: "Bearer " + Api.getAccessToken() },
      reconnectDelay: 3000,
    });
    stompClient.onConnect = function () {
      stompClient.subscribe("/topic/rooms/" + roomId, function (frame) { renderMessage(JSON.parse(frame.body)); });
      stompClient.subscribe("/user/queue/errors", function (frame) {
        var err = JSON.parse(frame.body);
        Eatty.toast(err.message || "메시지 전송에 실패했습니다.", "error");
      });
    };
    stompClient.activate();
  }
  function disconnectStomp() {
    if (stompClient) { stompClient.deactivate(); stompClient = null; }
  }

  // ---- 참여자 목록 ---- (2026-08-05 신규: GET /api/chat/rooms/{id}/members, 현재 활성 참가자만)
  function loadMemberList(roomId) {
    var memberList = document.getElementById("memberList");
    Api.request("/api/chat/rooms/" + roomId + "/members").then(function (members) {
      memberList.innerHTML = (members || []).map(function (m) {
        var isMe = m.memberId === myMemberId;
        return '<li class="flex items-center gap-3 py-3">' +
          '<span class="e-avatar e-avatar-sm flex-none" aria-hidden="true">' + escapeHtml((m.nickname || "?").charAt(0)) + '</span>' +
          '<div class="min-w-0 flex-1"><p class="text-sm font-bold text-[var(--ink-900)]">' + escapeHtml(m.nickname) +
          (isMe ? ' <span class="t-xs font-semibold">(나)</span>' : '') + '</p></div>' +
          (m.host ? '<span class="e-badge e-badge--brand-solid flex-none">방장</span>' : '') +
          '</li>';
      }).join("");
    }).catch(function () {});
  }
  document.querySelectorAll('[data-modal-open="memberListModal"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (currentRoom) loadMemberList(currentRoom.chatRoomId);
    });
  });

  // ---- 방 입장/목록 전환 ----
  function enterRoom(room) {
    currentRoom = room;
    var isOwner = room.hostMemberId === myMemberId;
    document.body.setAttribute("data-room-role", isOwner ? "owner" : "member");
    document.getElementById("roomTitle").textContent = room.title;
    document.getElementById("roomMemberCount").textContent = room.memberCount + " / " + room.maxMembers;
    document.getElementById("roomCodeBadge").textContent = "코드 " + room.joinCode;
    document.getElementById("memberListTitle").textContent = "참여자 " + room.memberCount + "명";
    document.getElementById("memberListDesc").textContent = room.title + " · 최대 " + room.maxMembers + "명";
    loadMemberList(room.chatRoomId);

    chatRoomEmpty.hidden = true;
    chatRoomActive.hidden = false;
    document.body.classList.add("chat-room-open");

    loadHistory(room.chatRoomId);
    connectStomp(room.chatRoomId);
    loadMyRooms();
  }

  function backToList() {
    disconnectStomp();
    currentRoom = null;
    chatRoomActive.hidden = true;
    chatRoomEmpty.hidden = false;
    document.body.classList.remove("chat-room-open");
    loadMyRooms();
  }

  document.getElementById("roomBackBtn").addEventListener("click", function () {
    document.body.classList.remove("chat-room-open");
  });

  // ---- 참가코드 입장 ----
  document.getElementById("joinCodeSubmitBtn").addEventListener("click", function () {
    var input = document.getElementById("joinCodeInput");
    var code = input.value.trim();
    if (!code) return;
    Api.request("/api/chat/rooms/join", { method: "POST", body: { joinCode: code } })
      .then(function (room) {
        Eatty.closeModal("joinCodeModal");
        input.value = "";
        enterRoom(room);
      })
      .catch(function (err) {
        Eatty.toast(err.message || "존재하지 않는 코드이거나 만석인 방입니다.", "error");
      });
  });
  document.getElementById("joinCodeInput").addEventListener("input", function () {
    this.value = this.value.toUpperCase();
  });

  // ---- 방 만들기 ----
  var maxRange = document.getElementById("newRoomMaxMembers");
  maxRange.addEventListener("input", function () {
    document.getElementById("maxMembersText").textContent = maxRange.value;
  });

  var createdRoom = null;
  var newRoomNameField = document.getElementById("newRoomNameField");
  var newRoomMaxMembersField = document.getElementById("newRoomMaxMembersField");
  var createRoomCancelBtn = document.getElementById("createRoomCancelBtn");
  document.getElementById("createRoomBtn").addEventListener("click", function () {
    createdRoom = null;
    document.getElementById("createdCodeBox").hidden = true;
    newRoomNameField.hidden = false;
    newRoomMaxMembersField.hidden = false;
    createRoomCancelBtn.hidden = false;
    document.getElementById("newRoomName").value = "";
    document.getElementById("newRoomName").disabled = false;
    maxRange.value = 5;
    document.getElementById("maxMembersText").textContent = "5";
    document.getElementById("createRoomSubmitBtn").textContent = "방 만들기";
  });

  document.getElementById("createRoomSubmitBtn").addEventListener("click", function () {
    if (createdRoom) {
      Eatty.closeModal("createRoomModal");
      enterRoom(createdRoom);
      return;
    }
    var title = document.getElementById("newRoomName").value.trim();
    if (!title) { Eatty.toast("방 제목을 입력해주세요.", "error"); return; }
    Api.request("/api/chat/rooms", { method: "POST", body: { title: title, maxMembers: Number(maxRange.value) } })
      .then(function (room) {
        createdRoom = room;
        document.getElementById("createdCodeText").textContent = room.joinCode;
        document.getElementById("createdCodeBox").hidden = false;
        // 2026-08-05 후속 - "만들기 단계 필드는 이제 필요 없으니 참가코드+입장 버튼만" 요청으로,
        // 생성 완료 후에는 방 제목/최대 인원 입력과 취소 버튼을 숨기고 결과만 보여준다.
        newRoomNameField.hidden = true;
        newRoomMaxMembersField.hidden = true;
        createRoomCancelBtn.hidden = true;
        document.getElementById("createRoomSubmitBtn").textContent = "채팅방 입장하기";
        Eatty.toast("방을 만들었습니다. 참가코드를 공유해주세요.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "채팅방 생성에 실패했습니다.", "error"); });
  });

  // navigator.clipboard는 HTTPS/localhost가 아니면(사설 IP로 접속하는 팀원 등) undefined라 아무 반응이
  // 없었다("복사 시 복사해주고" 요청) - textarea + execCommand로 폴백한다.
  function copyText(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(function () { Eatty.toast("복사되었습니다.", "success"); });
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      Eatty.toast("복사되었습니다.", "success");
    } catch (e) {
      Eatty.toast("복사에 실패했습니다.", "error");
    }
    document.body.removeChild(ta);
    return Promise.resolve();
  }
  document.getElementById("copyCreatedCodeBtn").addEventListener("click", function () {
    copyText(document.getElementById("createdCodeText").textContent.trim());
  });
  document.getElementById("copyRoomCodeBtn").addEventListener("click", function () {
    if (!currentRoom) return;
    copyText(currentRoom.joinCode);
  });

  // ---- 메시지 전송 ----
  var messageInput = document.getElementById("messageInput");
  document.getElementById("messageForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var text = messageInput.value.trim();
    if (!text || !stompClient || !currentRoom) return;
    stompClient.publish({ destination: "/app/rooms/" + currentRoom.chatRoomId + "/send", body: JSON.stringify({ content: text }) });
    messageInput.value = "";
    messageInput.style.height = "auto";
  });
  messageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("sendMessageBtn").click();
    }
  });

  // ---- 방 나가기 ----
  document.getElementById("leaveRoomConfirmBtn").addEventListener("click", function () {
    if (!currentRoom) { Eatty.closeModal("leaveRoomModal"); return; }
    Api.request("/api/chat/rooms/" + currentRoom.chatRoomId + "/leave", { method: "POST" })
      .catch(function () {})
      .finally(function () {
        Eatty.closeModal("leaveRoomModal");
        Eatty.toast("방에서 나왔습니다.");
        backToList();
      });
  });

  // ---- 방 폭파 ----
  document.getElementById("explodeConfirmBtn").addEventListener("click", function () {
    var v = document.getElementById("explodeConfirmInput").value.trim();
    if (v !== "방 폭파") { Eatty.toast("확인 문구를 정확히 입력해주세요.", "error"); return; }
    if (!currentRoom) return;
    Api.request("/api/chat/rooms/" + currentRoom.chatRoomId, { method: "DELETE" })
      .then(function () {
        Eatty.closeModal("explodeRoomModal");
        Eatty.toast("방을 폭파했습니다.", "success");
        backToList();
      })
      .catch(function (err) { Eatty.toast(err.message || "방 폭파에 실패했습니다.", "error"); });
  });

  // ---- 신고 (메시지/채팅방 공용) ----
  var reportTarget = null; // { type: 'MESSAGE'|'ROOM', id }
  function openReport(type, id, preview) {
    reportTarget = { type: type, id: id };
    document.getElementById("reportMsgTitle").textContent = type === "ROOM" ? "채팅방 신고" : "메시지 신고";
    var previewBox = document.getElementById("reportMsgPreviewBox");
    if (type === "MESSAGE") {
      previewBox.hidden = false;
      document.getElementById("reportMsgPreview").textContent = preview || "";
    } else {
      previewBox.hidden = true;
    }
    document.getElementById("reportMsgReason").value = "";
    document.getElementById("reportMsgDetail").value = "";
  }
  document.getElementById("reportRoomBtn").addEventListener("click", function () {
    if (!currentRoom) return;
    openReport("ROOM", currentRoom.chatRoomId, null);
  });
  document.getElementById("reportMsgSubmitBtn").addEventListener("click", function () {
    if (!reportTarget) return;
    var reason = document.getElementById("reportMsgReason").value;
    var detail = document.getElementById("reportMsgDetail").value.trim() || null;
    if (!reason) { Eatty.toast("신고 사유를 선택해주세요.", "error"); return; }
    var path = reportTarget.type === "ROOM"
      ? "/api/chat/rooms/" + reportTarget.id + "/report"
      : "/api/chat/messages/" + reportTarget.id + "/report";
    Api.request(path, { method: "POST", body: { reasonCode: reason, detail: detail } })
      .then(function () {
        Eatty.closeModal("reportMsgModal");
        Eatty.toast("신고가 접수되었습니다.", "success");
      })
      .catch(function (err) { Eatty.toast(err.message || "신고에 실패했습니다.", "error"); });
  });

  window.addEventListener("beforeunload", disconnectStomp);
})();
