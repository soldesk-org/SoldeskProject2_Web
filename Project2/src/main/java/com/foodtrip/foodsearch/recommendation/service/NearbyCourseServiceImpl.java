package com.foodtrip.foodsearch.recommendation.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.recommendation.client.NearbyPlaceKakaoClient;
import com.foodtrip.foodsearch.recommendation.client.RecommendationClient;
import com.foodtrip.foodsearch.recommendation.dto.NearbyCoursePlaceDto;
import com.foodtrip.foodsearch.recommendation.dto.NearbyCourseResponseDto;
import com.foodtrip.foodsearch.recommendation.dto.NearbyPlaceCandidate;
import com.foodtrip.foodsearch.recommendation.dto.RecommendationSearchAnalysisDto;

// "밥 먹고 산책/카페 어때요" 후속 추천(2026-07-24 추가, 001-01 참고) — 방금 추천받은 음식점 좌표를
// 중심으로 산책하기 좋은 공원 또는 갈만한 카페를 추가로 찾아준다. AI 분석은 팀원의 추천 서버
// (RecommendationClient.analyzeKeywords, 카카오 호출 없는 순수 LLM 문장 분석)를 그대로 재사용하고,
// 실제 장소 검색은 우리 쪽 NearbyPlaceKakaoClient가 맡는다 - recommendation_api.py의 카카오 호출이
// category_group_code=FD6(음식점)로 고정돼 있어 카페/공원 검색에 못 쓰기 때문(001-02 2장).
@Service
public class NearbyCourseServiceImpl implements NearbyCourseService {

    private static final int SEARCH_RADIUS_METERS = 1200; // 걸어서 오갈 만한 거리
    private static final int RESULT_SIZE = 5;

    public static final String TYPE_PARK = "PARK";
    public static final String TYPE_CAFE = "CAFE";

    private final RecommendationClient recommendationClient;
    private final NearbyPlaceKakaoClient nearbyPlaceKakaoClient;

    public NearbyCourseServiceImpl(RecommendationClient recommendationClient,
                                    NearbyPlaceKakaoClient nearbyPlaceKakaoClient) {
        this.recommendationClient = recommendationClient;
        this.nearbyPlaceKakaoClient = nearbyPlaceKakaoClient;
    }

    @Override
    public NearbyCourseResponseDto suggest(String type, String anchorName, Double x, Double y) {
        boolean isPark = TYPE_PARK.equals(type);
        String aiText = buildAiText(isPark, anchorName);

        // 카카오 호출 없는 순수 LLM 키워드 분석만 재사용 - "AI 학습으로" 요청을 그대로 살리되, 실제 장소는
        // 우리 쪽에서 직접 찾는다(위 클래스 주석 참고).
        RecommendationSearchAnalysisDto analysis = recommendationClient.analyzeKeywords(aiText);

        List<NearbyPlaceCandidate> candidates = isPark
                ? nearbyPlaceKakaoClient.searchParksNearby(x, y, SEARCH_RADIUS_METERS, RESULT_SIZE)
                : nearbyPlaceKakaoClient.searchCafesNearby(x, y, SEARCH_RADIUS_METERS, RESULT_SIZE);

        List<NearbyCoursePlaceDto> places = candidates.stream()
                .map(c -> new NearbyCoursePlaceDto(c.placeId(), c.placeName(), c.categoryName(), c.addressName(),
                        c.roadAddressName(), c.placeUrl(), c.x(), c.y(), c.distanceMeters()))
                .toList();

        return new NearbyCourseResponseDto(type, buildMessage(isPark, anchorName, places.size(), analysis), places);
    }

    private String buildAiText(boolean isPark, String anchorName) {
        String place = anchorName != null && !anchorName.isBlank() ? anchorName + " 근처에서 " : "";
        return isPark ? place + "밥 먹고 산책하기 좋은 공원 추천해줘" : place + "밥 먹고 가기 좋은 분위기 좋은 카페 추천해줘";
    }

    private String buildMessage(boolean isPark, String anchorName, int resultCount, RecommendationSearchAnalysisDto analysis) {
        if (resultCount == 0) {
            return isPark ? "근처에서 걸어갈 만한 공원을 찾지 못했어요." : "근처에서 갈 만한 카페를 찾지 못했어요.";
        }
        String near = anchorName != null && !anchorName.isBlank() ? anchorName + " 근처" : "이 근처";
        String atmosphereHint = analysis.atmosphereKeywords() != null && !analysis.atmosphereKeywords().isEmpty()
                ? "(" + String.join(", ", analysis.atmosphereKeywords()) + ")"
                : "";
        return isPark
                ? near + "에서 산책하기 좋은 공원 " + resultCount + "곳을 찾았어요" + atmosphereHint + "."
                : near + "에서 갈 만한 카페 " + resultCount + "곳을 찾았어요" + atmosphereHint + ".";
    }
}
