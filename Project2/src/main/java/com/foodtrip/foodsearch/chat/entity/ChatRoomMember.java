package com.foodtrip.foodsearch.chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// 19(오픈채팅) — 회원이 참가코드로 들어온 방 하나에 대한 참가 이력. left_at이 null이면 "현재 참가 중",
// 값이 있으면 "나갔음"(재입장 시 left_at을 다시 null로 되돌려 재사용 - 같은 회원이 같은 방에 여러 행을
// 만들지 않는다, UNIQUE(chat_room_id, member_id)).
@Entity
@Table(name = "chat_room_members", uniqueConstraints = @UniqueConstraint(columnNames = {"chat_room_id", "member_id"}))
public class ChatRoomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chat_room_member_id")
    private Long chatRoomMemberId;

    @Column(name = "chat_room_id", nullable = false)
    private Long chatRoomId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    protected ChatRoomMember() {
    }

    public static ChatRoomMember create(Long chatRoomId, Long memberId) {
        ChatRoomMember member = new ChatRoomMember();
        member.chatRoomId = chatRoomId;
        member.memberId = memberId;
        return member;
    }

    public void rejoin() {
        this.leftAt = null;
        this.joinedAt = LocalDateTime.now();
    }

    public void leave() {
        this.leftAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return leftAt == null;
    }

    @PrePersist
    protected void onCreate() {
        this.joinedAt = LocalDateTime.now();
    }

    public Long getChatRoomMemberId() {
        return chatRoomMemberId;
    }

    public Long getChatRoomId() {
        return chatRoomId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public LocalDateTime getLeftAt() {
        return leftAt;
    }
}
