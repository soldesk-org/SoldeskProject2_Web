package com.foodtrip.foodsearch.review.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    // 사업자 마이페이지 "리뷰 반응 요약"(2026-08-06 추가) — 매장 단위 태그 빈도수 집계, 많이 받은 순.
    public List<Map<String, Object>> countKeywordsByRestaurantId(String restaurantId) {
        return countKeywordsByRestaurantId(restaurantId, null);
    }

    // 기간 필터(2026-08-10 추가) — periodStart가 null이면 전체 기간(기존과 동일).
    public List<Map<String, Object>> countKeywordsByRestaurantId(String restaurantId, LocalDateTime periodStart) {
        String sql = "SELECT rk.keyword AS keyword, rk.sentiment AS sentiment, COUNT(*) AS cnt "
                + "FROM review_keywords rk JOIN reviews r ON r.review_id = rk.review_id "
                + "WHERE r.restaurant_id = ? AND r.status = 'NORMAL' AND r.deleted_at IS NULL "
                + (periodStart != null ? "AND r.created_at >= ? " : "")
                + "GROUP BY rk.keyword, rk.sentiment ORDER BY cnt DESC";
        return periodStart != null
                ? jdbcTemplate.queryForList(sql, restaurantId, periodStart)
                : jdbcTemplate.queryForList(sql, restaurantId);
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

    public Map<String, Long> countNormalReviewsByRestaurantIds(List<String> restaurantIds) {
        if (restaurantIds.isEmpty()) {
            return Map.of();
        }
        String placeholders = restaurantIds.stream().map(id -> "?").collect(Collectors.joining(","));
        String sql = "SELECT restaurant_id, COUNT(*) AS cnt FROM reviews "
                + "WHERE restaurant_id IN (" + placeholders + ") "
                + "AND status = 'NORMAL' AND deleted_at IS NULL GROUP BY restaurant_id";
        Map<String, Long> result = new HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            result.put(rs.getString("restaurant_id"), rs.getLong("cnt"));
        }, restaurantIds.toArray());
        return result;
    }

    public Map<String, KeywordMatchStats> findPositiveKeywordMatches(List<String> restaurantIds,
                                                                      List<String> keywords) {
        if (restaurantIds.isEmpty() || keywords.isEmpty()) {
            return Map.of();
        }
        String restaurantPlaceholders = restaurantIds.stream().map(id -> "?").collect(Collectors.joining(","));
        String keywordPlaceholders = keywords.stream().map(keyword -> "?").collect(Collectors.joining(","));
        String sql = "SELECT r.restaurant_id, r.review_id, rk.keyword "
                + "FROM reviews r JOIN review_keywords rk ON rk.review_id = r.review_id "
                + "WHERE r.restaurant_id IN (" + restaurantPlaceholders + ") "
                + "AND rk.keyword IN (" + keywordPlaceholders + ") "
                + "AND rk.sentiment = 'POSITIVE' "
                + "AND r.status = 'NORMAL' AND r.deleted_at IS NULL "
                + "ORDER BY r.restaurant_id, r.review_id, rk.review_keyword_id";

        List<Object> parameters = new ArrayList<>(restaurantIds);
        parameters.addAll(keywords);
        Map<String, Set<Long>> reviewIdsByRestaurant = new LinkedHashMap<>();
        Map<String, Set<String>> keywordsByRestaurant = new LinkedHashMap<>();
        jdbcTemplate.query(sql, rs -> {
            String restaurantId = rs.getString("restaurant_id");
            reviewIdsByRestaurant.computeIfAbsent(restaurantId, ignored -> new LinkedHashSet<>())
                    .add(rs.getLong("review_id"));
            keywordsByRestaurant.computeIfAbsent(restaurantId, ignored -> new LinkedHashSet<>())
                    .add(rs.getString("keyword"));
        }, parameters.toArray());

        Map<String, KeywordMatchStats> result = new LinkedHashMap<>();
        for (Map.Entry<String, Set<Long>> entry : reviewIdsByRestaurant.entrySet()) {
            List<String> matchedKeywords = List.copyOf(
                    keywordsByRestaurant.getOrDefault(entry.getKey(), Set.of()));
            result.put(entry.getKey(), new KeywordMatchStats(entry.getValue().size(), matchedKeywords));
        }
        return result;
    }

    public record KeywordMatchStats(long matchedReviewCount, List<String> matchedKeywords) {
    }
}
