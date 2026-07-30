package com.foodtrip.foodsearch.foodbti.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class FoodBtiAnswerRequestDto {

    @NotNull
    @Size(min = 12, max = 12, message = "12개 질문에 모두 답변해야 합니다.")
    private List<String> answers;

    public FoodBtiAnswerRequestDto() {
    }

    public List<String> getAnswers() {
        return answers;
    }

    public void setAnswers(List<String> answers) {
        this.answers = answers;
    }
}
