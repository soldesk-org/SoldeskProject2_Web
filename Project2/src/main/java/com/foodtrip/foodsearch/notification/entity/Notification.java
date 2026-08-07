package com.foodtrip.foodsearch.notification.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 알림 벨(2026-08-06 추가) — eatty-ui.js의 헤더 알림 패널이 처음부터 이 스펙(GET /api/notifications 등)을
// 염두에 두고 만들어져 있었지만(주석으로만 표시된 "★ 연동 지점"), 실제 백엔드가 없어 목업 데이터만
// 보여주고 있었다. 종류별 발생 지점: 관리자 공지(NOTICE, AdminServiceImpl), 오픈채팅 새 메시지(CHAT,
// ChatMessageServiceImpl). 리뷰 도움됨/추천 알림 등 나머지 종류는 아직 발생 지점을 만들지 않았다
// (트리거할 실제 이벤트가 없어 지어낼 수 없음 — 필요해지면 그때 추가).
@Entity
@Table(name = "notifications")
public class Notification {

    // eatty-ui.js의 NOTI_ICON/NOTI_LABEL 맵 키(review/chat/recommend/notice/event/ad/business/admin)와
    // 그대로 맞춘다 — DTO 변환 단계에서 대소문자를 다시 매핑할 필요가 없도록.
    public static final String TYPE_NOTICE = "notice";
    public static final String TYPE_CHAT = "chat";
    public static final String TYPE_REVIEW = "review";
    public static final String TYPE_RECOMMEND = "recommend";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long notificationId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", length = 500)
    private String body;

    @Column(name = "link_url", length = 500)
    private String linkUrl;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Notification() {
    }

    public static Notification create(Long memberId, String type, String title, String body, String linkUrl) {
        Notification notification = new Notification();
        notification.memberId = memberId;
        notification.type = type;
        notification.title = title;
        notification.body = body;
        notification.linkUrl = linkUrl;
        notification.isRead = false;
        return notification;
    }

    public void markRead() {
        this.isRead = true;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getNotificationId() {
        return notificationId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getLinkUrl() {
        return linkUrl;
    }

    public boolean isRead() {
        return isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
