package com.foodtrip.foodsearch.admin.dto;

import jakarta.validation.constraints.NotBlank;

// REST 라우팅 전면 개편(2026-08-14) — 기존 PATCH .../suspend, PATCH .../unsuspend 두 엔드포인트를
// PATCH /api/admin/members/{memberId} 하나로 합치면서, "어느 동작인지"를 body의 status 필드로 표현한다.
// 허용값: "SUSPENDED"(정지), "ACTIVE"(정지 해제).
public class UpdateMemberStatusRequestDto {

    @NotBlank
    private String status;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
