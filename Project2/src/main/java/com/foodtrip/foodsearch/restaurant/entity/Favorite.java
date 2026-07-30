package com.foodtrip.foodsearch.restaurant.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// 즐겨찾기 등록/해제 API(마이페이지 11, 2026-07-22 추가) — 예전엔 응답의 favorite 필드(001-02 5-0장)를
// 채우기 위한 읽기 전용 엔티티였으나, 마이페이지 "즐겨찾기 목록"에 실제로 추가/삭제/조회가 필요해져
// 쓰기 기능을 이번에 새로 붙였다.
@Entity
@Table(name = "favorites")
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "favorite_id")
    private Long favoriteId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "restaurant_id", nullable = false)
    private String restaurantId;

    // 리뷰(Review)의 스냅샷과 같은 이유/같은 톤으로 저장 — 07 001-07 2-1장/리뷰 엔티티 주석 참고.
    @Column(name = "restaurant_name_snapshot", length = 200)
    private String restaurantNameSnapshot;

    @Column(name = "address_snapshot", length = 255)
    private String addressSnapshot;

    @Column(name = "road_address_snapshot", length = 255)
    private String roadAddressSnapshot;

    @Column(name = "latitude_snapshot", precision = 10, scale = 7)
    private BigDecimal latitudeSnapshot;

    @Column(name = "longitude_snapshot", precision = 10, scale = 7)
    private BigDecimal longitudeSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Favorite() {
    }

    public static Favorite create(Long memberId, String restaurantId, String restaurantNameSnapshot,
                                   String addressSnapshot, String roadAddressSnapshot,
                                   BigDecimal latitudeSnapshot, BigDecimal longitudeSnapshot) {
        Favorite favorite = new Favorite();
        favorite.memberId = memberId;
        favorite.restaurantId = restaurantId;
        favorite.restaurantNameSnapshot = restaurantNameSnapshot;
        favorite.addressSnapshot = addressSnapshot;
        favorite.roadAddressSnapshot = roadAddressSnapshot;
        favorite.latitudeSnapshot = latitudeSnapshot;
        favorite.longitudeSnapshot = longitudeSnapshot;
        return favorite;
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

    public Long getFavoriteId() {
        return favoriteId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getRestaurantNameSnapshot() {
        return restaurantNameSnapshot;
    }

    public String getAddressSnapshot() {
        return addressSnapshot;
    }

    public String getRoadAddressSnapshot() {
        return roadAddressSnapshot;
    }

    public BigDecimal getLatitudeSnapshot() {
        return latitudeSnapshot;
    }

    public BigDecimal getLongitudeSnapshot() {
        return longitudeSnapshot;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
