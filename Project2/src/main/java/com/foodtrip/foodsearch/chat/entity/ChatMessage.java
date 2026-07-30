package com.foodtrip.foodsearch.chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 19(오픈채팅) — 실시간 메시지 1건. korcen 필터(17.리뷰-필터링에서 이미 붙인 ReviewFilterClient 재사용)를
// 통과한 메시지만 저장/브로드캐스트된다(001-02 2-6장). 방이 폭파(explode)되면 이 테이블의 해당 방 행은
// 물리 삭제된다 - 대화 내용을 영구 보존할 이유가 없다고 판단(001-01 참고). 신고된 메시지는 신고 시점에
// ChatReport.reportedContentSnapshot으로 내용을 따로 복사해두므로, 방이 나중에 폭파돼도 신고 증거는 남는다.
@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chat_message_id")
    private Long chatMessageId;

    @Column(name = "chat_room_id", nullable = false)
    private Long chatRoomId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ChatMessage() {
    }

    public static ChatMessage create(Long chatRoomId, Long memberId, String content) {
        ChatMessage message = new ChatMessage();
        message.chatRoomId = chatRoomId;
        message.memberId = memberId;
        message.content = content;
        return message;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getChatMessageId() {
        return chatMessageId;
    }

    public Long getChatRoomId() {
        return chatRoomId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getContent() {
        return content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
