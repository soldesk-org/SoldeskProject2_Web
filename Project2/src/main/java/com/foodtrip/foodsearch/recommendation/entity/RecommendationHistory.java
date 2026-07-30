package com.foodtrip.foodsearch.recommendation.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// AI 추천 피드백(18.추천-피드백, 2026-07-24 추가) — DB-테이블설계.md 6-1장에 이미 설계돼 있던
// recommendation_histories 테이블을 실제로 처음 사용한다(그전엔 어느 쪽도 이 테이블에 쓰지 않는
// "만들어만 두고 안 쓰는" 상태였음, row 0건 확인). 로그인한 회원이 자연어로 추천을 요청할 때만
// 이 시점에 기록한다(비로그인 요청은 원래대로 로그인 없이 계속 가능하지만, 이력이 안 남아서 그 요청에는
// 피드백을 남길 수 없음 — member_id가 DB에서부터 NOT NULL이라 강제되는 제약, 001-02 2-2장 참고).
@Entity
@Table(name = "recommendation_histories")
public class RecommendationHistory {

    public static final String TYPE_KEYWORD = "KEYWORD";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recommendation_history_id")
    private Long recommendationHistoryId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "recommendation_type", nullable = false, length = 30)
    private String recommendationType;

    @Column(name = "query_text", length = 500)
    private String queryText;

    @Column(name = "extracted_keywords", length = 500)
    private String extractedKeywords;

    @Column(name = "current_latitude")
    private java.math.BigDecimal currentLatitude;

    @Column(name = "current_longitude")
    private java.math.BigDecimal currentLongitude;

    @Column(name = "max_budget")
    private Integer maxBudget;

    // 피드백(2026-07-24 신규 컬럼) - was_helpful은 NULL이면 "아직 피드백 없음", true/false로 좋아요/싫어요.
    @Column(name = "was_helpful")
    private Boolean wasHelpful;

    @Column(name = "feedback_at")
    private LocalDateTime feedbackAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected RecommendationHistory() {
    }

    public static RecommendationHistory create(Long memberId, String queryText, String extractedKeywords,
                                                 java.math.BigDecimal currentLatitude, java.math.BigDecimal currentLongitude,
                                                 Integer maxBudget) {
        RecommendationHistory history = new RecommendationHistory();
        history.memberId = memberId;
        history.recommendationType = TYPE_KEYWORD;
        history.queryText = queryText;
        history.extractedKeywords = extractedKeywords;
        history.currentLatitude = currentLatitude;
        history.currentLongitude = currentLongitude;
        history.maxBudget = maxBudget;
        return history;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void submitFeedback(boolean wasHelpful) {
        this.wasHelpful = wasHelpful;
        this.feedbackAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getRecommendationHistoryId() {
        return recommendationHistoryId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public Boolean getWasHelpful() {
        return wasHelpful;
    }

    public LocalDateTime getFeedbackAt() {
        return feedbackAt;
    }
}
