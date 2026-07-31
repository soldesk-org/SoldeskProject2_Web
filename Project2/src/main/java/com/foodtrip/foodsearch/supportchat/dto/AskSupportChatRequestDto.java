package com.foodtrip.foodsearch.supportchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// 25(AI고객센터챗봇) — 사용자가 챗봇에게 보내는 문의 한 건.
public class AskSupportChatRequestDto {

    @NotBlank
    @Size(max = 1000)
    private String message;

    // 브라우저 탭 하나당 하나씩 클라이언트가 생성해서 매 요청마다 실어 보내는 상담 세션 식별자
    // (2026-07-31 2차 추가) — 대화 로그를 세션 단위로 묶어 남기기 위함일 뿐, 인증 토큰이 아니다.
    @NotBlank
    @Size(max = 64)
    private String sessionId;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}
