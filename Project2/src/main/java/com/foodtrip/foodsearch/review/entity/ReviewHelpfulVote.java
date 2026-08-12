package com.foodtrip.foodsearch.review.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

// 리뷰 "도움됨" 투표(2026-08-12 추가) — 마이페이지 "받은 도움됨" 통계와 "도움됨 많은순" 정렬이 실제
// 데이터 없이 화면에만 있던 문제를 해결하기 위해 신규 도입. 회원 1명당 리뷰 1개에 1표만(중복 방지),
// 토글(등록/해제)만 지원하고 별도 사유는 받지 않는다 — 16(리뷰-신고)의 사유 기반 모델과는 성격이 달라
// 재사용하지 않는다.
@Entity
@Table(name = "review_helpful_votes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_review_helpful_member", columnNames = { "review_id", "member_id" })
})
public class ReviewHelpfulVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_helpful_vote_id")
    private Long reviewHelpfulVoteId;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ReviewHelpfulVote() {
    }

    public static ReviewHelpfulVote create(Long reviewId, Long memberId) {
        ReviewHelpfulVote vote = new ReviewHelpfulVote();
        vote.reviewId = reviewId;
        vote.memberId = memberId;
        return vote;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getReviewHelpfulVoteId() {
        return reviewHelpfulVoteId;
    }

    public Long getReviewId() {
        return reviewId;
    }

    public Long getMemberId() {
        return memberId;
    }
}
