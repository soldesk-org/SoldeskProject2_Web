package com.foodtrip.foodsearch.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.dto.FoodRecommendationDTO;
import com.foodtrip.foodsearch.dto.ScoreDTO;

/**
 * 사용자의 음BTI 점수와 음식 성향 태그를 비교해 추천 순위를 계산합니다.
 * 외부 지도 API와 무관한 순수 추천 로직이므로 단위 테스트하기 쉽습니다.
 */
@Service
public class FoodRecommendationService {

    private static final int RECOMMENDATION_LIMIT = 5;
    private static final int MAX_MATCH_POINT = 12;

    /*
     * 각 음식은 네 가지 성향 태그를 가집니다.
     * 순서는 맛 강도(L/S), 익숙함(F/N), 식사 방식(A/T), 선택 방식(P/I)입니다.
     */
    private static final List<FoodProfile> FOOD_CATALOG = List.of(
            food("칼국수", "칼국수", 'L', 'F', 'A', 'P',
                    "부담 없는 국물과 면으로 차분하게 한 끼를 정하기 좋아요."),
            food("백반", "백반", 'L', 'F', 'A', 'P',
                    "익숙한 반찬 구성이 있어 고민 없이 안정적인 식사를 하기 좋아요."),
            food("국밥", "국밥", 'L', 'F', 'A', 'I',
                    "갑자기 든든한 한 그릇이 필요할 때 실패 확률이 낮은 메뉴예요."),
            food("김밥", "김밥", 'L', 'F', 'A', 'I',
                    "간단하게 먹을 수 있고 상황에 맞춰 고르기 쉬운 메뉴예요."),
            food("샤브샤브", "샤브샤브", 'L', 'F', 'T', 'P',
                    "재료를 천천히 익혀 먹어 대화하며 식사하기 좋은 메뉴예요."),
            food("한정식", "한정식", 'L', 'F', 'T', 'P',
                    "여러 반찬을 함께 나누며 정돈된 식사를 즐기기 좋아요."),
            food("보쌈", "보쌈", 'L', 'F', 'T', 'I',
                    "담백한 고기를 곁들임과 함께 나눠 먹기 좋은 메뉴예요."),
            food("만두전골", "만두전골", 'L', 'F', 'T', 'I',
                    "따뜻한 국물을 함께 끓이며 편하게 나누기 좋은 음식이에요."),

            food("포케", "포케", 'L', 'N', 'A', 'P',
                    "재료 조합을 고를 수 있어 가볍지만 색다른 한 끼로 좋아요."),
            food("오차즈케", "오차즈케", 'L', 'N', 'A', 'P',
                    "은은한 맛 안에서 새로운 식감을 경험하기 좋은 메뉴예요."),
            food("쌀국수", "쌀국수", 'L', 'N', 'A', 'I',
                    "가볍게 먹기 좋으면서도 향신료로 기분 전환이 되는 음식이에요."),
            food("후무스볼", "후무스볼", 'L', 'N', 'A', 'I',
                    "낯선 재료를 부담스럽지 않게 한 그릇으로 시도하기 좋아요."),
            food("딤섬", "딤섬", 'L', 'N', 'T', 'P',
                    "작은 메뉴를 여러 개 고르며 함께 맛보기 좋은 음식이에요."),
            food("스페인 타파스", "타파스", 'L', 'N', 'T', 'P',
                    "다양한 접시를 나눠 먹으며 새로운 메뉴를 탐색하기 좋아요."),
            food("반쎄오", "반쎄오", 'L', 'N', 'T', 'I',
                    "바삭한 식감과 채소를 곁들여 색다르게 나눠 먹기 좋아요."),
            food("월남쌈", "월남쌈", 'L', 'N', 'T', 'I',
                    "각자 원하는 재료를 싸 먹을 수 있어 편하게 즐기기 좋아요."),

            food("제육덮밥", "제육덮밥", 'S', 'F', 'A', 'P',
                    "매콤한 양념과 밥이 잘 어울려 든든하게 먹기 좋은 메뉴예요."),
            food("매운 돈가스", "매운 돈가스", 'S', 'F', 'A', 'P',
                    "익숙한 돈가스에 매운 소스가 더해져 확실한 만족감을 줘요."),
            food("떡볶이", "떡볶이", 'S', 'F', 'A', 'I',
                    "갑자기 매콤한 분식이 당길 때 바로 떠올리기 좋은 메뉴예요."),
            food("매운 라면", "매운 라면", 'S', 'F', 'A', 'I',
                    "간단하지만 강한 맛으로 기분 전환하기 좋은 선택이에요."),
            food("닭갈비", "닭갈비", 'S', 'F', 'T', 'P',
                    "매콤한 양념을 볶아 먹으며 여럿이 든든하게 즐기기 좋아요."),
            food("부대찌개", "부대찌개", 'S', 'F', 'T', 'P',
                    "익숙한 재료가 많아 함께 먹을 때 호불호가 적은 메뉴예요."),
            food("삼겹살", "삼겹살", 'S', 'F', 'T', 'I',
                    "즉석에서 구워 먹는 재미가 있어 편한 모임 메뉴로 좋아요."),
            food("곱창", "곱창", 'S', 'F', 'T', 'I',
                    "진한 풍미를 함께 즐기며 즉흥적인 외식 기분을 내기 좋아요."),

            food("탄탄면", "탄탄면", 'S', 'N', 'A', 'P',
                    "고소함과 매콤함이 함께 있어 새로운 면 요리로 시도하기 좋아요."),
            food("인도 커리", "인도 커리", 'S', 'N', 'A', 'P',
                    "향신료의 깊은 맛을 골라 먹을 수 있어 취향 탐색에 좋아요."),
            food("마라샹궈", "마라샹궈", 'S', 'N', 'A', 'I',
                    "원하는 재료를 즉석에서 조합해 강렬한 한 끼를 만들기 좋아요."),
            food("매운 쌀국수", "매운 쌀국수", 'S', 'N', 'A', 'I',
                    "익숙한 쌀국수에 매운 국물이 더해져 색다른 자극을 줘요."),
            food("마라탕", "마라탕", 'S', 'N', 'T', 'P',
                    "재료와 맵기를 직접 조합하며 새로운 맛을 함께 즐기기 좋아요."),
            food("쭈꾸미", "쭈꾸미", 'S', 'N', 'T', 'P',
                    "매콤한 한 접시를 여럿이 나눠 먹으며 분위기 내기 좋아요."),
            food("닭발", "닭발", 'S', 'N', 'T', 'I',
                    "강한 양념과 쫄깃한 식감으로 즉흥적인 야식에 잘 어울려요."),
            food("멕시칸 타코", "멕시칸 타코", 'S', 'N', 'T', 'I',
                    "토핑을 자유롭게 고르며 색다른 맛을 가볍게 나누기 좋아요."));

    public List<FoodRecommendationDTO> recommend(String resultType, ScoreDTO score) {
        return FOOD_CATALOG.stream()
                .map(food -> toRecommendation(food, resultType, score))
                .sorted(Comparator.comparingInt(FoodRecommendationDTO::getMatchScore)
                        .reversed()
                        .thenComparing(FoodRecommendationDTO::getName))
                .limit(RECOMMENDATION_LIMIT)
                .toList();
    }

    private FoodRecommendationDTO toRecommendation(FoodProfile food, String resultType, ScoreDTO score) {
        int matchPoint = scoreFor(score, food.taste)
                + scoreFor(score, food.novelty)
                + scoreFor(score, food.social)
                + scoreFor(score, food.plan);

        int matchScore = (int) Math.round(matchPoint * 100.0 / MAX_MATCH_POINT);
        String reason = createReason(food, resultType);

        return new FoodRecommendationDTO(food.name, food.searchKeyword, matchScore, reason);
    }

    /*
     * 사용자가 선택한 횟수를 음식 태그별 점수로 사용합니다.
     * 네 축에서 모두 사용자의 우세 성향과 일치할수록 100점에 가까워집니다.
     */
    private int scoreFor(ScoreDTO score, char trait) {
        return switch (trait) {
            case 'L' -> score.getL();
            case 'S' -> score.getS();
            case 'F' -> score.getF();
            case 'N' -> score.getN();
            case 'A' -> score.getA();
            case 'T' -> score.getT();
            case 'P' -> score.getP();
            case 'I' -> score.getI();
            default -> throw new IllegalArgumentException("알 수 없는 음식 성향 태그입니다: " + trait);
        };
    }

    private String createReason(FoodProfile food, String resultType) {
        String matchedTrait = findMatchedTrait(food, resultType);
        return food.reasonHint + " 특히 " + matchedTrait + " 성향과 잘 맞아요.";
    }

    private String findMatchedTrait(FoodProfile food, String resultType) {
        if (food.novelty == resultType.charAt(1)) {
            return traitName(food.novelty);
        }
        if (food.social == resultType.charAt(2)) {
            return traitName(food.social);
        }
        if (food.plan == resultType.charAt(3)) {
            return traitName(food.plan);
        }
        if (food.taste == resultType.charAt(0)) {
            return traitName(food.taste);
        }
        return "새로운 취향을 찾아가는";
    }

    private String traitName(char trait) {
        return switch (trait) {
            case 'L' -> "담백한 맛을 좋아하는";
            case 'S' -> "강한 맛을 좋아하는";
            case 'F' -> "익숙한 메뉴를 선호하는";
            case 'N' -> "새로운 메뉴에 도전하는";
            case 'A' -> "혼자 편하게 먹는";
            case 'T' -> "함께 나눠 먹는";
            case 'P' -> "계획적으로 고르는";
            case 'I' -> "즉흥적으로 고르는";
            default -> "새로운 취향을 찾아가는";
        };
    }

    private static FoodProfile food(String name, String searchKeyword,
            char taste, char novelty, char social, char plan, String reasonHint) {
        return new FoodProfile(name, searchKeyword, taste, novelty, social, plan, reasonHint);
    }

    /**
     * 추천 계산에만 필요한 내부 음식 데이터입니다.
     * 화면에 전달할 때는 FoodRecommendationDTO로 변환합니다.
     */
    private static final class FoodProfile {

        private final String name;
        private final String searchKeyword;
        private final char taste;
        private final char novelty;
        private final char social;
        private final char plan;
        private final String reasonHint;

        private FoodProfile(String name, String searchKeyword,
                char taste, char novelty, char social, char plan, String reasonHint) {
            this.name = name;
            this.searchKeyword = searchKeyword;
            this.taste = taste;
            this.novelty = novelty;
            this.social = social;
            this.plan = plan;
            this.reasonHint = reasonHint;
        }
    }
}
