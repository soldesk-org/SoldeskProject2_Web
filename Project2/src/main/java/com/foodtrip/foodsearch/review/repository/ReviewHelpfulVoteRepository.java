package com.foodtrip.foodsearch.review.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.foodtrip.foodsearch.review.entity.ReviewHelpfulVote;

public interface ReviewHelpfulVoteRepository extends JpaRepository<ReviewHelpfulVote, Long> {

    Optional<ReviewHelpfulVote> findByReviewIdAndMemberId(Long reviewId, Long memberId);

    long countByReviewId(Long reviewId);

    List<ReviewHelpfulVote> findByMemberIdAndReviewIdIn(Long memberId, List<Long> reviewIds);

    @Query("select v.reviewId, count(v) from ReviewHelpfulVote v where v.reviewId in :reviewIds group by v.reviewId")
    List<Object[]> countByReviewIdIn(@Param("reviewIds") List<Long> reviewIds);
}
