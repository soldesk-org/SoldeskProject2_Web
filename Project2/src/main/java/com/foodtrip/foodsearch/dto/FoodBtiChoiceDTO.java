package com.foodtrip.foodsearch.dto;

public class FoodBtiChoiceDTO {

	// 화면에 표시할 선택지 내용
	private String text;
	
	// 선택했을 때 점수를 +해줄 성향
	private String score;
	
	public FoodBtiChoiceDTO() {
		// TODO Auto-generated constructor stub
	}

	public FoodBtiChoiceDTO(String text, String score) {
		super();
		this.text = text;
		this.score = score;
	}

	public String getText() {
		return text;
	}

	public void setText(String text) {
		this.text = text;
	}

	public String getScore() {
		return score;
	}

	public void setScore(String score) {
		this.score = score;
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
}
