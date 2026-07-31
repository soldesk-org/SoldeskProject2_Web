package com.foodtrip.foodsearch.supportchat.dto;

// 25(AI고객센터챗봇) — 챗봇 답변 응답.
public class SupportChatResponseDto {

    private final boolean success;
    private final String answer;

    public SupportChatResponseDto(boolean success, String answer) {
        this.success = success;
        this.answer = answer;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getAnswer() {
        return answer;
    }
}
