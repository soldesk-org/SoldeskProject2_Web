package com.foodtrip.foodsearch.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.dto.FoodBtiAnswerDTO;
import com.foodtrip.foodsearch.dto.FoodBtiQuestionDTO;
import com.foodtrip.foodsearch.dto.FoodBtiResultDTO;
import com.foodtrip.foodsearch.service.FoodBtiService;

@RestController
@RequestMapping("/api/food-bti")
public class FoodBtiAPIController {
	
	 private final FoodBtiService foodBtiService;

	    public FoodBtiAPIController(FoodBtiService foodBtiService) {
	        this.foodBtiService = foodBtiService;
	    }
	
	// 질문 목록 GET방식 조회
	@GetMapping("/questions")
	 public ResponseEntity<List<FoodBtiQuestionDTO>> getQuestions() {

        List<FoodBtiQuestionDTO> questions =
                foodBtiService.getQuestions();

        return ResponseEntity.ok(questions);
    }
	
	// 결과 계산 POST
	@PostMapping("/result")
	 public ResponseEntity<FoodBtiResultDTO> calculateResult(
	            @RequestBody 
	            FoodBtiAnswerDTO answerDTO) {
	        FoodBtiResultDTO result =
	                foodBtiService.calculateResult(answerDTO);
	        return ResponseEntity.ok(result);
	    }
	
}














