package com.foodtrip.foodsearch.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// 관리자 공지 발송(2026-08-06 추가) — 활성 회원 전체에게 알림을 뿌린다.
public class BroadcastNotificationRequestDto {

    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 500)
    private String body;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }
}
