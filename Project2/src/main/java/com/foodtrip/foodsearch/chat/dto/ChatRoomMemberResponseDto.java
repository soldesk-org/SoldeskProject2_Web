package com.foodtrip.foodsearch.chat.dto;

import java.time.LocalDateTime;

// 2026-08-05 신규 - "참여자 목록이 안 보인다"는 요청으로 개별 참여자(현재 활성 참가자만) 목록을 노출한다.
// 기존엔 방장 닉네임 + 인원수만 알 수 있었다(chat.html 상단 주석 참고, 001-02 문서에도 "참여자 개별 목록
// API 없음"으로 기록돼 있었음 - 이번에 그 제약을 없앤다).
public class ChatRoomMemberResponseDto {

    private final Long memberId;
    private final String nickname;
    private final boolean host;
    private final LocalDateTime joinedAt;

    public ChatRoomMemberResponseDto(Long memberId, String nickname, boolean host, LocalDateTime joinedAt) {
        this.memberId = memberId;
        this.nickname = nickname;
        this.host = host;
        this.joinedAt = joinedAt;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getNickname() {
        return nickname;
    }

    public boolean isHost() {
        return host;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }
}
