package com.foodtrip.foodsearch.review.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.review.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // 관리자 리뷰 목록(14.관리자-권한, 2026-07-23 추가) — 최신순, 삭제되지 않은 리뷰만.
    Page<Review> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(String status, Pageable pageable);

    // 관리자 대시보드(14.관리자-권한 2차, 2026-07-23 추가) — "작성된 리뷰 수" 통계.
    long countByStatusAndDeletedAtIsNull(String status);

    List<Review> findByRestaurantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(String restaurantId, String status);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.restaurantId = :restaurantId "
            + "AND r.status = 'NORMAL' AND r.deletedAt IS NULL")
    BigDecimal findAverageRating(@Param("restaurantId") String restaurantId);

    long countByRestaurantIdAndStatusAndDeletedAtIsNull(String restaurantId, String status);

    // 마이페이지(11) "내 리뷰"(2026-07-22 추가).
    List<Review> findByMemberIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(Long memberId, String status);

    // 마이페이지(11) "방문기록"(2026-07-22 추가) — "영수증 인증까지 성공한 리뷰를 남긴 가게"를 방문기록으로
    // 취급하기로 확정(별도 방문 추적 테이블을 새로 만들지 않음, 001-02 2-2장 참고).
    List<Review> findByMemberIdAndReceiptVerifiedTrueAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(
            Long memberId, String status);

    // 리뷰 수정/삭제(2026-07-22 추가) — 본인 소유 확인까지 한 쿼리로.
    Optional<Review> findByReviewIdAndDeletedAtIsNull(Long reviewId);

    // 사업자 마이페이지 "내 매장 관리"(2026-08-06 추가) — "리뷰 더 보기" 페이지네이션용.
    Page<Review> findByRestaurantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(
            String restaurantId, String status, Pageable pageable);

    // 별점 분포(5~1점) 집계용 — 리뷰 건수가 크지 않은 매장 단위라 자바에서 그룹핑한다.
    @Query("SELECT r.rating FROM Review r WHERE r.restaurantId = :restaurantId "
            + "AND r.status = 'NORMAL' AND r.deletedAt IS NULL")
    List<Integer> findAllRatingsByRestaurantId(@Param("restaurantId") String restaurantId);

    // 기간 필터(2026-08-10 추가) — 사업자 마이페이지 "리뷰 반응" 탭의 최근 1개월/3개월 select box가
    // 그동안 UI만 있고 실제로는 무시되던 걸 실제로 연결.
    @Query("SELECT r.rating FROM Review r WHERE r.restaurantId = :restaurantId "
            + "AND r.status = 'NORMAL' AND r.deletedAt IS NULL AND r.createdAt >= :periodStart")
    List<Integer> findAllRatingsByRestaurantIdAndCreatedAtAfter(
            @Param("restaurantId") String restaurantId, @Param("periodStart") LocalDateTime periodStart);

    Page<Review> findByRestaurantIdAndStatusAndDeletedAtIsNullAndCreatedAtAfterOrderByCreatedAtDesc(
            String restaurantId, String status, LocalDateTime periodStart, Pageable pageable);

    long countByRestaurantIdAndReceiptVerifiedTrueAndStatusAndDeletedAtIsNullAndCreatedAtBetween(
            String restaurantId, String status, LocalDateTime start, LocalDateTime end);

    // 영수증 중복 검사(2026-08-10 수정) — 업로드만 하고 리뷰 작성을 끝까지 안 한 영수증까지 "이미 사용한
    // 영수증"으로 막던 문제 수정용. 실제로 리뷰에 연결된 적이 있는 영수증인지 확인.
    boolean existsByReceiptIdAndDeletedAtIsNull(Long receiptId);
}
