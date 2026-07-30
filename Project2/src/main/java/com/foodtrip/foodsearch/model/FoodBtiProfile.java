package com.foodtrip.foodsearch.model;

/**
 * 음BTI 한 유형의 고유한 이름과 설명을 보관하는 객체입니다.
 * 질문 계산 로직과 결과 문구를 분리하면 16개 유형을 한곳에서 관리할 수 있습니다.
 */
public class FoodBtiProfile {

    private final String type;
    private final String name;
    private final String description;

    public FoodBtiProfile(String type, String name, String description) {
        this.type = type;
        this.name = name;
        this.description = description;
    }

    public String getType() {
        return type;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }
}
