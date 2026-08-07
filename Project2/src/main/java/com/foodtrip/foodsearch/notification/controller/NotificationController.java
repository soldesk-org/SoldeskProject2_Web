package com.foodtrip.foodsearch.notification.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.notification.dto.NotificationResponseDto;
import com.foodtrip.foodsearch.notification.dto.NotificationUnreadCountResponseDto;
import com.foodtrip.foodsearch.notification.service.NotificationService;

// 알림 벨(2026-08-06 추가) — eatty-ui.js 헤더 알림 패널이 원래 상정하고 있던 API 경로 그대로 구현.
@RestController
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/api/notifications")
    public List<NotificationResponseDto> list(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestParam(defaultValue = "all") String filter) {
        return notificationService.list(authorizationHeader, filter);
    }

    @GetMapping("/api/notifications/unread-count")
    public NotificationUnreadCountResponseDto unreadCount(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return notificationService.unreadCount(authorizationHeader);
    }

    @PatchMapping("/api/notifications/{notificationId}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long notificationId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        notificationService.markRead(notificationId, authorizationHeader);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/notifications/read-all")
    public ResponseEntity<Void> markAllRead(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        notificationService.markAllRead(authorizationHeader);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/notifications/{notificationId}")
    public ResponseEntity<Void> delete(@PathVariable Long notificationId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        notificationService.delete(notificationId, authorizationHeader);
        return ResponseEntity.noContent().build();
    }
}
