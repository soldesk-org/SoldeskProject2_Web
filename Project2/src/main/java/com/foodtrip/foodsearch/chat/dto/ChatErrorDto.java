package com.foodtrip.foodsearch.chat.dto;

// STOMP는 REST의 GlobalExceptionHandler/ErrorResponse 흐름을 타지 않아서(001-02 2-6장), 메시지 전송
// 실패(클린봇에 걸림, 방에 없음 등)를 보낸 사람에게만 알려주기 위한 전용 DTO. convertAndSendToUser로
// /user/queue/errors에 실어 보낸다.
public class ChatErrorDto {

    private final String code;
    private final String message;

    public ChatErrorDto(String code, String message) {
        this.code = code;
        this.message = message;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
