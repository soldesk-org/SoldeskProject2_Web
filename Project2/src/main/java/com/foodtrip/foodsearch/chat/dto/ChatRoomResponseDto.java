package com.foodtrip.foodsearch.chat.dto;

import java.time.LocalDateTime;

public class ChatRoomResponseDto {

    private final Long chatRoomId;
    private final String title;
    private final String joinCode;
    private final Long hostMemberId;
    private final String hostNickname;
    private final long memberCount;
    private final int maxMembers;
    private final String status;
    private final LocalDateTime createdAt;

    public ChatRoomResponseDto(Long chatRoomId, String title, String joinCode, Long hostMemberId,
                                String hostNickname, long memberCount, int maxMembers, String status,
                                LocalDateTime createdAt) {
        this.chatRoomId = chatRoomId;
        this.title = title;
        this.joinCode = joinCode;
        this.hostMemberId = hostMemberId;
        this.hostNickname = hostNickname;
        this.memberCount = memberCount;
        this.maxMembers = maxMembers;
        this.status = status;
        this.createdAt = createdAt;
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

    public String getHostNickname() {
        return hostNickname;
    }

    public long getMemberCount() {
        return memberCount;
    }

    public int getMaxMembers() {
        return maxMembers;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
