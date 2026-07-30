package com.foodtrip.foodsearch.chat.dto;

import jakarta.validation.constraints.NotBlank;

public class JoinChatRoomRequestDto {

    @NotBlank(message = "참가코드를 입력해주세요.")
    private String joinCode;

    protected JoinChatRoomRequestDto() {
    }

    public String getJoinCode() {
        return joinCode;
    }
}
