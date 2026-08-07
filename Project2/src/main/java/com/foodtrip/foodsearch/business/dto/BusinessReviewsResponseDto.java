package com.foodtrip.foodsearch.business.dto;

import java.util.List;
import java.util.Map;

// 사업자 마이페이지 "리뷰 반응" 탭(2026-08-06 추가) — GET /api/business/me/reviews?page=&size=.
// 태그 비율/분포는 페이지와 무관하게 매장 전체 리뷰 기준으로 매 호출마다 다시 집계한다(리뷰 건수가
// 이 프로젝트 규모에서 캐싱이 필요할 만큼 크지 않다고 판단, 07 restaurants.avg_rating 캐시와는 다르게
// 별도 캐시 컬럼을 두지 않음).
public class BusinessReviewsResponseDto {

    private final List<ReviewTagCountDto> positiveTags;
    private final List<ReviewTagCountDto> negativeTags;
    private final int positiveRatio;
    private final int negativeRatio;
    private final Map<Integer, Long> ratingDistribution;
    private final List<BusinessReviewItemDto> reviews;
    private final boolean hasMore;

    public BusinessReviewsResponseDto(List<ReviewTagCountDto> positiveTags, List<ReviewTagCountDto> negativeTags,
                                       int positiveRatio, int negativeRatio, Map<Integer, Long> ratingDistribution,
                                       List<BusinessReviewItemDto> reviews, boolean hasMore) {
        this.positiveTags = positiveTags;
        this.negativeTags = negativeTags;
        this.positiveRatio = positiveRatio;
        this.negativeRatio = negativeRatio;
        this.ratingDistribution = ratingDistribution;
        this.reviews = reviews;
        this.hasMore = hasMore;
    }

    public List<ReviewTagCountDto> getPositiveTags() {
        return positiveTags;
    }

    public List<ReviewTagCountDto> getNegativeTags() {
        return negativeTags;
    }

    public int getPositiveRatio() {
        return positiveRatio;
    }

    public int getNegativeRatio() {
        return negativeRatio;
    }

    public Map<Integer, Long> getRatingDistribution() {
        return ratingDistribution;
    }

    public List<BusinessReviewItemDto> getReviews() {
        return reviews;
    }

    public boolean isHasMore() {
        return hasMore;
    }
}
