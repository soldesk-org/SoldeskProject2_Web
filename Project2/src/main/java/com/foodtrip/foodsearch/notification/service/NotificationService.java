package com.foodtrip.foodsearch.notification.service;

import java.util.List;

import com.foodtrip.foodsearch.notification.dto.NotificationResponseDto;
import com.foodtrip.foodsearch.notification.dto.NotificationUnreadCountResponseDto;

public interface NotificationService {

    List<NotificationResponseDto> list(String authorizationHeader, String filter);

    NotificationUnreadCountResponseDto unreadCount(String authorizationHeader);

    void markRead(Long notificationId, String authorizationHeader);

    void markAllRead(String authorizationHeader);

    void delete(Long notificationId, String authorizationHeader);

    // 다른 도메인(관리자 공지, 오픈채팅 등)이 알림을 만들 때 쓰는 내부용 진입점 — 인증 확인이 필요 없다
    // (호출부가 이미 대상 memberId를 알고 있는 상태).
    void create(Long memberId, String type, String title, String body, String linkUrl);
}
