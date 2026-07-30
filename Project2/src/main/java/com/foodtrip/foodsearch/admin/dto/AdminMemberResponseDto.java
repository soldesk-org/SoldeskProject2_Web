package com.foodtrip.foodsearch.admin.dto;

import java.time.LocalDateTime;

public class AdminMemberResponseDto {

    private final Long memberId;
    private final String email;
    private final String nickname;
    private final String status;
    private final String role;
    private final LocalDateTime createdAt;

    public AdminMemberResponseDto(Long memberId, String email, String nickname, String status, String role,
                                   LocalDateTime createdAt) {
        this.memberId = memberId;
        this.email = email;
        this.nickname = nickname;
        this.status = status;
        this.role = role;
        this.createdAt = createdAt;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getEmail() {
        return email;
    }

    public String getNickname() {
        return nickname;
    }

    public String getStatus() {
        return status;
    }

    public String getRole() {
        return role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
