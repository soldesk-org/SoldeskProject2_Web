package com.foodtrip.foodsearch.dto;

import java.util.List;

public class FoodBtiResultDTO {

    // 최종 음BTI 유형 예: SNTP
    private String resultType;

    // 화면에 표시할 고유한 유형 이름
    private String resultName;

    // 결과 설명
    private String resultText;

    /*
     * 기존 프론트와의 호환성을 위해 유지하는 추천 음식 이름 목록입니다.
     * 새 검색 기능에서는 아래 recommendations를 사용합니다.
     */
    private List<String> food;

    // 기존 점수 데이터
    private ScoreDTO score;

    // 네 가지 성향 축의 비율
    private List<TraitScoreDTO> traits;

    // 검색 키워드, 일치도, 추천 이유를 포함한 확장 추천 목록
    private List<FoodRecommendationDTO> recommendations;

    public FoodBtiResultDTO() {
    }

    public FoodBtiResultDTO(String resultType, String resultName, String resultText,
            List<String> food, ScoreDTO score) {
        this(resultType, resultName, resultText, food, score, List.of(), List.of());
    }

    public FoodBtiResultDTO(String resultType, String resultName, String resultText,
            List<String> food, ScoreDTO score, List<TraitScoreDTO> traits,
            List<FoodRecommendationDTO> recommendations) {
        this.resultType = resultType;
        this.resultName = resultName;
        this.resultText = resultText;
        this.food = food;
        this.score = score;
        this.traits = traits;
        this.recommendations = recommendations;
    }

    public String getResultType() {
        return resultType;
    }

    public void setResultType(String resultType) {
        this.resultType = resultType;
    }

    public String getResultName() {
        return resultName;
    }

    public void setResultName(String resultName) {
        this.resultName = resultName;
    }

    public String getResultText() {
        return resultText;
    }

    public void setResultText(String resultText) {
        this.resultText = resultText;
    }

    public List<String> getFood() {
        return food;
    }

    public void setFood(List<String> food) {
        this.food = food;
    }

    public ScoreDTO getScore() {
        return score;
    }

    public void setScore(ScoreDTO score) {
        this.score = score;
    }

    public List<TraitScoreDTO> getTraits() {
        return traits;
    }

    public void setTraits(List<TraitScoreDTO> traits) {
        this.traits = traits;
    }

    public List<FoodRecommendationDTO> getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(List<FoodRecommendationDTO> recommendations) {
        this.recommendations = recommendations;
    }
}
