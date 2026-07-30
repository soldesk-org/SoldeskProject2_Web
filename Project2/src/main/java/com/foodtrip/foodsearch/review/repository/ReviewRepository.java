package com.foodtrip.foodsearch.review.repository;

import java.math.BigDecimal;
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
}
