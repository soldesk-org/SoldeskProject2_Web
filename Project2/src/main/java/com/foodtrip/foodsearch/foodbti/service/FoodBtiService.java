package com.foodtrip.foodsearch.foodbti.service;

import java.util.List;

import com.foodtrip.foodsearch.foodbti.dto.FoodBtiAnswerRequestDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiQuestionDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiResultResponseDto;

public interface FoodBtiService {

    List<FoodBtiQuestionDto> getQuestions();

    FoodBtiResultResponseDto calculateResult(String authorizationHeader, FoodBtiAnswerRequestDto request);

    // 마이페이지(프로필 수정)에서 예전에 저장해둔 음BTI 결과를 축별 점수와 함께 다시 보여줄 때 쓴다.
    FoodBtiResultResponseDto getMyResult(String authorizationHeader);
}
