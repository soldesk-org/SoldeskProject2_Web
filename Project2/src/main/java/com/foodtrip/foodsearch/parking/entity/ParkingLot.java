package com.foodtrip.foodsearch.parking.entity;

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
import jakarta.persistence.UniqueConstraint;

// 15(주차장-정보) — 공공데이터포털(한국교통안전공단_주차정보 제공 API, B553881/Parking)에서 받아온 주차장
// 정보를 저장한다. 카카오(07)와 달리 정부 공개데이터라 "저장 금지" 같은 ToS 제약이 없어, 07의 실시간 호출
// 원칙과 다르게 이 도메인은 주기적으로 동기화(ParkingSyncService)해서 우리 DB에 캐싱해두는 방식을 쓴다 —
// 그 API 자체가 위도/경도 반경 검색을 지원하지 않아(페이지 단위 전체 목록만 제공), "근처 주차장 찾기"를
// 하려면 데이터를 갖고 있어야 우리가 직접 거리 계산을 할 수 있기 때문(001-02 2-1장 참고).
@Entity
@Table(name = "parking_lots", uniqueConstraints = @UniqueConstraint(columnNames = {"source", "external_id"}))
public class ParkingLot {

    public static final String SOURCE_DATA_GO_KR = "DATA_GO_KR_B553881";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "parking_lot_id")
    private Long parkingLotId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "address", length = 300)
    private String address;

    @Column(name = "latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "total_spaces")
    private Integer totalSpaces;

    // 운영정보(PrkOprInfo)에서 온 요금 관련 값들 — 001-02 2-3장 참고. 기본요금이 0이거나 정보가 아예 없으면
    // 화면에서 "무료"로 안내하도록 프론트 가이드에 명시(정확히 "무료"라고 못박는 필드가 API에 따로 없어서
    // 기본요금 유무로 추정하는 것 — 100% 정확하지 않을 수 있음, 8장 참고).
    @Column(name = "base_time_minutes")
    private Integer baseTimeMinutes;

    @Column(name = "base_fee")
    private Integer baseFee;

    @Column(name = "additional_unit_minutes")
    private Integer additionalUnitMinutes;

    @Column(name = "additional_unit_fee")
    private Integer additionalUnitFee;

    @Column(name = "daily_fee")
    private Integer dailyFee;

    @Column(name = "monthly_fee")
    private Integer monthlyFee;

    // 동기화 출처 식별 - 소스가 여러 개로 늘어날 가능성을 열어둠(지금은 공공데이터 하나뿐).
    @Column(name = "source", nullable = false, length = 30)
    private String source;

    // 그 소스 안에서의 원본 식별자(prk_center_id) - 재동기화 시 갱신(upsert) 기준.
    @Column(name = "external_id", nullable = false, length = 100)
    private String externalId;

    @Column(name = "synced_at", nullable = false)
    private LocalDateTime syncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ParkingLot() {
    }

    public static ParkingLot create(String source, String externalId, String name, String address,
                                     BigDecimal latitude, BigDecimal longitude, Integer totalSpaces) {
        ParkingLot lot = new ParkingLot();
        lot.source = source;
        lot.externalId = externalId;
        lot.name = name;
        lot.address = address;
        lot.latitude = latitude;
        lot.longitude = longitude;
        lot.totalSpaces = totalSpaces;
        lot.syncedAt = LocalDateTime.now();
        return lot;
    }

    // 재동기화(upsert) 시 시설정보만 갱신 - 운영정보(요금)는 별도 메서드로 갱신(다른 API 응답이라 따로 옴).
    public void updateFacility(String name, String address, BigDecimal latitude, BigDecimal longitude,
                                Integer totalSpaces) {
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.totalSpaces = totalSpaces;
        this.syncedAt = LocalDateTime.now();
    }

    public void updateFeeInfo(Integer baseTimeMinutes, Integer baseFee, Integer additionalUnitMinutes,
                               Integer additionalUnitFee, Integer dailyFee, Integer monthlyFee) {
        this.baseTimeMinutes = baseTimeMinutes;
        this.baseFee = baseFee;
        this.additionalUnitMinutes = additionalUnitMinutes;
        this.additionalUnitFee = additionalUnitFee;
        this.dailyFee = dailyFee;
        this.monthlyFee = monthlyFee;
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

    public Long getParkingLotId() {
        return parkingLotId;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public BigDecimal getLatitude() {
        return latitude;
    }

    public BigDecimal getLongitude() {
        return longitude;
    }

    public Integer getTotalSpaces() {
        return totalSpaces;
    }

    public Integer getBaseTimeMinutes() {
        return baseTimeMinutes;
    }

    public Integer getBaseFee() {
        return baseFee;
    }

    public Integer getAdditionalUnitMinutes() {
        return additionalUnitMinutes;
    }

    public Integer getAdditionalUnitFee() {
        return additionalUnitFee;
    }

    public Integer getDailyFee() {
        return dailyFee;
    }

    public Integer getMonthlyFee() {
        return monthlyFee;
    }

    public String getSource() {
        return source;
    }

    public String getExternalId() {
        return externalId;
    }

    public LocalDateTime getSyncedAt() {
        return syncedAt;
    }
}
