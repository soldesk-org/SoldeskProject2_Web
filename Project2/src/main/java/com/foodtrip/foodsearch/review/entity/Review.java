package com.foodtrip.foodsearch.review.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// reviews(DB-테이블설계.md 5-1장) — 지도 테스트 페이지에서 리뷰 작성/조회를 바로 확인할 수 있도록
// 임시로 최소 기능만 구현(2026-07-21). 정식 "3. 사용자 기능(리뷰 작성·수정·삭제)"이 나중에 이 테이블을
// 더 다듬을 수 있음 — 지금은 등록/조회만.
@Entity
@Table(name = "reviews")
public class Review {

    public static final String STATUS_NORMAL = "NORMAL";
    public static final String STATUS_DELETED = "DELETED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long reviewId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "restaurant_id", nullable = false)
    private String restaurantId;

    @Column(name = "receipt_id")
    private Long receiptId;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "content", length = 1000)
    private String content;

    @Column(name = "visit_date")
    private LocalDate visitDate;

    @Column(name = "receipt_verified", nullable = false)
    private boolean receiptVerified;

    // 마이페이지(11) "내 리뷰"/"방문기록" 목록에 음식점 이름/위치를 보여주기 위한 스냅샷(2026-07-22 추가).
    // restaurants 테이블엔 카카오 데이터를 저장하지 않으므로(07 001-07 2-1장), 프론트가 리뷰 작성 시점에
    // 이미 화면에 갖고 있던 값을 그대로 함께 보내 이 리뷰 행에만 저장한다 — 카카오 검색 결과를 벌크로
    // 캐싱/재제공하는 것과는 달리, 사용자 본인이 남긴 리뷰 1건에 달린 개인 기록이라는 점에서 카카오
    // 운영정책상 금지하는 "검색 대체 목적의 데이터 저장"과는 성격이 다르다고 판단한 절충 설계 — 그레이존
    // 판단이라 08(영수증OCR) restaurantName 파라미터와 같은 톤으로 최소한(이름 위주)만 저장한다.
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

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    protected Review() {
    }

    public static Review create(Long memberId, String restaurantId, Long receiptId, int rating, String content,
                                 LocalDate visitDate, boolean receiptVerified, String restaurantNameSnapshot,
                                 String addressSnapshot, String roadAddressSnapshot, BigDecimal latitudeSnapshot,
                                 BigDecimal longitudeSnapshot) {
        Review review = new Review();
        review.memberId = memberId;
        review.restaurantId = restaurantId;
        review.receiptId = receiptId;
        review.rating = rating;
        review.content = content;
        review.visitDate = visitDate;
        review.receiptVerified = receiptVerified;
        review.status = STATUS_NORMAL;
        review.restaurantNameSnapshot = restaurantNameSnapshot;
        review.addressSnapshot = addressSnapshot;
        review.roadAddressSnapshot = roadAddressSnapshot;
        review.latitudeSnapshot = latitudeSnapshot;
        review.longitudeSnapshot = longitudeSnapshot;
        return review;
    }

    // 리뷰 수정(마이페이지 11-연장, 2026-07-22 추가) — 작성 때와 같은 필드(별점+내용)를 통째로 교체한다.
    public void update(int rating, String content) {
        this.rating = rating;
        this.content = content;
    }

    // 리뷰 삭제(2026-07-22 추가) — 소프트 삭제. status도 함께 바꿔 DB-테이블설계.md 5-1장의
    // NORMAL/REPORTED/DELETED 구분과 일치시킨다(조회 쿼리는 deletedAt만으로도 이미 걸러지지만, 스키마
    // 주석이 약속한 상태값을 실제로 채워두는 쪽이 나중에 헷갈리지 않음).
    public void delete() {
        this.status = STATUS_DELETED;
        this.deletedAt = LocalDateTime.now();
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

    public Long getReviewId() {
        return reviewId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public int getRating() {
        return rating;
    }

    public String getContent() {
        return content;
    }

    public LocalDate getVisitDate() {
        return visitDate;
    }

    public boolean isReceiptVerified() {
        return receiptVerified;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
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

    public Long getReceiptId() {
        return receiptId;
    }
}
