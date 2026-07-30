package com.foodtrip.foodsearch.chat.dto;

import java.time.LocalDateTime;

public class ChatMessageResponseDto {

    public static final String TYPE_MESSAGE = "MESSAGE";
    public static final String TYPE_SYSTEM = "SYSTEM"; // 화면에 안내만 표시하는 범용 시스템 알림(001-02 2-8장)
    // 관리자가 메시지를 강제 삭제했을 때 실시간으로 알리기 위한 타입(2026-07-24 후속 추가, 001-02 2-11장).
    // chatMessageId만 채워서 보내고, 클라이언트는 그 id를 가진 말풍선을 화면에서 제거/치환한다.
    public static final String TYPE_DELETED = "DELETED";
    // 방 폭파 전용 타입(2026-07-24 3차 후속, 001-02 2-12장) - 기존엔 TYPE_SYSTEM을 그대로 썼지만, "방이
    // 폭파되면 접속 중인 사람들을 강제로 내보내야 한다"는 요청으로 일반 안내(SYSTEM)와 구분되는 별도
    // 타입이 필요해졌다. 클라이언트는 이 타입을 받으면 안내만 하는 게 아니라 그 방에서 즉시 나가야 한다.
    public static final String TYPE_ROOM_CLOSED = "ROOM_CLOSED";

    private final Long chatMessageId;
    private final Long chatRoomId;
    private final Long memberId;
    private final String nickname;
    private final String content;
    private final String type;
    private final LocalDateTime createdAt;

    public ChatMessageResponseDto(Long chatMessageId, Long chatRoomId, Long memberId, String nickname,
                                   String content, String type, LocalDateTime createdAt) {
        this.chatMessageId = chatMessageId;
        this.chatRoomId = chatRoomId;
        this.memberId = memberId;
        this.nickname = nickname;
        this.content = content;
        this.type = type;
        this.createdAt = createdAt;
    }

    public static ChatMessageResponseDto system(Long chatRoomId, String content) {
        return new ChatMessageResponseDto(null, chatRoomId, null, null, content, TYPE_SYSTEM, LocalDateTime.now());
    }

    public static ChatMessageResponseDto roomClosed(Long chatRoomId, String content) {
        return new ChatMessageResponseDto(null, chatRoomId, null, null, content, TYPE_ROOM_CLOSED,
                LocalDateTime.now());
    }

    public static ChatMessageResponseDto deleted(Long chatRoomId, Long chatMessageId) {
        return new ChatMessageResponseDto(chatMessageId, chatRoomId, null, null, null, TYPE_DELETED,
                LocalDateTime.now());
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

    public String getNickname() {
        return nickname;
    }

    public String getContent() {
        return content;
    }

    public String getType() {
        return type;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
