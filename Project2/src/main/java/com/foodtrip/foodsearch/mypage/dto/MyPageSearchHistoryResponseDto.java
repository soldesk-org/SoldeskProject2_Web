package com.foodtrip.foodsearch.mypage.dto;

import java.time.LocalDateTime;

public class MyPageSearchHistoryResponseDto {

    private final Long searchHistoryId;
    private final String keyword;
    private final LocalDateTime createdAt;

    public MyPageSearchHistoryResponseDto(Long searchHistoryId, String keyword, LocalDateTime createdAt) {
        this.searchHistoryId = searchHistoryId;
        this.keyword = keyword;
        this.createdAt = createdAt;
    }

    public Long getSearchHistoryId() {
        return searchHistoryId;
    }

    public String getKeyword() {
        return keyword;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
