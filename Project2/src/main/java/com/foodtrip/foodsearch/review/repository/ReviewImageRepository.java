package com.foodtrip.foodsearch.review.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.review.entity.ReviewImage;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {

    List<ReviewImage> findByReviewIdOrderByReviewImageIdAsc(Long reviewId);

    List<ReviewImage> findByReviewIdInOrderByReviewImageIdAsc(List<Long> reviewIds);

    long countByReviewId(Long reviewId);

    void deleteByReviewId(Long reviewId);
}
