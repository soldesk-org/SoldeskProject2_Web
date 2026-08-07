package com.foodtrip.foodsearch.foodbti.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.foodbti.dto.FoodBtiAnswerRequestDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiQuestionDto;
import com.foodtrip.foodsearch.foodbti.dto.FoodBtiResultResponseDto;
import com.foodtrip.foodsearch.foodbti.service.FoodBtiService;

import jakarta.validation.Valid;

// 음BTI(음식 취향 MBTI) — 질문 조회는 비로그인도 가능, 결과 계산은 로그인 상태면 members.food_bti에 저장까지
// 함께 처리한다(FoodBtiServiceImpl 참고). 마이페이지(11)의 음BTI 표시 필드가 이 기능으로 채워진다.
@RestController
public class FoodBtiController {

    private final FoodBtiService foodBtiService;

    public FoodBtiController(FoodBtiService foodBtiService) {
        this.foodBtiService = foodBtiService;
    }

    @GetMapping("/api/food-bti/questions")
    public List<FoodBtiQuestionDto> getQuestions() {
        return foodBtiService.getQuestions();
    }

    @PostMapping("/api/food-bti/result")
    public FoodBtiResultResponseDto calculateResult(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody FoodBtiAnswerRequestDto request) {
        return foodBtiService.calculateResult(authorizationHeader, request);
    }

    // 마이페이지(프로필 수정)에서 이전에 저장된 결과를 축별 점수와 함께 다시 보여줄 때 쓴다(2026-08-04
    // 추가). 로그인 필수(비로그인이면 401), 결과를 아직 한 번도 저장한 적 없으면 404.
    @GetMapping("/api/food-bti/my-result")
    public FoodBtiResultResponseDto getMyResult(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return foodBtiService.getMyResult(authorizationHeader);
    }
}
