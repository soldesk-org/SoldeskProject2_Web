package com.foodtrip.foodsearch.dto;

/**
 * 추천 음식과 검색 기능에 넘길 값을 함께 전달합니다.
 * searchKeyword는 지도/맛집 검색 담당 기능이 그대로 사용할 수 있습니다.
 */
public class FoodRecommendationDTO {

    private String name;
    private String searchKeyword;
    private int matchScore;
    private String reason;

    public FoodRecommendationDTO() {
    }

    public FoodRecommendationDTO(String name, String searchKeyword, int matchScore, String reason) {
        this.name = name;
        this.searchKeyword = searchKeyword;
        this.matchScore = matchScore;
        this.reason = reason;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSearchKeyword() {
        return searchKeyword;
    }

    public void setSearchKeyword(String searchKeyword) {
        this.searchKeyword = searchKeyword;
    }

    public int getMatchScore() {
        return matchScore;
    }

    public void setMatchScore(int matchScore) {
        this.matchScore = matchScore;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
