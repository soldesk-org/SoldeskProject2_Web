package com.foodtrip.foodsearch.recommendation.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RecommendResponseDto(
        RecommendationSearchAnalysisDto analysis,
        @JsonProperty("recommendation_rule") String recommendationRule,
        @JsonProperty("data_notice") String dataNotice,
        @JsonProperty("total_candidates") Integer totalCandidates,
        List<RecommendedPlaceDto> recommendations,
        // 18.추천-피드백(2026-07-24 추가) - 로그인 상태로 요청했을 때만 채워짐(비로그인이면 null, 이력을
        // 저장하지 않으므로 피드백을 남길 대상 자체가 없음). Python 서버 응답에는 없는 필드라 역직렬화
        // 시엔 항상 null로 들어오고, RecommendationServiceImpl이 이력을 저장한 뒤 이 필드만 채워서
        // 새 레코드로 다시 만들어 반환한다.
        @JsonProperty("history_id") Long historyId) {
}
