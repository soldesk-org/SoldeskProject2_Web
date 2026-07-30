package com.foodtrip.foodsearch.foodbti.dto;

import java.util.List;

public class FoodBtiResultResponseDto {

    private final String resultType;
    private final String resultName;
    private final String resultText;
    private final List<String> food;
    private final FoodBtiScoreDto score;
    // 로그인 상태로 호출해서 회원 정보(members.food_bti)에 실제로 저장됐는지 여부.
    // 비로그인(테스트) 호출이면 결과만 계산하고 저장하지 않으므로 항상 false.
    private final boolean saved;

    public FoodBtiResultResponseDto(String resultType, String resultName, String resultText,
                                     List<String> food, FoodBtiScoreDto score, boolean saved) {
        this.resultType = resultType;
        this.resultName = resultName;
        this.resultText = resultText;
        this.food = food;
        this.score = score;
        this.saved = saved;
    }

    public String getResultType() {
        return resultType;
    }

    public String getResultName() {
        return resultName;
    }

    public String getResultText() {
        return resultText;
    }

    public List<String> getFood() {
        return food;
    }

    public FoodBtiScoreDto getScore() {
        return score;
    }

    public boolean isSaved() {
        return saved;
    }
}
