package com.foodtrip.foodsearch.notification.dto;

public class NotificationUnreadCountResponseDto {

    private final long count;

    public NotificationUnreadCountResponseDto(long count) {
        this.count = count;
    }

    public long getCount() {
        return count;
    }
}
