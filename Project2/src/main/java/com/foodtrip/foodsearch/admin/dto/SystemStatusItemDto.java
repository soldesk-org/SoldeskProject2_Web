package com.foodtrip.foodsearch.admin.dto;

import java.time.LocalDateTime;

public class SystemStatusItemDto {

    // UP / DOWN — 실제로 연결을 시도해서 확인한 항목(DB, Redis, Python 서버)
    // CONFIGURED / NOT_CONFIGURED — 설정값 존재 여부만 확인한 항목(카카오/메일/SMS, 4-2장 참고 — 매 폴링마다
    // 실제로 호출하면 외부 API 쿼터를 소모하거나 실제 메일/문자를 보내게 되어 그렇게 하지 않음)
    private final String name;
    private final String status;
    private final String detail;
    private final Long latencyMs;
    private final LocalDateTime checkedAt;

    public SystemStatusItemDto(String name, String status, String detail, Long latencyMs, LocalDateTime checkedAt) {
        this.name = name;
        this.status = status;
        this.detail = detail;
        this.latencyMs = latencyMs;
        this.checkedAt = checkedAt;
    }

    public String getName() {
        return name;
    }

    public String getStatus() {
        return status;
    }

    public String getDetail() {
        return detail;
    }

    public Long getLatencyMs() {
        return latencyMs;
    }

    public LocalDateTime getCheckedAt() {
        return checkedAt;
    }
}
