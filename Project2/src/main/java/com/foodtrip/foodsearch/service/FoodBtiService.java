package com.foodtrip.foodsearch.service;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.dto.FoodBtiAnswerDTO;
import com.foodtrip.foodsearch.dto.FoodBtiChoiceDTO;
import com.foodtrip.foodsearch.dto.FoodBtiQuestionDTO;
import com.foodtrip.foodsearch.dto.FoodBtiResultDTO;
import com.foodtrip.foodsearch.dto.ScoreDTO;

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
			
		// 네번째 성향
		// P : 계획적으로 선택
		// I : 즉흥적으로 선택
		questions.add(new FoodBtiQuestionDTO(
				10, "식당에 방문하기 전 나는?",
				new FoodBtiChoiceDTO("메뉴, 가격, 리뷰 미리 확인한다.", "P"),
				new FoodBtiChoiceDTO("일단 방문해서 끌리는 메뉴를 선택한다.", "I")));
		
		questions.add(new FoodBtiQuestionDTO(
				11, "주말 외식 장소를 정할 때 나는?",
				new FoodBtiChoiceDTO("며칠 전부터 식당을 검색하고 정한다.", "P"),
				new FoodBtiChoiceDTO("당일 나가서 먹고싶은 메뉴를 선택한다.", "I")));
		
		questions.add(new FoodBtiQuestionDTO(
				12, "식당에 웨이팅이 길게 있다면 나는?",
				new FoodBtiChoiceDTO("미리 찾아둔 다음 식당으로 이동한다.", "P"),
				new FoodBtiChoiceDTO("주변을 둘러보다 가장 눈에 띄는 식당으로 들어간다.", "I")));
		
		return questions;
	}
	
	// 답변을 받아서 결과 산출(계산)
	public FoodBtiResultDTO calculateResult(FoodBtiAnswerDTO answerDTO) {
		
		if(answerDTO == null || answerDTO.getAnswer() == null) {
			throw new IllegalArgumentException("답변 하지 않으면 정확한 계산이 어렵습니다 !");
		}
		
		List<String> answers = answerDTO.getAnswer();
		if(answers.size() != 12 ) {
			throw new IllegalArgumentException("모든 질문에 답변하지 않으셨어요 !");
		}
		
		int l = 0;
		int s = 0;
		int f = 0;
		int n = 0;
		int a = 0;
		int t = 0;
		int p = 0;
		int i = 0;
		
		// 선택한 알파벳 숫자에 따라 점수 증가
		for (String answer : answers) {
            if (answer == null) {
                throw new IllegalArgumentException("선택되지 않은 답변이 있습니다.");
            }
            switch (answer.toUpperCase()) {
                case "L":
                    l++;
                    break;
                case "S":
                    s++;
                    break;
                case "F":
                    f++;
                    break;
                case "N":
                    n++;
                    break;
                case "A":
                    a++;
                    break;
                case "T":
                    t++;
                    break;
                case "P":
                    p++;
                    break;
                case "I":
                    i++;
                    break;
                default:
                    throw new IllegalArgumentException(
                            "잘못된 답변 값입니다: " + answer
                    );
            }
        }

		// 성향별 점수 비교해서 최종 결과 음BTI 생성
		String resultType = "";
		resultType += l >= s ? "L" : "S";
		resultType += f >= n ? "F" : "N";
		resultType += a >= t ? "A" : "T";
		resultType += p >= i ? "P" : "I";
		
		// 점수 객체에 담기
		ScoreDTO score = new ScoreDTO();
		
		score.setL(l);
		score.setS(s);
		
		score.setF(f);
		score.setN(n);
		
		score.setA(a);
		score.setT(t);
		
		score.setP(p);
		score.setI(i);
		
		// 결과에 맞는 타입 정보 반환
		return createResult(resultType, score);
		
	}

		// 대표적으로 테스트용 일부 대표 결과를 넣고 나머지는
		// 성향을 조합해 결과를 반환함
	private FoodBtiResultDTO createResult(String resultType, ScoreDTO score) {
		
		  if("SNTP".equals(resultType)) {
	            return new FoodBtiResultDTO(
	                    resultType,
	                    "매운맛 탐험가",
	                    "강렬한 맛과 새로운 음식을 좋아하며, "
	                     + "사람들과 함께 새로운 맛집을 찾아다니는 유형.",
	                    Arrays.asList("마라탕","닭발","쭈꾸미","매운 갈비찜","국물 떡볶이"
	                    ),
	                    score
	            );
	        } else if("LFAI".equals(resultType)) {
	        	 return new FoodBtiResultDTO(
	                     resultType,
	                     "담백한 혼밥러",
	                     "익숙하고 부담 없는 음식을 혼자 편안하게 "
	                             + "즐기는 것을 좋아하는 유형입니다.",
	                     Arrays.asList("칼국수","백반","죽","국밥","셀러드"
	                     ),
	                     score
	             );
	        }
		
		// 아직 상세 결과가 등록되지 않은 유형
		//
		return new FoodBtiResultDTO(resultType, createDefaultName(resultType),
               createDefaultDescription(resultType), createDefaultFoods(resultType),
               score
        );
	}
	
	// 성향에 따른 기본 결과 이름
	private String createDefaultName(String resultType) {
		String tasteName = resultType.startsWith("S") ? "강렬한" : "편안한";
		String foodStyle = resultType.charAt(1) == 'N' ? "음식 탐험가" : "단골 미식가";
		
		return tasteName + " " + foodStyle;
				
	}
	
	// 성향에 따라 기본 설명 생성
	private String createDefaultDescription(String resultType) {
		String taste = resultType.charAt(0) == 'S'
				? "자극적이고 강한 맛을 좋아하고"
				: "담백하고 편안한 맛을 좋아하고";
		String challenge = resultType.charAt(1) == 'N'
				? "새로운 음식에 도전하는 편이며"
				: "익숙하고 검증된 음식을 선호하며";
		String social = resultType.charAt(2) == 'T'
				? "다른 사람들과 함께 먹는 것을 즐기고"
				: "혼자 편안하게 먹는 것을 좋아하고";
		String choice = resultType.charAt(3) == 'P'
				? "식당과 메뉴를 미리 알아보는 타입입니다."
				: "기분에 따라 즉흥적으로 메뉴를 고르는 타입입니다.";
		return taste + ", " 
				+ challenge + ", " 
				+ social + ", " 
				+choice;
	}
	
	// 성향에 따라 기본 추천 음식 생성
	private List<String> createDefaultFoods(String resultType) {
		List<String> foods = new ArrayList<>();
		
		// 첫번째 : 자극적인 맛 / 담백한 맛
		if(resultType.charAt(0) == 'S') {
			foods.add("떡볶이");
			foods.add("마라탕");
		} else {
			foods.add("칼국수");
			foods.add("백반");
		}
		
		// 두번째 : 익숙한 / 새로운
		 if (resultType.charAt(1) == 'N') {
	            foods.add("이색 퓨전 음식");
	        } else {
	            foods.add("단골집 대표 메뉴");
	        }
		
		 // 세번째 : 혼자 / 함께
	     if (resultType.charAt(2) == 'T') {
	            foods.add("삼겹살");
	        } else {
	            foods.add("덮밥");
	        }
	     
	     // 네번째 : 계획적 / 즉흥적
	     if(resultType.charAt(3) == 'P') {
	    	 foods.add("예약 가능한 인기 맛집");
	        } else {
	            foods.add("오늘 생각난 메뉴");
	        }
	     
	        return foods;
	    }
		
		
	}	
		
