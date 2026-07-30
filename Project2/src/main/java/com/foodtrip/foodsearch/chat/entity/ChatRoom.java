package com.foodtrip.foodsearch.chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 19(오픈채팅) — 카카오톡 오픈채팅처럼 참가코드로 들어오는 채팅방. host(방장)만 방을 폭파(explode)할 수
// 있다. 폭파 시 status만 CLOSED로 바뀌고 방 자체(및 신고 이력이 참조하는 chat_room_id)는 남지만, 실제
// 대화 내용(chat_messages)은 물리 삭제된다 - "폭파"라는 표현에 맞춘 설계(001-02 2-4장).
@Entity
@Table(name = "chat_rooms")
public class ChatRoom {

    public static final String STATUS_OPEN = "OPEN";
    public static final String STATUS_CLOSED = "CLOSED";
    // 2026-07-24 4차 후속 - "최대 인원이 들어갈 수 있는 수를 우리가 임의로 정하도록" 요청으로 방마다
    // 최대 인원을 설정할 수 있게 함. 특별히 지정하지 않으면 5명이 기본값(001-02 2-13장).
    public static final int DEFAULT_MAX_MEMBERS = 5;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chat_room_id")
    private Long chatRoomId;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "join_code", nullable = false, unique = true, length = 8)
    private String joinCode;

    @Column(name = "host_member_id", nullable = false)
    private Long hostMemberId;

    // columnDefinition에 DB 기본값을 직접 줌 - 이미 데이터가 있는 테이블에 NOT NULL 컬럼을 추가하는
    // ALTER TABLE이라(ddl-auto=update), DEFAULT 없이는 기존 행 때문에 실패한다.
    @Column(name = "max_members", nullable = false, columnDefinition = "INT DEFAULT 5")
    private Integer maxMembers;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    protected ChatRoom() {
    }

    public static ChatRoom create(String title, String joinCode, Long hostMemberId, Integer maxMembers) {
        ChatRoom room = new ChatRoom();
        room.title = title;
        room.joinCode = joinCode;
        room.hostMemberId = hostMemberId;
        room.maxMembers = maxMembers != null ? maxMembers : DEFAULT_MAX_MEMBERS;
        room.status = STATUS_OPEN;
        return room;
    }

    public void explode() {
        this.status = STATUS_CLOSED;
        this.closedAt = LocalDateTime.now();
    }

    public boolean isOpen() {
        return STATUS_OPEN.equals(status);
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getChatRoomId() {
        return chatRoomId;
    }

    public String getTitle() {
        return title;
    }

    public String getJoinCode() {
        return joinCode;
    }

    public Long getHostMemberId() {
        return hostMemberId;
    }

    public Integer getMaxMembers() {
        return maxMembers;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }
}
