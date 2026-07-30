package com.foodtrip.foodsearch.restaurant.dto;

import java.time.LocalTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// 사업자 등록: 영업시간 요일 1건(2026-07-20 추가). dayOfWeek 0=일 ~ 6=토(DB-테이블설계.md 3-4장).
public class BusinessHourItemDto {

    @NotNull
    @Min(0)
    @Max(6)
    private Integer dayOfWeek;

    private LocalTime openTime;
    private LocalTime closeTime;

    @NotNull
    private Boolean isClosed;

    public Integer getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(Integer dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public LocalTime getOpenTime() {
        return openTime;
    }

    public void setOpenTime(LocalTime openTime) {
        this.openTime = openTime;
    }

    public LocalTime getCloseTime() {
        return closeTime;
    }

    public void setCloseTime(LocalTime closeTime) {
        this.closeTime = closeTime;
    }

    public Boolean getIsClosed() {
        return isClosed;
    }

    public void setIsClosed(Boolean isClosed) {
        this.isClosed = isClosed;
    }
}
