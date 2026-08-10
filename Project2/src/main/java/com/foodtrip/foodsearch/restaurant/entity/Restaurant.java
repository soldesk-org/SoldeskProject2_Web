package com.foodtrip.foodsearch.restaurant.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// 2026-07-21 전면 재설계: 카카오 로컬 API 운영정책상 "실시간 호출 기반의 사용만 가능하며, 데이터 저장 등의
// 목적으로는 호출이 불가"(카카오 데브톡 공식 답변)하므로, 카카오가 주는 값(상호명/주소/좌표/전화번호/
// 카카오맵 링크)은 이제 이 테이블에 절대 저장하지 않는다. restaurant_id 자체가 카카오 place id(문자열)이고,
// 이 테이블은 "우리 서비스에서만 관리하는 부가정보"(설명/사업자 등록 전화번호/사진/평점 캐시/관리상태)만
// 최소한으로 보관한다. 상호명/주소/좌표 등은 검색 시점에 카카오 라이브 호출로만 얻고 응답에만 실어 보낸다
// (RestaurantServiceImpl 참고). 리뷰/즐겨찾기/사업자등록 같은 부가 기능이 이 restaurant_id를 참조할 수
// 있도록, 누군가 그 장소를 처음 건드릴 때(상세조회/리뷰/즐겨찾기/사업자등록) 이 "빈 부가정보" 행을
// 만들어둔다(createExtras()).
@Entity
@Table(name = "restaurants")
public class Restaurant {

    public static final String MANAGEMENT_STATUS_UNCLAIMED = "UNCLAIMED";
    public static final String MANAGEMENT_STATUS_CLAIMED = "CLAIMED";
    public static final String BUSINESS_STATUS_UNKNOWN = "UNKNOWN";

    // 카카오 로컬 API 응답의 place id를 그대로 기본키로 쓴다(자동증가 아님) — 이 값만으로는 카카오 데이터를
    // "저장"하는 게 아니라 우리 서비스 부가정보를 그 장소에 연결하기 위한 참조키일 뿐이다.
    @Id
    @Column(name = "restaurant_id", length = 100)
    private String restaurantId;

    // 사업자/관리자가 직접 입력하는 설명(001-02 5-0장) — 카카오 API에는 없는 필드.
    @Column(name = "description", length = 500)
    private String description;

    // 편의시설(2026-08-09 추가) — 콤마로 구분한 코드 목록(parking,wifi,pet,...). 별도 테이블을 새로
    // 만들 만큼 값이 다양하거나 검색/필터에 쓰이는 게 아니라 사업자 마이페이지 표시용으로만 쓰여서,
    // 단순하게 문자열 컬럼 하나로 둔다(과한 정규화 지양).
    @Column(name = "amenities", length = 200)
    private String amenities;

    // 사업자 등록 시 직접 입력/수정하는 전화번호. 검색 결과 표시용 전화번호는 카카오 라이브 응답 값을
    // 그대로 쓰고(저장 안 함), 이 값이 있으면 그걸로 덮어써서 우선 노출한다(RestaurantServiceImpl 참고).
    @Column(name = "phone", length = 20)
    private String phone;

    // 음식점 사진(2026-07-20 요구사항 추가) — 사업자가 직접 업로드하기 전까지 null.
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "management_status", nullable = false, length = 20)
    private String managementStatus;

    @Column(name = "business_status", nullable = false, length = 20)
    private String businessStatus;

    @Column(name = "avg_rating", nullable = false, precision = 3, scale = 2)
    private BigDecimal avgRating;

    @Column(name = "review_count", nullable = false)
    private Integer reviewCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    protected Restaurant() {
    }

    // 누군가 이 카카오 place id를 처음 건드릴 때(상세조회/리뷰/즐겨찾기/사업자등록) 빈 부가정보 행을 만든다.
    public static Restaurant createExtras(String restaurantId) {
        Restaurant restaurant = new Restaurant();
        restaurant.restaurantId = restaurantId;
        restaurant.managementStatus = MANAGEMENT_STATUS_UNCLAIMED;
        restaurant.businessStatus = BUSINESS_STATUS_UNKNOWN;
        restaurant.avgRating = BigDecimal.ZERO;
        restaurant.reviewCount = 0;
        return restaurant;
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

    // 사업장 주소 자동귀속(2026-07-20 요구사항 추가) — RestaurantClaimServiceImpl 참고.
    public void claim() {
        this.managementStatus = MANAGEMENT_STATUS_CLAIMED;
    }

    // 사업자 등록(전화/영업시간/메뉴/이미지) 쓰기 API에서 본인 소유 음식점의 필드를 갱신할 때 사용.
    public void updatePhone(String phone) {
        this.phone = phone;
    }

    public void updateImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public void updateExtras(String description, String amenities) {
        this.description = description;
        this.amenities = amenities;
    }

    // 리뷰 등록/삭제 시 평점/리뷰수 캐시를 다시 계산해 반영한다 — ReviewServiceImpl이 리뷰 저장 직후
    // 그 음식점의 AVG(rating)/COUNT(*)를 다시 조회해서 호출.
    public void updateRatingCache(BigDecimal avgRating, int reviewCount) {
        this.avgRating = avgRating != null ? avgRating : BigDecimal.ZERO;
        this.reviewCount = reviewCount;
    }

    public String getRestaurantId() {
        return restaurantId;
    }

    public String getDescription() {
        return description;
    }

    public String getAmenities() {
        return amenities;
    }

    public String getPhone() {
        return phone;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getManagementStatus() {
        return managementStatus;
    }

    public String getBusinessStatus() {
        return businessStatus;
    }

    public BigDecimal getAvgRating() {
        return avgRating;
    }

    public Integer getReviewCount() {
        return reviewCount;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }
}
