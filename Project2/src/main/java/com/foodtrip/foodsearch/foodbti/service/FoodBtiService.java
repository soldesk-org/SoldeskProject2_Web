package com.foodtrip.foodsearch.foodbti.service;

import java.util.List;

import com.foodtrip.foodsearch.foodbti.dto.FoodBtiAnswerRequestDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiQuestionDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiResultResponseDto;

public interface FoodBtiService {

    List<FoodBtiQuestionDto> getQuestions();

    FoodBtiResultResponseDto calculateResult(String authorizationHeader, FoodBtiAnswerRequestDto request);
}
