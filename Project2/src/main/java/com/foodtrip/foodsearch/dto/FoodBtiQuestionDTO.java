package com.foodtrip.foodsearch.dto;

public class FoodBtiQuestionDTO {

	// 질문 번호
	private int questionNo;
	// 질문 내용
	private String question;
	// 첫번째 선택
	private FoodBtiChoiceDTO choiceA;
	// 두번째 선택
	private FoodBtiChoiceDTO choiceB;
	
	public FoodBtiQuestionDTO() {
		// TODO Auto-generated constructor stub
	}

	public FoodBtiQuestionDTO(int questionNo, 
			String question, 
			FoodBtiChoiceDTO choiceA, 
			FoodBtiChoiceDTO choiceB) {
		super();
		this.questionNo = questionNo;
		this.question = question;
		this.choiceA = choiceA;
		this.choiceB = choiceB;
	}

	public int getQuestionNo() {
		return questionNo;
	}

	public void setQuestionNo(int questionNo) {
		this.questionNo = questionNo;
	}

	public String getQuestion() {
		return question;
	}

	public void setQuestion(String question) {
		this.question = question;
	}

	public FoodBtiChoiceDTO getChoiceA() {
		return choiceA;
	}

	public void setChoiceA(FoodBtiChoiceDTO choiceA) {
		this.choiceA = choiceA;
	}

	public FoodBtiChoiceDTO getChoiceB() {
		return choiceB;
	}

	public void setChoiceB(FoodBtiChoiceDTO choiceB) {
		this.choiceB = choiceB;
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
}
