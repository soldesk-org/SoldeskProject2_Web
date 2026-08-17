package com.foodtrip.foodsearch.review.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioItemDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioResponseDto;

@Service
public class ReviewKeywordStatsService {

    private final ReviewKeywordDao reviewKeywordDao;

    public ReviewKeywordStatsService(ReviewKeywordDao reviewKeywordDao) {
        this.reviewKeywordDao = reviewKeywordDao;
    }

    public ReviewKeywordRatioResponseDto calculateRatios(ReviewKeywordRatioRequestDto request) {
        List<String> placeIds = normalize(request.placeIds());
        List<String> keywords = normalize(request.keywords());
        Map<String, Long> totals = reviewKeywordDao.countNormalReviewsByRestaurantIds(placeIds);
        Map<String, ReviewKeywordDao.KeywordMatchStats> matches =
                reviewKeywordDao.findPositiveKeywordMatches(placeIds, keywords);

        List<ReviewKeywordRatioItemDto> items = placeIds.stream().map(placeId -> {
            long total = totals.getOrDefault(placeId, 0L);
            ReviewKeywordDao.KeywordMatchStats match = matches.getOrDefault(
                    placeId, new ReviewKeywordDao.KeywordMatchStats(0, List.of()));
            double ratio = total == 0 ? 0.0 : (double) match.matchedReviewCount() / total;
            return new ReviewKeywordRatioItemDto(placeId, total, match.matchedReviewCount(), ratio,
                    match.matchedKeywords());
        }).toList();
        return new ReviewKeywordRatioResponseDto(items);
    }

    private List<String> normalize(List<String> values) {
        return values.stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }
}
