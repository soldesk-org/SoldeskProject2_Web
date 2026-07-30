package com.foodtrip.foodsearch.restaurant.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// 검색 기록(마이페이지 11-연장, 2026-07-22 추가) — DB-테이블설계.md 5-3장에 이미 설계돼 있던 테이블을
// 실제로 처음 사용한다. 로그인한 회원이 GET /api/restaurants/search를 키워드와 함께 호출할 때마다
// 이 시점에 기록한다(RestaurantSearchHistoryRecorder). **(2026-07-22 변경)** 같은 키워드를 여러 번
// 검색해도 새 행이 계속 쌓이지 않도록, 이미 있는 (member_id, keyword) 행이면 새로 만들지 않고
// created_at만 지금 시각으로 갱신한다("최근 검색어" 목록 맨 위로 다시 올라오는 흔한 UX 패턴).
@Entity
@Table(name = "search_histories")
public class SearchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "search_history_id")
    private Long searchHistoryId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "keyword", length = 200)
    private String keyword;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected SearchHistory() {
    }

    public static SearchHistory create(Long memberId, String keyword) {
        SearchHistory history = new SearchHistory();
        history.memberId = memberId;
        history.keyword = keyword;
        return history;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // 같은 키워드를 다시 검색했을 때 새 행을 만드는 대신 이 행을 "최근"으로 다시 올리는 용도(2026-07-22 추가).
    public void touch() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getSearchHistoryId() {
        return searchHistoryId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getKeyword() {
        return keyword;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
