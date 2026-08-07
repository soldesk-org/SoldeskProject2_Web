package com.foodtrip.foodsearch.supportchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// 25(AI고객센터챗봇, 2026-07-31 2차 추가) — 상담 종료(버튼 클릭 또는 페이지 닫힘) 신호.
public class EndSupportChatRequestDto {

    @NotBlank
    @Size(max = 64)
    private String sessionId;

    // "button"(상담종료 버튼 클릭) 또는 "page_closed"(페이지 닫힘) — 생략 시 "unknown"으로 기록.
    @Size(max = 32)
    private String reason;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getReason() {
        return reason == null || reason.isBlank() ? "unknown" : reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
