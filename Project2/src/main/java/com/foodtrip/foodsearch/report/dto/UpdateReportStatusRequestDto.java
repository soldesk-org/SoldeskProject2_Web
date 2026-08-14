package com.foodtrip.foodsearch.report.dto;

import jakarta.validation.constraints.NotBlank;

// REST 라우팅 전면 개편(2026-08-14) — 기존 PATCH .../resolve, PATCH .../reject 두 엔드포인트를
// PATCH .../{id} 하나로 합치면서, "어느 동작인지"를 body의 status 필드로 표현한다.
// 허용값: "RESOLVED"(처리 완료), "REJECTED"(반려/처리 불가). 리뷰 신고/채팅 신고 양쪽에서 공용으로 쓴다.
public class UpdateReportStatusRequestDto {

    @NotBlank
    private String status;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
