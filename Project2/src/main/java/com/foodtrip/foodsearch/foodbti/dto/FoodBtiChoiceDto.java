package com.foodtrip.foodsearch.foodbti.dto;

public class FoodBtiChoiceDto {

    private final String text;
    private final String score;

    public FoodBtiChoiceDto(String text, String score) {
        this.text = text;
        this.score = score;
    }

    public String getText() {
        return text;
    }

    public String getScore() {
        return score;
    }
}
