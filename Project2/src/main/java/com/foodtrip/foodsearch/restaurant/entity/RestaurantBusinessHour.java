package com.foodtrip.foodsearch.restaurant.entity;

import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// 사업자가 등록해야 채워지는 값(001-02 1-0장). 등록 API는 2026-07-20 추가(RestaurantOwnerServiceImpl 참고) —
// 요일별 전체를 한 번에 교체(delete-then-insert)하는 방식이라 update() 없이 create()만 있으면 충분하다.
@Entity
@Table(name = "restaurant_business_hours")
public class RestaurantBusinessHour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "restaurant_business_hour_id")
    private Long restaurantBusinessHourId;

    @Column(name = "restaurant_id", nullable = false)
    private String restaurantId;

    @Column(name = "day_of_week", nullable = false)
    private Integer dayOfWeek;

    @Column(name = "open_time")
    private LocalTime openTime;

    @Column(name = "close_time")
    private LocalTime closeTime;

    @Column(name = "is_closed", nullable = false)
    private Boolean isClosed;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected RestaurantBusinessHour() {
    }

    public static RestaurantBusinessHour create(String restaurantId, Integer dayOfWeek, LocalTime openTime,
                                                 LocalTime closeTime, boolean isClosed) {
        RestaurantBusinessHour hour = new RestaurantBusinessHour();
        hour.restaurantId = restaurantId;
        hour.dayOfWeek = dayOfWeek;
        hour.openTime = openTime;
        hour.closeTime = closeTime;
        hour.isClosed = isClosed;
        return hour;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getRestaurantBusinessHourId() {
        return restaurantBusinessHourId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public Integer getDayOfWeek() {
        return dayOfWeek;
    }

    public LocalTime getOpenTime() {
        return openTime;
    }

    public LocalTime getCloseTime() {
        return closeTime;
    }

    public Boolean getIsClosed() {
        return isClosed;
    }
}
