package com.foodtrip.foodsearch.service;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.dto.FoodBtiChoiceDTO;
import com.foodtrip.foodsearch.dto.FoodBtiQuestionDTO;

@Service
public class FoodBtiService {

	// 질문 목록
	public List<FoodBtiQuestionDTO> getQuestions(){
		
		List<FoodBtiQuestionDTO> questions = new ArrayList<>();
		
		// 첫번째 성향 
		// L : 담백한 맛
		// S : 자극적인 맛
		questions.add(new FoodBtiQuestionDTO(
				1, "음식을 먹을 때 더 끌리는 맛은?",
				new FoodBtiChoiceDTO("재료 본연의 담백하고 깔끔한 맛.","L"),				
				new FoodBtiChoiceDTO("맵고 짜고 양념이 강한 자극적인 맛.", "S")));
		
		questions.add(new FoodBtiQuestionDTO(
				2, "스트레스 받는 날 먹고 싶은 음식은?",
				new FoodBtiChoiceDTO("따뜻하고 편한 국물이나 집밥.", "L"),
				new FoodBtiChoiceDTO("매운 음식이나 양념이 강한 음식.", "S")));
		
		questions.add(new FoodBtiQuestionDTO(
				3, "야식으로 더 먹고싶은 음식은?",
				new FoodBtiChoiceDTO("샌드위치, 죽, 셀러드처럼 부담이 없고 부드러운 음식.", "L"),
				new FoodBtiChoiceDTO("닭발, 떡볶이, 마라탕처럼 강렬한 음식.", "S")));
		
		// 두번째 성향
		// F : 익숙한 음식 
		// N : 새로운 음식
		questions.add(new FoodBtiQuestionDTO(
				4, "만약 해외여행에서 현지 음식을 발견한다면?",
				new FoodBtiChoiceDTO("내가 조금이라도 알고 있는 무난한 음식을 찾는다.", "F"),
				new FoodBtiChoiceDTO("현지에서만 먹을 수 있는 음식에 도전한다.", "N")));

		questions.add(new FoodBtiQuestionDTO(
				5, "자주 가는 맛집이 생겼을 때 나는?",
				new FoodBtiChoiceDTO("마음에 들었던 메뉴를 계속 주문한다.", "F"),
				new FoodBtiChoiceDTO("다른 메뉴를 골라가며 먹어본다.", "N")));
		
		questions.add(new FoodBtiQuestionDTO(
				6, "처음 방문한 식당에서 메뉴를 고를때 나는?",
				new FoodBtiChoiceDTO("익숙한 메뉴를 선택한다.", "F"),
				new FoodBtiChoiceDTO("처음 보는 메뉴에 도전해본다.", "N")));
		
		// 세번째 성향
		// A : 혼자먹기
		// T : 함께 먹기
		questions.add(new FoodBtiQuestionDTO(
				7, "맛있는 음식이 생각났을 때 나는?",
				new FoodBtiChoiceDTO("혼자라도 바로 먹으러 간다.", "A"),
				new FoodBtiChoiceDTO("같이 먹으러 갈사람을 먼저 찾는다.", "T")));
		
		questions.add(new FoodBtiQuestionDTO(
				8, "밥을 먹을 때 선호하는 분위기는?",
				new FoodBtiChoiceDTO("혼자 조용하고 편하게 먹는 분위기.", "A"),
				new FoodBtiChoiceDTO("친구 또는 지인과 이야기하며 먹는 분위기.", "T")));
		
		questions.add(new FoodBtiQuestionDTO(
				9, "길을 가다 새로운 맛집을 발견했을 때 나는?",
				new FoodBtiChoiceDTO("내 일정에 맞춰 혼자라도 방문.", "A"),
				new FoodBtiChoiceDTO("친구와 공유하고 함께 방문.", "T")));
		
		questions.add(new FoodBtiQuestionDTO(
				10, "길을 가다 새로운 맛집을 발견했을 때 나는?",
				new FoodBtiChoiceDTO("내 일정에 맞춰 혼자라도 방문.", "A"),
				new FoodBtiChoiceDTO("친구와 공유하고 함께 방문.", "T")));
		
		// 네번째 성향
		// P : 계획적으로 선택
		// I : 즉흥적으로 선택
		questions.add(new FoodBtiQuestionDTO(
				11, "식당에 방문하기 전 나는?",
				new FoodBtiChoiceDTO("메뉴, 가격, 리뷰 미리 확인한다.", "P"),
				new FoodBtiChoiceDTO("일단 방문해서 끌리는 메뉴를 선택한다.", "I")));
		
		questions.add(new FoodBtiQuestionDTO(
				12, "주말 외식 장소를 정할 때 나는?",
				new FoodBtiChoiceDTO("며칠 전부터 식당을 검색하고 정한다.", "P"),
				new FoodBtiChoiceDTO("당일 나가서 먹고싶은 메뉴를 선택한다.", "I")));
		
		questions.add(new FoodBtiQuestionDTO(
				11, "식당에 웨이팅이 길게 있다면 나는?",
				new FoodBtiChoiceDTO("미리 찾아둔 다음 식당으로 이동한다.", "P"),
				new FoodBtiChoiceDTO("주변을 둘러보다 가장 눈에 띄는 식당으로 들어간다.", "I")));
		
		return questions;
	}
	
	
	
	
	
	
	
}














