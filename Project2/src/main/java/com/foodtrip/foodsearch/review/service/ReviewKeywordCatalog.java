package com.foodtrip.foodsearch.review.service;

import java.util.List;

// 리뷰 태그(2026-07-22 추가) — 네이버 지도 리뷰의 "이런 점이 좋았어요" 태그를 참고해 팀이 확정한
// 긍정/부정 10개씩 고정 목록. 사용자가 자유 텍스트로 아무 값이나 넣게 하지 않고, 이 목록에 있는 값만
// 정식 태그로 인정한다(REVIEW_KEYWORD_NOT_ALLOWED — 목록 밖 값은 거부).
public final class ReviewKeywordCatalog {

    private ReviewKeywordCatalog() {
    }

    public static final List<String> POSITIVE = List.of(
            "맛있어요", "재료가 신선해요", "양이 많아요", "가성비가 좋아요", "깨끗해요",
            "친절해요", "차분해요", "대기시간짧아요", "음식이빨리나와요", "가게가예뻐요"
    );

    public static final List<String> NEGATIVE = List.of(
            "맛이 아쉬워요", "재료가 신선하지 않아요", "양이 적어요", "가격이 비싸요", "지저분해요",
            "불친절해요", "소란스러워요", "대기시간길어요", "음식이늦게나와요", "가게가부산스러워요"
    );

    // review_keywords.sentiment(ENUM('POSITIVE','NEGATIVE','NEUTRAL'))에 그대로 넣을 값.
    // 목록에 없는 키워드면 null을 반환 — 호출부에서 이를 "허용되지 않은 태그"로 처리한다.
    public static String sentimentOf(String keyword) {
        if (POSITIVE.contains(keyword)) {
            return "POSITIVE";
        }
        if (NEGATIVE.contains(keyword)) {
            return "NEGATIVE";
        }
        return null;
    }

    public static boolean isValid(String keyword) {
        return sentimentOf(keyword) != null;
    }
}
