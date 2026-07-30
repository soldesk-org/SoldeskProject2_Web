package com.foodtrip.foodsearch.review.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// 리뷰 태그(2026-07-22 추가) — review_keywords 테이블은 다른 팀원이 AI 추천 기능을 위해 이미
// 만들어둔 것(place_keyword_scores/user_food_actions와 같은 시점에 생성됨)을 그대로 재사용한다.
// sentiment 컬럼이 실제 MySQL ENUM('POSITIVE','NEGATIVE','NEUTRAL')이라, 이걸 JPA @Entity로 매핑하면
// ddl-auto=update가 스키마 불일치로 보고 컬럼 타입을 임의로 바꿔버릴 위험이 있다 — 그 팀원의 작업을
// 건드리지 않기 위해 일부러 JPA를 쓰지 않고 JdbcTemplate으로 직접 SQL만 다룬다.
@Component
public class ReviewKeywordDao {

    private final JdbcTemplate jdbcTemplate;

    public ReviewKeywordDao(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void insertAll(Long reviewId, List<String> keywords) {
        for (String keyword : keywords) {
            String sentiment = ReviewKeywordCatalog.sentimentOf(keyword);
            jdbcTemplate.update(
                    "INSERT INTO review_keywords (review_id, keyword, sentiment, created_at) VALUES (?, ?, ?, NOW())",
                    reviewId, keyword, sentiment);
        }
    }

    public void deleteByReviewId(Long reviewId) {
        jdbcTemplate.update("DELETE FROM review_keywords WHERE review_id = ?", reviewId);
    }

    public List<String> findKeywordsByReviewId(Long reviewId) {
        return jdbcTemplate.queryForList(
                "SELECT keyword FROM review_keywords WHERE review_id = ? ORDER BY review_keyword_id ASC",
                String.class, reviewId);
    }

    // 목록 조회(리뷰 여러 건)에서 N+1 없이 한 번에 가져오기 위한 배치 조회.
    public Map<Long, List<String>> findKeywordsByReviewIds(List<Long> reviewIds) {
        if (reviewIds.isEmpty()) {
            return Map.of();
        }
        String placeholders = reviewIds.stream().map(id -> "?").collect(Collectors.joining(","));
        String sql = "SELECT review_id, keyword FROM review_keywords WHERE review_id IN (" + placeholders
                + ") ORDER BY review_keyword_id ASC";
        Map<Long, List<String>> result = new HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            Long reviewId = rs.getLong("review_id");
            result.computeIfAbsent(reviewId, k -> new ArrayList<>()).add(rs.getString("keyword"));
        }, reviewIds.toArray());
        return result;
    }
}
