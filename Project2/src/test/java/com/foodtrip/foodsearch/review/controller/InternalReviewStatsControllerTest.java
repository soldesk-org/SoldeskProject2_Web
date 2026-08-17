package com.foodtrip.foodsearch.review.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioRequestDto;
import com.foodtrip.foodsearch.review.dto.ReviewKeywordRatioResponseDto;
import com.foodtrip.foodsearch.review.service.ReviewKeywordStatsService;

class InternalReviewStatsControllerTest {

    private final ReviewKeywordRatioRequestDto request =
            new ReviewKeywordRatioRequestDto(List.of("place-1"), List.of("quiet"));

    @Test
    void rejectsMissingTokenWhenConfigured() {
        ReviewKeywordStatsService service = mock(ReviewKeywordStatsService.class);
        InternalReviewStatsController controller = new InternalReviewStatsController(service, "shared-secret");

        CustomException exception = assertThrows(CustomException.class,
                () -> controller.keywordRatios(null, request));

        assertEquals(ErrorCode.INTERNAL_API_UNAUTHORIZED, exception.getErrorCode());
        verifyNoInteractions(service);
    }

    @Test
    void acceptsMatchingToken() {
        ReviewKeywordStatsService service = mock(ReviewKeywordStatsService.class);
        ReviewKeywordRatioResponseDto expected = new ReviewKeywordRatioResponseDto(List.of());
        when(service.calculateRatios(request)).thenReturn(expected);
        InternalReviewStatsController controller = new InternalReviewStatsController(service, "shared-secret");

        ReviewKeywordRatioResponseDto actual = controller.keywordRatios("shared-secret", request);

        assertSame(expected, actual);
    }
}
