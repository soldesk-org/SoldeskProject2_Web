package com.foodtrip.foodsearch.chat.dto;

// STOMP 메시지 페이로드(JSON) - REST DTO처럼 @Valid를 컨트롤러가 자동으로 돌려주지 않으므로(STOMP는
// @MessageMapping이라 MethodArgumentNotValidException 흐름을 안 탐), 유효성 검사는
// ChatMessageServiceImpl에서 직접 한다(001-02 2-6장).
public class SendChatMessageRequestDto {

    private String content;

    protected SendChatMessageRequestDto() {
    }

    public String getContent() {
        return content;
    }
}
