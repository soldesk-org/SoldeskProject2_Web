package com.foodtrip.foodsearch.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.foodtrip.foodsearch.dto.FoodBtiAnswerDTO;
import com.foodtrip.foodsearch.dto.FoodBtiResultDTO;

class FoodBtiServiceTest {

    private final FoodBtiProfileCatalog profileCatalog = new FoodBtiProfileCatalog();
    private final FoodBtiService service =
            new FoodBtiService(profileCatalog, new FoodRecommendationService());

    // @Test : 테스트용이니 JUnit이 실행할 메서드(클래스 우클릭 => Run As => JUnit Test)
    @Test
    void 질문은_순서대로_12개를_반환한다() {
        assertEquals(12, service.getQuestions().size());

        for (int index = 0; index < service.getQuestions().size(); index++) {
            assertEquals(index + 1, service.getQuestions().get(index).getQuestionNo());
        }
    }

    @Test
    void 결과에_성향비율과_검색용_추천음식을_포함() {
        FoodBtiResultDTO result = service.calculateResult(answerForType("SNTP"));

        assertEquals("SNTP", result.getResultType());
        assertEquals("매운맛 탐험가", result.getResultName());
        assertEquals(4, result.getTraits().size());
        assertEquals(5, result.getRecommendations().size());
        assertEquals("S", result.getTraits().get(0).getDominantCode());

        assertFalse(result.getRecommendations().get(0).getSearchKeyword().isBlank());
        assertTrue(result.getRecommendations().get(0).getMatchScore() > 0);

        List<String> recommendationNames = result.getRecommendations().stream()
                .map(recommendation -> recommendation.getName())
                .toList();
        assertEquals(recommendationNames, result.getFood());
    }

    @Test
    void 추천이유는_음식별_설명을_포함해_반복을_줄임() {
        FoodBtiResultDTO result = service.calculateResult(answerForType("SNTP"));

        List<String> reasons = result.getRecommendations().stream()
                .map(recommendation -> recommendation.getReason())
                .toList();

        assertEquals(reasons.size(), new HashSet<>(reasons).size());
        assertTrue(reasons.stream().allMatch(reason -> reason.contains("특히")));
        assertTrue(reasons.stream().noneMatch(reason -> reason.startsWith("강한 맛 선호")));
    }

    @Test
    void 질문축과_다른_답변은_거부() {
        List<String> answers = new ArrayList<>(answerForType("LFAP").getAnswer());
        answers.set(0, "N");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.calculateResult(new FoodBtiAnswerDTO(answers)));

        assertTrue(exception.getMessage().contains("1번 질문"));
        assertTrue(exception.getMessage().contains("L 또는 S"));
    }

    @Test
    void 답변이_12개가_아니면_거부() {
        FoodBtiAnswerDTO tooShort = new FoodBtiAnswerDTO(
                List.of("L", "L", "L"));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.calculateResult(tooShort));

        assertEquals("답변은 정확히 12개여야 합니다.", exception.getMessage());
    }

    @Test
    void 모든_16개_유형은_서로_다른_결과이름을_가짐() {
        List<String> types = List.of(
                "LFAP", "LFAI", "LFTP", "LFTI",
                "LNAP", "LNAI", "LNTP", "LNTI",
                "SFAP", "SFAI", "SFTP", "SFTI",
                "SNAP", "SNAI", "SNTP", "SNTI");

        Set<String> resultNames = new HashSet<>();

        for (String type : types) {
            FoodBtiResultDTO result = service.calculateResult(answerForType(type));
            assertEquals(type, result.getResultType());
            resultNames.add(result.getResultName());
        }

        assertEquals(16, profileCatalog.size());
        assertEquals(16, resultNames.size());
    }

    // 한 유형의 각 글자를 세 번씩 넣어 확실한 3대 0 결과를 만드는 테스트 도우미
    // 예: SNTP -> SSS, NNN, TTT, PPP

    private FoodBtiAnswerDTO answerForType(String type) {
        List<String> answers = new ArrayList<>(12);

        for (char trait : type.toCharArray()) {
            answers.add(String.valueOf(trait));
            answers.add(String.valueOf(trait));
            answers.add(String.valueOf(trait));
        }

        return new FoodBtiAnswerDTO(answers);
    }

    @Test
    void 음BTI_결과를_콘솔에서_확인() {

        FoodBtiAnswerDTO answers = new FoodBtiAnswerDTO(
                List.of(
                        "S", "S", "L",
                        "N", "F", "N",
                        "T", "T", "A",
                        "P", "I", "P"));
        FoodBtiResultDTO result =
                service.calculateResult(answers);
        System.out.println("===== 음BTI 결과 =====");
        System.out.println("유형: " + result.getResultType());
        System.out.println("이름: " + result.getResultName());
        System.out.println("설명: " + result.getResultText());

        System.out.println("\n===== 성향 비율 =====");
        result.getTraits().forEach(trait ->
                System.out.printf(
                        "%s: %s %d%% / %s %d%%%n",
                        trait.getAxisName(),
                        trait.getLeftName(),
                        trait.getLeftPercent(),
                        trait.getRightName(),
                        trait.getRightPercent()
                )
        );

        System.out.println("\n===== 추천 음식 =====");
        result.getRecommendations().forEach(food ->
                System.out.printf(
                        "%s / 검색어: %s / 일치도: %d점%n추천 이유: %s%n%n",
                        food.getName(),
                        food.getSearchKeyword(),
                        food.getMatchScore(),
                        food.getReason()
                )
        );
    }
}
