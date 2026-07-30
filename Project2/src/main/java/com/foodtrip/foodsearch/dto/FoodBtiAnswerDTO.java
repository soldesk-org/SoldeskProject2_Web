package com.foodtrip.foodsearch.dto;

import java.util.List;

public class FoodBtiAnswerDTO {

	// 사용자가 선택한 답변(성향)의 목록
	private List<String> answer;
	
	public FoodBtiAnswerDTO() {
		// TODO Auto-generated constructor stub
	}

	public List<String> getAnswer() {
		return answer;
	}

	public void setAnswer(List<String> answer) {
		this.answer = answer;
	}

	public FoodBtiAnswerDTO(List<String> answer) {
		super();
		this.answer = answer;
	}
	
	
	
	
	
	
	
	
	
	
	
	
}
