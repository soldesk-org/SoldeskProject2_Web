package com.foodtrip.foodsearch;

import java.util.List;

import com.foodtrip.foodsearch.dto.FoodBtiAnswerDTO;
import com.foodtrip.foodsearch.dto.FoodBtiResultDTO;
import com.foodtrip.foodsearch.service.FoodBtiService;

public class FoodBtiServiceTest {

	public static void main(String[] args) {
		
		FoodBtiService foodBtiService = new FoodBtiService();
		
		// 프론트에서 넘어왔다고 가정할 답변 DTO
		FoodBtiAnswerDTO answerDTO = new FoodBtiAnswerDTO();
		
		// 12개 답변 직접 설정(값 바꿔서 실행해 보시면 됩니다)
		//				(L / S) (F / N) (A / T) (P / I)
		
		answerDTO.setAnswer(List.of(
				"S","S","L",
				"F","N","F",
				"A","A","A",
				"I","I","I"
				));		
		
		// 결과 계산
		FoodBtiResultDTO result = foodBtiService.calculateResult(answerDTO);
		
		// 출력
		System.out.println("-------- 음BTI 로직 결과 테스트 --------");
		System.out.println("결과 유형 : " + result.getResultType());
		System.out.println("결과 이름 : " + result.getResultName());
		System.out.println("결과 설명 : " + result.getResultText());

		System.out.println("\n추천 음식");
		for (String food : result.getFood()) {
		    System.out.println("🍽 " + food);
		}
		
	}
	
	
	
	
	
	
	
	
	
	
}
