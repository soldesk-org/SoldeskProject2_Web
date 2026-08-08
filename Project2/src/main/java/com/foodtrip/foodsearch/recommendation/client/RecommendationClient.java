package com.foodtrip.foodsearch.recommendation.client;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.recommendation.dto.RecommendResponseDto;
import com.foodtrip.foodsearch.recommendation.dto.RecommendationSearchAnalysisDto;

// AI 추천(2026-07-22 추가) — 팀원이 만든 Python(FastAPI) 서버 recommendation_api.py
// (SoldeskProject2_Python/keyword-extraction, POST /api/recommend)를 호출한다. 그 서버에 CORS 설정이
// 없어 브라우저에서 바로 호출할 수 없으므로, 01/08의 다른 Python 연동(BusinessVerificationClient/
// ReceiptOcrClient)과 같은 패턴으로 서버 쪽에서 대신 호출해 프론트에 그대로 넘겨준다.
// LLM 추론이 섞여 있어 응답이 느릴 수 있어 읽기 타임아웃을 넉넉히(60초) 잡는다(다른 Python 연동보다 김).
@Component
public class RecommendationClient {

    private final RestClient restClient;

    public RecommendationClient(@Value("${recommendation.base-url}") String baseUrl,
                                 @Value("${recommendation.internal-token:}") String internalToken) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(60));
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory);
        // ai.eattyway.com이 우리 백엔드를 거치지 않은 직접 호출을 거부하도록 공유 비밀 헤더를 붙인다
        // (2026-08-08, recommendation_api.py의 검증 미들웨어와 짝 — business-verify와 같은 패턴).
        if (!internalToken.isBlank()) {
            builder.defaultHeader("X-Internal-Token", internalToken);
        }
        this.restClient = builder.build();
    }

    public RecommendResponseDto recommend(String text, Double x, Double y, Integer radius, Integer size) {
        Map<String, Object> body = new HashMap<>();
        body.put("text", text);
        if (x != null) {
            body.put("x", x);
        }
        if (y != null) {
            body.put("y", y);
        }
        if (radius != null) {
            body.put("radius", radius);
        }
        if (size != null) {
            body.put("size", size);
        }

        try {
            RecommendResponseDto response = restClient.post()
                    .uri("/api/recommend")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(RecommendResponseDto.class);
            if (response == null) {
                throw new CustomException(ErrorCode.RECOMMENDATION_SERVICE_UNAVAILABLE, "AI 추천 서버 응답이 비어 있습니다.");
            }
            return response;
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.RECOMMENDATION_SERVICE_UNAVAILABLE,
                    "AI 추천 서버와 통신할 수 없습니다: " + e.getMessage());
        }
    }

    // "밥 먹고 산책/카페 어때요" 후속 추천(2026-07-24 추가) 전용 - 카카오 호출 없이 순수 LLM 문장 분석만
    // 하는 POST /api/keywords를 호출한다. recommend()와 달리 카카오 검색은 이 클라이언트가 아니라
    // NearbyPlaceKakaoClient(우리 쪽 코드)가 대신 맡는다(001-02 참고, 팀원 Python 코드의 category_group_code
    // FD6 하드코딩을 건드리지 않기 위한 설계).
    public RecommendationSearchAnalysisDto analyzeKeywords(String text) {
        try {
            RecommendationSearchAnalysisDto response = restClient.post()
                    .uri("/api/keywords")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("text", text))
                    .retrieve()
                    .body(RecommendationSearchAnalysisDto.class);
            if (response == null) {
                throw new CustomException(ErrorCode.RECOMMENDATION_SERVICE_UNAVAILABLE, "AI 추천 서버 응답이 비어 있습니다.");
            }
            return response;
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.RECOMMENDATION_SERVICE_UNAVAILABLE,
                    "AI 추천 서버와 통신할 수 없습니다: " + e.getMessage());
        }
    }
}
