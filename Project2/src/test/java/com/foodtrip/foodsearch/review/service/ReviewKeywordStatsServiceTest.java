package com.foodtrip.foodsearch.review.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioRequestDto;

@ExtendWith(MockitoExtension.class)
class ReviewKeywordStatsServiceTest {

    @Mock
    private ReviewKeywordDao reviewKeywordDao;

    @InjectMocks
    private ReviewKeywordStatsService reviewKeywordStatsService;

    @Test
    void calculatesRatiosInRequestedPlaceOrder() {
        List<String> placeIds = List.of("place-1", "place-2");
        List<String> keywords = List.of("quiet", "friendly");
        when(reviewKeywordDao.countNormalReviewsByRestaurantIds(placeIds))
                .thenReturn(Map.of("place-1", 4L, "place-2", 2L));
        when(reviewKeywordDao.findPositiveKeywordMatches(placeIds, keywords))
                .thenReturn(Map.of("place-1", new ReviewKeywordDao.KeywordMatchStats(3, List.of("quiet"))));

        var response = reviewKeywordStatsService.calculateRatios(
                new ReviewKeywordRatioRequestDto(List.of(" place-1 ", "place-2", "place-1"), keywords));

        assertEquals(2, response.items().size());
        assertEquals("place-1", response.items().get(0).placeId());
        assertEquals(4, response.items().get(0).totalReviewCount());
        assertEquals(3, response.items().get(0).matchedReviewCount());
        assertEquals(0.75, response.items().get(0).matchedReviewRatio());
        assertEquals(List.of("quiet"), response.items().get(0).matchedKeywords());
        assertEquals("place-2", response.items().get(1).placeId());
        assertEquals(0, response.items().get(1).matchedReviewCount());
        assertEquals(0.0, response.items().get(1).matchedReviewRatio());
    }
}
