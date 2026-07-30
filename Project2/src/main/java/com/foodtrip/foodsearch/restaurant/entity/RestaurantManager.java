package com.foodtrip.foodsearch.restaurant.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// restaurant_managers 테이블(DB-테이블설계.md 3-5장)은 이미 만들어져 있었음. 사업자 회원가입 시
// 사업장 주소 자동귀속(2026-07-20 요구사항 추가)으로 처음 생성되는 행 — RestaurantClaimServiceImpl 참고.
@Entity
@Table(name = "restaurant_managers",
        uniqueConstraints = @UniqueConstraint(name = "uq_restaurant_managers_restaurant_member", columnNames = {"restaurant_id", "member_id"}))
public class RestaurantManager {

    public static final String ROLE_OWNER = "OWNER";
    public static final String STATUS_ACTIVE = "ACTIVE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "restaurant_manager_id")
    private Long restaurantManagerId;

    @Column(name = "restaurant_id", nullable = false)
    private String restaurantId;

    @Column(name = "business_profile_id", nullable = false)
    private Long businessProfileId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "manager_role", nullable = false, length = 20)
    private String managerRole;

    @Column(name = "manager_status", nullable = false, length = 20)
    private String managerStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected RestaurantManager() {
    }

    public static RestaurantManager createOwner(String restaurantId, Long businessProfileId, Long memberId) {
        RestaurantManager manager = new RestaurantManager();
        manager.restaurantId = restaurantId;
        manager.businessProfileId = businessProfileId;
        manager.memberId = memberId;
        manager.managerRole = ROLE_OWNER;
        manager.managerStatus = STATUS_ACTIVE;
        return manager;
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

    public Long getRestaurantManagerId() {
        return restaurantManagerId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public Long getBusinessProfileId() {
        return businessProfileId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getManagerRole() {
        return managerRole;
    }

    public String getManagerStatus() {
        return managerStatus;
    }
}
