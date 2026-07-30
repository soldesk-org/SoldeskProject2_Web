package com.foodtrip.foodsearch.restaurant.dto;

import java.time.LocalTime;

public class BusinessHourResponseDto {

    private final int dayOfWeek;
    private final LocalTime openTime;
    private final LocalTime closeTime;
    private final boolean isClosed;

    public BusinessHourResponseDto(int dayOfWeek, LocalTime openTime, LocalTime closeTime, boolean isClosed) {
        this.dayOfWeek = dayOfWeek;
        this.openTime = openTime;
        this.closeTime = closeTime;
        this.isClosed = isClosed;
    }

    public int getDayOfWeek() {
        return dayOfWeek;
    }

    public LocalTime getOpenTime() {
        return openTime;
    }

    public LocalTime getCloseTime() {
        return closeTime;
    }

    public boolean isClosed() {
        return isClosed;
    }
}
