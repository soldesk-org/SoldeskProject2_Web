package com.foodtrip.foodsearch.supportchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// 25(AI고객센터챗봇) — 사용자가 챗봇에게 보내는 문의 한 건.
public class AskSupportChatRequestDto {

    @NotBlank
    @Size(max = 1000)
    private String message;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
