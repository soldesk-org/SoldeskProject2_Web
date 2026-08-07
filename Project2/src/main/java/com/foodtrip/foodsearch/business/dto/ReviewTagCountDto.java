package com.foodtrip.foodsearch.business.dto;

public class ReviewTagCountDto {

    private final String keyword;
    private final long count;

    public ReviewTagCountDto(String keyword, long count) {
        this.keyword = keyword;
        this.count = count;
    }

    public String getKeyword() {
        return keyword;
    }

    public long getCount() {
        return count;
    }
}
