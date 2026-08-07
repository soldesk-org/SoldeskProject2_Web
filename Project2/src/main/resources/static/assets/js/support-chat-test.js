const log = document.getElementById("log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const endBtn = document.getElementById("end-btn");
  const endedBanner = document.getElementById("ended-banner");

  // crypto.randomUUID()는 보안 컨텍스트(HTTPS 또는 localhost)에서만 제공된다 — 이 테스트 페이지를
  // http://<VM 공인 IP>:8081/처럼 평문 HTTP로 열면 함수 자체가 없어서 던진다. 세션 구분용 식별자일
  // 뿐 암호학적 보안이 필요한 값이 아니므로, 없을 때는 간단한 UUID v4 형태 문자열로 대체한다.
  function generateSessionId() {
    if (window.crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // 브라우저 탭 하나당 하나의 상담 세션 — 로그를 세션 단위로 묶어 남기기 위한 식별자일 뿐, 인증 토큰이 아니다.
  let sessionId = generateSessionId();
  let ended = false;

  function endSession(reason) {
    if (ended) return;
    ended = true;
    const payload = JSON.stringify({ sessionId, reason });
    // 페이지가 닫히는 중일 수도 있어 fetch 대신 sendBeacon으로 신뢰성 있게 전송
    navigator.sendBeacon("/api/support-chat/end", new Blob([payload], { type: "application/json" }));
  }

  function endSessionFromButton() {
    if (ended) return;
    endSession("button");
    log.innerHTML = "";
    endedBanner.style.display = "block";
    input.disabled = true;
    sendBtn.disabled = true;
    endBtn.disabled = true;
  }

  endBtn.addEventListener("click", endSessionFromButton);
  window.addEventListener("pagehide", () => endSession("page_closed"));

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // "**굵게**" 마크다운만 <strong>으로 바꿔서 렌더링(그 외 HTML은 이스케이프해서 안전하게 처리)
  function renderBotText(text) {
    return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  function addMessage(text, cls) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + cls;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (cls === "bot") {
      bubble.innerHTML = renderBotText(text);
    } else {
      bubble.textContent = text;
    }
    wrap.appendChild(bubble);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return wrap;
  }

  function addTypingIndicator() {
    const wrap = document.createElement("div");
    wrap.className = "msg bot typing";
    wrap.innerHTML =
      '<div class="bubble">답변하고 있어요, 잠시만 기다려주세요' +
      '<span class="typing-dots"><span></span><span></span><span></span></span></div>';
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return wrap;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (ended) return;
    const message = input.value.trim();
    if (!message) return;
    addMessage(message, "user");
    input.value = "";
    sendBtn.disabled = true;

    const typingEl = addTypingIndicator();

    try {
      const res = await fetch("/api/support-chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId }),
      });
      const data = await res.json();
      typingEl.remove();
      if (res.ok && data.success) {
        addMessage(data.answer, "bot");
      } else {
        addMessage(data.message || "오류가 발생했습니다.", "error");
      }
    } catch (err) {
      typingEl.remove();
      addMessage("네트워크 오류: " + err.message, "error");
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });
