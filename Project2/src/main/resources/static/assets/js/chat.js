(function () {
  if (!Api.requireLogin()) return;

  var REPORT_REASONS = [
    { code: "SPAM", label: "스팸 / 도배" },
    { code: "ABUSE", label: "욕설/비방" },
    { code: "FALSE_INFO", label: "허위 정보" },
    { code: "PRIVACY", label: "개인정보 노출" },
    { code: "ETC", label: "기타" },
  ];

  var entryView = document.getElementById("chat-entry");
  var roomView = document.getElementById("chat-room");
  var createModal = document.getElementById("create-room-modal");
  var entryError = document.getElementById("chat-entry-error");

  var joinCodeInput = document.getElementById("join-code-input");
  var joinBtn = document.getElementById("join-btn");
  var createBtn = document.getElementById("create-room-btn");

  var modalCodeGroup = document.getElementById("modal-code-group");
  var modalCodeEl = document.getElementById("modal-code");
  var modalNameInput = document.getElementById("modal-name-input");
  var modalCancelBtn = document.getElementById("modal-cancel");
  var modalCreateBtn = document.getElementById("modal-create");
  var modalCopyBtn = document.getElementById("modal-copy");
  var modalXBtn = document.getElementById("modal-x");
  var modalError = document.getElementById("modal-error");

  var roomTitle = document.getElementById("room-title");
  var roomMeta = document.getElementById("room-meta");
  var messagesEl = document.getElementById("chat-messages");
  var draftInput = document.getElementById("chat-draft");
  var sendBtn = document.getElementById("chat-send-btn");
  var leaveBtn = document.getElementById("chat-leave-btn");
  var participantsToggle = document.getElementById("participants-toggle");
  var participantsList = document.getElementById("participants-list");
  var participantsChevron = document.getElementById("participants-chevron");
  var reportRoomBtn = document.getElementById("chat-report-room-btn");
  var explodeBtn = document.getElementById("chat-explode-btn");

  var currentRoom = null;
  var stompClient = null;
  var myMemberId = Number(Api.getMemberId());
  var participantsOpen = true;
  var createdRoom = null;

  function showEntryError(msg) {
    entryError.textContent = msg;
    entryError.style.display = msg ? "" : "none";
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function loadMyRooms() {
    var el = document.getElementById("my-rooms-list");
    Api.request("/api/chat/rooms/my", {})
      .then(function (rooms) {
        if (!rooms || rooms.length === 0) { el.innerHTML = '<p class="text-[14px] text-[rgba(37,55,75,0.4)]">참여 중인 채팅방이 없어요.</p>'; return; }
        el.innerHTML = "";
        rooms.forEach(function (r) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "flex items-center justify-between rounded-[10px] border border-[rgba(37,55,75,0.15)] px-4 py-3 text-left hover:bg-[rgba(37,55,75,0.03)]";
          btn.innerHTML = "<span class='text-[16px] font-semibold text-[#25374b]'>" + escapeHtml(r.title) +
            "</span><span class='text-[13px] text-[rgba(37,55,75,0.5)]'>" + r.memberCount + "/" + r.maxMembers + "명</span>";
          btn.addEventListener("click", function () { enterRoom(r); });
          el.appendChild(btn);
        });
      })
      .catch(function () { el.innerHTML = '<p class="text-[14px] text-red-500">불러오지 못했습니다.</p>'; });
  }

  function openEntry() {
    disconnectStomp();
    entryView.style.display = "";
    roomView.style.display = "none";
    joinCodeInput.value = "";
    currentRoom = null;
    loadMyRooms();
  }

  function renderMessage(m) {
    if (m.type === "SYSTEM" || m.type === "ROOM_CLOSED") {
      var sys = document.createElement("div");
      sys.className = "text-center text-[14px] font-medium text-[rgba(37,55,75,0.5)]";
      sys.textContent = m.content;
      messagesEl.appendChild(sys);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }
    if (m.type === "DELETED") {
      var existing = messagesEl.querySelector('[data-message-id="' + m.chatMessageId + '"]');
      if (existing) existing.querySelector(".msg-bubble").textContent = "삭제된 메시지입니다.";
      return;
    }

    var mine = m.memberId === myMemberId;
    var wrap = document.createElement("div");
    wrap.setAttribute("data-message-id", m.chatMessageId || "");
    if (mine) {
      wrap.className = "flex justify-end";
      wrap.innerHTML = '<div class="msg-bubble max-w-[70%] rounded-[16px] rounded-tr-[4px] bg-gradient-to-r from-[#fea255] to-[#fd6d4a] px-5 py-3 text-[18px] font-medium text-white"></div>';
      wrap.querySelector(".msg-bubble").textContent = m.content;
    } else {
      wrap.className = "flex items-start gap-3";
      wrap.innerHTML =
        '<div class="size-[44px] shrink-0 overflow-hidden rounded-full">' + Api.avatarPlaceholder + "</div>" +
        '<div class="max-w-[70%]">' +
        '<div class="mb-1 flex items-center gap-2"><p class="text-[15px] font-semibold text-[rgba(37,55,75,0.6)]"></p><button data-report-msg class="text-[13px] text-[rgba(37,55,75,0.35)] hover:text-red-500">신고</button></div>' +
        '<div class="msg-bubble rounded-[16px] rounded-tl-[4px] bg-[#f3f4f6] px-5 py-3 text-[18px] font-medium text-[#25374b]"></div>' +
        "</div>";
      wrap.querySelector("p").textContent = m.nickname;
      wrap.querySelector(".msg-bubble").textContent = m.content;
      wrap.querySelector("[data-report-msg]").addEventListener("click", function () {
        openReportDialog("MESSAGE", m.chatMessageId);
      });
    }
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function loadHistory(roomId) {
    Api.request("/api/chat/rooms/" + roomId + "/messages", {})
      .then(function (messages) {
        messagesEl.innerHTML = "";
        (messages || []).forEach(renderMessage);
      })
      .catch(function () {});
  }

  function connectStomp(roomId) {
    disconnectStomp();
    var wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    stompClient = new StompJs.Client({
      brokerURL: wsProtocol + "//" + window.location.host + "/ws-chat",
      connectHeaders: { Authorization: "Bearer " + Api.getAccessToken() },
      reconnectDelay: 3000,
    });
    stompClient.onConnect = function () {
      stompClient.subscribe("/topic/rooms/" + roomId, function (frame) {
        var body = JSON.parse(frame.body);
        if (body.type === "ROOM_CLOSED") {
          renderMessage(body);
          setTimeout(function () { openEntry(); }, 800);
          return;
        }
        renderMessage(body);
      });
      stompClient.subscribe("/user/queue/errors", function (frame) {
        var err = JSON.parse(frame.body);
        window.alert(err.message || "메시지 전송에 실패했습니다.");
      });
    };
    stompClient.activate();
  }

  function disconnectStomp() {
    if (stompClient) { stompClient.deactivate(); stompClient = null; }
  }

  function enterRoom(room) {
    currentRoom = room;
    roomTitle.textContent = room.title;
    roomMeta.textContent = "참여자 " + room.memberCount + "명 · 코드 " + room.joinCode;
    document.querySelector("#participants-toggle span").textContent = "참여자 " + room.memberCount + "명";
    participantsList.innerHTML =
      '<div class="flex items-center gap-3 rounded-[10px] border border-[rgba(37,55,75,0.1)] p-3">' +
      "<div class='min-w-0 flex-1'><p class='truncate text-[16px] font-semibold text-[#25374b]'>" + escapeHtml(room.hostNickname) + " (방장)</p></div></div>" +
      '<p class="mt-2 text-[13px] text-[rgba(37,55,75,0.4)]">현재 인원 ' + room.memberCount + " / " + room.maxMembers + "명</p>";
    explodeBtn.style.display = room.hostMemberId === myMemberId ? "" : "none";

    entryView.style.display = "none";
    roomView.style.display = "flex";
    loadHistory(room.chatRoomId);
    connectStomp(room.chatRoomId);
  }

  createBtn.addEventListener("click", function () {
    createdRoom = null;
    modalCodeGroup.style.display = "none";
    modalNameInput.value = "";
    modalNameInput.disabled = false;
    modalCreateBtn.textContent = "채팅방 만들기";
    modalError.style.display = "none";
    createModal.style.display = "flex";
    modalNameInput.focus();
  });

  function closeModal() { createModal.style.display = "none"; }
  modalCancelBtn.addEventListener("click", closeModal);
  modalXBtn.addEventListener("click", closeModal);

  modalCreateBtn.addEventListener("click", function () {
    modalError.style.display = "none";
    if (!createdRoom) {
      var title = modalNameInput.value.trim();
      if (!title) { modalError.textContent = "채팅방 이름을 입력해주세요."; modalError.style.display = ""; return; }
      Api.request("/api/chat/rooms", { method: "POST", body: { title: title } })
        .then(function (room) {
          createdRoom = room;
          modalCodeEl.textContent = room.joinCode;
          modalCodeGroup.style.display = "";
          modalNameInput.disabled = true;
          modalCreateBtn.textContent = "채팅방 입장하기";
        })
        .catch(function (err) { modalError.textContent = err.message || "채팅방 생성에 실패했습니다."; modalError.style.display = ""; });
    } else {
      closeModal();
      enterRoom(createdRoom);
    }
  });

  modalCopyBtn.addEventListener("click", function () {
    if (!createdRoom) return;
    navigator.clipboard.writeText(createdRoom.joinCode).then(function () {
      modalCopyBtn.querySelector(".copy-label").textContent = "복사됨";
      setTimeout(function () { modalCopyBtn.querySelector(".copy-label").textContent = "복사"; }, 1500);
    }).catch(function () {});
  });

  function tryJoin() {
    var code = joinCodeInput.value.trim();
    if (!code) return;
    showEntryError("");
    Api.request("/api/chat/rooms/join", { method: "POST", body: { joinCode: code } })
      .then(enterRoom)
      .catch(function (err) { showEntryError(err.message || "채팅방 입장에 실패했습니다."); });
  }
  joinBtn.addEventListener("click", tryJoin);
  joinCodeInput.addEventListener("input", function () {
    joinCodeInput.value = joinCodeInput.value.toUpperCase();
    joinBtn.disabled = !joinCodeInput.value.trim();
    joinBtn.style.opacity = joinBtn.disabled ? "0.4" : "1";
  });
  joinCodeInput.addEventListener("keydown", function (e) { if (e.key === "Enter") tryJoin(); });

  function send() {
    var text = draftInput.value.trim();
    if (!text || !stompClient || !currentRoom) return;
    stompClient.publish({ destination: "/app/rooms/" + currentRoom.chatRoomId + "/send", body: JSON.stringify({ content: text }) });
    draftInput.value = "";
  }
  sendBtn.addEventListener("click", send);
  draftInput.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });

  leaveBtn.addEventListener("click", function () {
    if (!currentRoom) { openEntry(); return; }
    Api.request("/api/chat/rooms/" + currentRoom.chatRoomId + "/leave", { method: "POST" })
      .catch(function () {})
      .finally(openEntry);
  });

  explodeBtn.addEventListener("click", function () {
    if (!currentRoom) return;
    if (!window.confirm("정말로 이 채팅방을 폭파하시겠습니까? 모든 대화 내용이 삭제됩니다.")) return;
    Api.request("/api/chat/rooms/" + currentRoom.chatRoomId, { method: "DELETE" })
      .catch(function (err) { window.alert(err.message || "방 폭파에 실패했습니다."); });
  });

  participantsToggle.addEventListener("click", function () {
    participantsOpen = !participantsOpen;
    participantsList.style.display = participantsOpen ? "" : "none";
    participantsChevron.innerHTML = participantsOpen ? '<path d="m18 15-6-6-6 6"/>' : '<path d="m6 9 6 6 6-6"/>';
  });

  // --- 신고 ---
  var reportOverlay = null;
  function openReportDialog(targetType, targetId) {
    closeReportDialog();
    reportOverlay = document.createElement("div");
    reportOverlay.className = "fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(37,55,75,0.4)] p-4";
    reportOverlay.innerHTML =
      '<div class="w-full max-w-[380px] rounded-[16px] bg-white p-6">' +
      '<h3 class="text-[19px] font-bold text-[#25374b]">' + (targetType === "ROOM" ? "채팅방 신고" : "메시지 신고") + "</h3>" +
      '<div class="mt-4 flex flex-col gap-2">' +
      REPORT_REASONS.map(function (r, i) {
        return '<label class="flex items-center gap-2 text-[15px]"><input type="radio" name="report-reason" value="' + r.code + '"' + (i === 0 ? " checked" : "") + " /> " + r.label + "</label>";
      }).join("") +
      "</div>" +
      '<textarea id="report-detail" placeholder="상세 내용 (선택)" class="mt-3 h-[60px] w-full rounded-[8px] border border-[#dfe2e6] p-2 text-[14px] outline-none"></textarea>' +
      '<p id="report-error" class="mt-2 text-[13px] text-red-500" style="display:none"></p>' +
      '<div class="mt-4 flex gap-2"><button id="report-cancel" class="h-[44px] flex-1 rounded-[8px] border border-[#dfe2e6] text-[15px] font-semibold">취소</button><button id="report-submit" class="h-[44px] flex-1 rounded-[8px] bg-[#ff6b00] text-[15px] font-semibold text-white">신고하기</button></div>' +
      "</div>";
    document.body.appendChild(reportOverlay);
    reportOverlay.querySelector("#report-cancel").addEventListener("click", closeReportDialog);
    reportOverlay.querySelector("#report-submit").addEventListener("click", function () {
      var reasonCode = reportOverlay.querySelector('input[name="report-reason"]:checked').value;
      var detail = reportOverlay.querySelector("#report-detail").value.trim() || null;
      var path = targetType === "ROOM"
        ? "/api/chat/rooms/" + targetId + "/report"
        : "/api/chat/messages/" + targetId + "/report";
      Api.request(path, { method: "POST", body: { reasonCode: reasonCode, detail: detail } })
        .then(function () { window.alert("신고가 접수되었습니다."); closeReportDialog(); })
        .catch(function (err) {
          var el = reportOverlay.querySelector("#report-error");
          el.textContent = err.message || "신고에 실패했습니다.";
          el.style.display = "";
        });
    });
  }
  function closeReportDialog() {
    if (reportOverlay) { reportOverlay.remove(); reportOverlay = null; }
  }

  reportRoomBtn.addEventListener("click", function () {
    if (!currentRoom) return;
    openReportDialog("ROOM", currentRoom.chatRoomId);
  });

  window.addEventListener("beforeunload", disconnectStomp);

  openEntry();
})();
