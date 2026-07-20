package com.foodtrip.foodsearch.dto;

import java.util.List;

public class FoodBtiResultDTO {

	// 최종 결과 MBTI 출력(전송) EX) SNTP
	private String resultType;
	
	// 결과 이름 유형
	private String resultName;
	
	// 결과 설명
	private String resultText;
	
	// 추천 음식
	private List<String> food;
	
	// 성향별 점수
	private ScoreDTO Score;
	
	public FoodBtiResultDTO() {
		// TODO Auto-generated constructor stub
	}

	public FoodBtiResultDTO(String resultType, String resultName, String resultText, List<String> food,
			ScoreDTO score) {
		super();
		this.resultType = resultType;
		this.resultName = resultName;
		this.resultText = resultText;
		this.food = food;
		Score = score;
	}

	public String getResultType() {
		return resultType;
	}

	public void setResultType(String resultType) {
		this.resultType = resultType;
	}

	public String getResultName() {
		return resultName;
	}

	public void setResultName(String resultName) {
		this.resultName = resultName;
	}

	public String getResultText() {
		return resultText;
	}

	public void setResultText(String resultText) {
		this.resultText = resultText;
	}

	public List<String> getFood() {
		return food;
	}

	public void setFood(List<String> food) {
		this.food = food;
	}

	public ScoreDTO getScore() {
		return Score;
	}

	public void setScore(ScoreDTO score) {
		Score = score;
	}
	
	
	
	
	
	
	
	
	
	
	
	
}














