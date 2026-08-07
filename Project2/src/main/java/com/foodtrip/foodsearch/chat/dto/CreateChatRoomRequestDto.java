package com.foodtrip.foodsearch.chat.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateChatRoomRequestDto {

    @NotBlank(message = "채팅방 제목을 입력해주세요.")
    @Size(max = 100)
    private String title;

    // 2026-07-24 4차 후속 - 생략하면 ChatRoom.DEFAULT_MAX_MEMBERS(5명)가 적용된다.
    // 2026-08-05 후속 - "최대 인원은 5명까지만" 요청으로 상한을 50 -> 5로 낮춤.
    @Min(value = 2, message = "최대 인원은 2명 이상이어야 합니다.")
    @Max(value = 5, message = "최대 인원은 5명 이하여야 합니다.")
    private Integer maxMembers;

    protected CreateChatRoomRequestDto() {
    }

    public String getTitle() {
        return title;
    }

    public Integer getMaxMembers() {
        return maxMembers;
    }
}
