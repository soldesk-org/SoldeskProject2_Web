package com.foodtrip.foodsearch.member.dto;

// 알림 설정(2026-08-06 추가) — 맞춤 맛집 추천/오픈채팅 메시지/이벤트·광고(마케팅) 알림 수신 여부.
public class NotificationSettingsResponseDto {

    private final boolean notifyRecommend;
    private final boolean notifyChat;
    private final boolean notifyMarketing;

    public NotificationSettingsResponseDto(boolean notifyRecommend, boolean notifyChat, boolean notifyMarketing) {
        this.notifyRecommend = notifyRecommend;
        this.notifyChat = notifyChat;
        this.notifyMarketing = notifyMarketing;
    }

    public boolean isNotifyRecommend() {
        return notifyRecommend;
    }

    public boolean isNotifyChat() {
        return notifyChat;
    }

    public boolean isNotifyMarketing() {
        return notifyMarketing;
    }
}
