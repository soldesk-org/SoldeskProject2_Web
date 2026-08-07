package com.foodtrip.foodsearch.member.dto;

import jakarta.validation.constraints.NotNull;

// 알림 설정(2026-08-06 추가) — 세 토글 다 필수(프론트가 항상 현재 3개 값을 전부 보내는 구조).
public class UpdateNotificationSettingsRequestDto {

    @NotNull
    private Boolean notifyRecommend;

    @NotNull
    private Boolean notifyChat;

    @NotNull
    private Boolean notifyMarketing;

    public Boolean getNotifyRecommend() {
        return notifyRecommend;
    }

    public void setNotifyRecommend(Boolean notifyRecommend) {
        this.notifyRecommend = notifyRecommend;
    }

    public Boolean getNotifyChat() {
        return notifyChat;
    }

    public void setNotifyChat(Boolean notifyChat) {
        this.notifyChat = notifyChat;
    }

    public Boolean getNotifyMarketing() {
        return notifyMarketing;
    }

    public void setNotifyMarketing(Boolean notifyMarketing) {
        this.notifyMarketing = notifyMarketing;
    }
}
