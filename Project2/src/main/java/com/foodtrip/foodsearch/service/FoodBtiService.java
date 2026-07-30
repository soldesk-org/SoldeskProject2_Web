package com.foodtrip.foodsearch.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.dto.FoodBtiAnswerDTO;
import com.foodtrip.foodsearch.dto.FoodBtiChoiceDTO;
import com.foodtrip.foodsearch.dto.FoodBtiQuestionDTO;
import com.foodtrip.foodsearch.dto.FoodBtiResultDTO;
import com.foodtrip.foodsearch.dto.FoodRecommendationDTO;
import com.foodtrip.foodsearch.dto.ScoreDTO;
import com.foodtrip.foodsearch.dto.TraitScoreDTO;
import com.foodtrip.foodsearch.model.FoodBtiProfile;

@Service
public class FoodBtiService {

    private static final int QUESTION_COUNT = 12;

    // 배열의 위치는 질문 순서와 같습니다.
    // 예를 들어 1~3번 질문에는 L 또는 S만 들어올 수 있습니다.

    private static final String[] ALLOWED_CODES_BY_QUESTION = {
            "LS", "LS", "LS",
            "FN", "FN", "FN",
            "AT", "AT", "AT",
            "PI", "PI", "PI"
    };

    private static final List<FoodBtiQuestionDTO> QUESTIONS = createQuestions();

    private final FoodBtiProfileCatalog profileCatalog;
    private final FoodRecommendationService recommendationService;

    public FoodBtiService(FoodBtiProfileCatalog profileCatalog,
            FoodRecommendationService recommendationService) {
        this.profileCatalog = profileCatalog;
        this.recommendationService = recommendationService;
    }

    public List<FoodBtiQuestionDTO> getQuestions() {
        return QUESTIONS;
    }

    // 답변 검증, 점수 계산, 결과 유형 조회, 음식 추천을 순서대로 실행합니다.

    public FoodBtiResultDTO calculateResult(FoodBtiAnswerDTO answerDTO) {
        List<String> answers = validateAndNormalizeAnswers(answerDTO);
        ScoreDTO score = calculateScore(answers);
        String resultType = determineResultType(score);

        FoodBtiProfile profile = profileCatalog.getByType(resultType);
        List<FoodRecommendationDTO> recommendations =
                recommendationService.recommend(resultType, score);

        // 기존 프론트의 result.food 사용을 유지하기 위한 문자열 목록입니다.
        List<String> foodNames = recommendations.stream()
                .map(FoodRecommendationDTO::getName)
                .toList();

        return new FoodBtiResultDTO(
                resultType,
                profile.getName(),
                profile.getDescription(),
                foodNames,
                score,
                createTraitScores(score),
                recommendations);
    }

    // 기존 요청 형식은 유지하면서 질문 위치에 맞지 않는 점수 코드를 차단합니다.
    // 검증된 답변은 공백을 제거하고 대문자로 통일해 이후 계산을 단순하게 만듭니다.

    private List<String> validateAndNormalizeAnswers(FoodBtiAnswerDTO answerDTO) {
        if (answerDTO == null || answerDTO.getAnswer() == null) {
            throw new IllegalArgumentException("답변 목록이 필요합니다.");
        }

        List<String> answers = answerDTO.getAnswer();
        if (answers.size() != QUESTION_COUNT) {
            throw new IllegalArgumentException("답변은 정확히 12개여야 합니다.");
        }

        List<String> normalizedAnswers = new ArrayList<>(QUESTION_COUNT);

        for (int index = 0; index < QUESTION_COUNT; index++) {
            String answer = answers.get(index);
            int questionNo = index + 1;

            if (answer == null || answer.isBlank()) {
                throw new IllegalArgumentException(questionNo + "번 질문의 답변이 비어 있습니다.");
            }

            String normalized = answer.trim().toUpperCase(Locale.ROOT);
            String allowedCodes = ALLOWED_CODES_BY_QUESTION[index];

            if (normalized.length() != 1 || !allowedCodes.contains(normalized)) {
                throw new IllegalArgumentException(
                        questionNo + "번 질문은 " + allowedCodes.charAt(0)
                                + " 또는 " + allowedCodes.charAt(1) + "만 선택할 수 있습니다.");
            }

            normalizedAnswers.add(normalized);
        }

        return normalizedAnswers;
    }

    private ScoreDTO calculateScore(List<String> answers) {
        ScoreDTO score = new ScoreDTO();

        for (String answer : answers) {
            switch (answer) {
                case "L" -> score.setL(score.getL() + 1);
                case "S" -> score.setS(score.getS() + 1);
                case "F" -> score.setF(score.getF() + 1);
                case "N" -> score.setN(score.getN() + 1);
                case "A" -> score.setA(score.getA() + 1);
                case "T" -> score.setT(score.getT() + 1);
                case "P" -> score.setP(score.getP() + 1);
                case "I" -> score.setI(score.getI() + 1);
                default -> throw new IllegalArgumentException("알 수 없는 답변입니다: " + answer);
            }
        }

        return score;
    }

    // 각 성향에는 질문이 3개씩 있으므로 정상 답변에서는 동점이 생기지 않습니다.
    // 비교 결과를 순서대로 이어 붙이면 LFAP 같은 네 글자 유형이 됩니다.

    private String determineResultType(ScoreDTO score) {
        StringBuilder type = new StringBuilder(4);
        type.append(score.getL() >= score.getS() ? 'L' : 'S');
        type.append(score.getF() >= score.getN() ? 'F' : 'N');
        type.append(score.getA() >= score.getT() ? 'A' : 'T');
        type.append(score.getP() >= score.getI() ? 'P' : 'I');
        return type.toString();
    }

    private List<TraitScoreDTO> createTraitScores(ScoreDTO score) {
        return List.of(
                createTrait("맛 강도", "L", "담백한 맛", score.getL(),
                        "S", "강한 맛", score.getS()),
                createTrait("메뉴 경험", "F", "익숙한 음식", score.getF(),
                        "N", "새로운 음식", score.getN()),
                createTrait("식사 방식", "A", "혼자 먹기", score.getA(),
                        "T", "함께 먹기", score.getT()),
                createTrait("선택 방식", "P", "계획적 선택", score.getP(),
                        "I", "즉흥적 선택", score.getI()));
    }

    private TraitScoreDTO createTrait(String axisName,
            String leftCode, String leftName, int leftScore,
            String rightCode, String rightName, int rightScore) {
        int total = leftScore + rightScore;
        int leftPercent = (int) Math.round(leftScore * 100.0 / total);
        int rightPercent = 100 - leftPercent;
        String dominantCode = leftScore >= rightScore ? leftCode : rightCode;

        return new TraitScoreDTO(
                axisName,
                leftCode,
                leftName,
                leftPercent,
                rightCode,
                rightName,
                rightPercent,
                dominantCode);
    }

    private static List<FoodBtiQuestionDTO> createQuestions() {
        List<FoodBtiQuestionDTO> questions = new ArrayList<>();

        // L: 담백한 맛, S: 자극적인 맛
        questions.add(question(1, "음식을 먹을 때 더 끌리는 맛은?",
                "재료 본연의 담백하고 깔끔한 맛.", "L",
                "맵고 짜고 양념이 강한 자극적인 맛.", "S"));
        questions.add(question(2, "스트레스 받는 날 먹고 싶은 음식은?",
                "따뜻하고 편한 국물이나 집밥.", "L",
                "매운 음식이나 양념이 강한 음식.", "S"));
        questions.add(question(3, "야식으로 더 먹고 싶은 음식은?",
                "샌드위치, 죽, 샐러드처럼 부담 없고 부드러운 음식.", "L",
                "닭발, 떡볶이, 마라탕처럼 강렬한 음식.", "S"));

        // F: 익숙한 음식, N: 새로운 음식
        questions.add(question(4, "해외여행에서 현지 음식을 발견한다면?",
                "조금이라도 알고 있는 무난한 음식을 찾는다.", "F",
                "현지에서만 먹을 수 있는 음식에 도전한다.", "N"));
        questions.add(question(5, "자주 가는 맛집이 생겼을 때 나는?",
                "마음에 들었던 메뉴를 계속 주문한다.", "F",
                "다른 메뉴를 골라가며 먹어본다.", "N"));
        questions.add(question(6, "처음 방문한 식당에서 메뉴를 고를 때 나는?",
                "익숙한 메뉴를 선택한다.", "F",
                "처음 보는 메뉴에 도전해본다.", "N"));

        // A: 혼자 먹기, T: 함께 먹기
        questions.add(question(7, "맛있는 음식이 생각났을 때 나는?",
                "혼자라도 바로 먹으러 간다.", "A",
                "같이 먹으러 갈 사람을 먼저 찾는다.", "T"));
        questions.add(question(8, "밥을 먹을 때 선호하는 분위기는?",
                "혼자 조용하고 편하게 먹는 분위기.", "A",
                "친구 또는 지인과 이야기하며 먹는 분위기.", "T"));
        questions.add(question(9, "길을 가다 새로운 맛집을 발견했을 때 나는?",
                "내 일정에 맞춰 혼자라도 방문한다.", "A",
                "친구와 공유하고 함께 방문한다.", "T"));

        // P: 계획적 선택, I: 즉흥적 선택
        questions.add(question(10, "식당에 방문하기 전 나는?",
                "메뉴, 가격, 리뷰를 미리 확인한다.", "P",
                "일단 방문해서 끌리는 메뉴를 선택한다.", "I"));
        questions.add(question(11, "주말 외식 장소를 정할 때 나는?",
                "며칠 전부터 식당을 검색하고 정한다.", "P",
                "당일 먹고 싶은 메뉴를 선택한다.", "I"));
        questions.add(question(12, "식당에 웨이팅이 길게 있다면 나는?",
                "미리 찾아둔 다음 식당으로 이동한다.", "P",
                "주변을 둘러보다 눈에 띄는 식당으로 들어간다.", "I"));

        return List.copyOf(questions);
    }

    private static FoodBtiQuestionDTO question(int questionNo, String text,
            String choiceAText, String choiceAScore,
            String choiceBText, String choiceBScore) {
        return new FoodBtiQuestionDTO(
                questionNo,
                text,
                new FoodBtiChoiceDTO(choiceAText, choiceAScore),
                new FoodBtiChoiceDTO(choiceBText, choiceBScore));
    }
}
