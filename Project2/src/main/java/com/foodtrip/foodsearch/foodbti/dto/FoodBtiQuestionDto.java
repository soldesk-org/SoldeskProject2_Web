package com.foodtrip.foodsearch.foodbti.dto;

public class FoodBtiQuestionDto {

    private final int questionNo;
    private final String question;
    private final FoodBtiChoiceDto choiceA;
    private final FoodBtiChoiceDto choiceB;

    public FoodBtiQuestionDto(int questionNo, String question, FoodBtiChoiceDto choiceA, FoodBtiChoiceDto choiceB) {
        this.questionNo = questionNo;
        this.question = question;
        this.choiceA = choiceA;
        this.choiceB = choiceB;
    }

    public int getQuestionNo() {
        return questionNo;
    }

    public String getQuestion() {
        return question;
    }

    public FoodBtiChoiceDto getChoiceA() {
        return choiceA;
    }

    public FoodBtiChoiceDto getChoiceB() {
        return choiceB;
    }
}
