package com.foodtrip.foodsearch.supportchat.client;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.ObjectMapper;

// 25(AI고객센터챗봇) — 네이버클라우드플랫폼(NCP) CLOVA Studio의 HyperCLOVA X Chat Completions API를
// 호출하는 클라이언트. NcpDirectionsClient(16.길찾기)와 같은 톤 — 서버 전용 API 키로 인증하고, 우리
// 서버가 프론트를 대신해서 호출해준다(API 키를 프론트에 노출하지 않기 위함).
//
// 주의: 이 클래스는 실제 발급받은 API 키로 라이브 호출 검증을 하지 못한 상태로 작성됨(2026-07-31,
// docs/25.AI고객센터챗봇/001-03 참고) — NCP 공식 문서에 나온 요청/응답 형식을 기준으로 구현했으며,
// 실제 키가 발급되면 팀에서 한 번 실 서버로 검증이 필요하다.
@Component
public class HyperClovaXClient {

    private static final Logger log = LoggerFactory.getLogger(HyperClovaXClient.class);

    private static final String SYSTEM_PROMPT = """
            너는 음식점 검색/추천 서비스 "잇티웨이(Eatty way)"의 고객센터 AI 상담원이야.
            서비스 소개: 사용자가 자연어로 원하는 분위기/음식/위치를 말하면 AI가 카카오 지도 데이터
            기반으로 실제 맛집을 추천해주고, 영수증 인증 기반 리뷰, 실시간 오픈채팅(잇티챗), 음식 취향
            테스트(음BTI), 주차장/길찾기 정보를 제공하는 통합 맛집 플랫폼이야.
            사용자의 문의에 친절하고 간결하게 한국어로 답변해. 서비스와 무관한 질문에는 정중하게 이
            서비스 고객센터에서 도와줄 수 있는 범위가 아니라고 안내해. 확실하지 않은 내용은 추측해서
            답하지 말고, 고객센터로 문의해달라고 안내해.
            """;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final String baseUrl;
    private final String model;
    private final String apiKey;

    public HyperClovaXClient(@Value("${hyperclova.base-url}") String baseUrl,
                              @Value("${hyperclova.model}") String model,
                              @Value("${hyperclova.api-key:}") String apiKey) {
        this.baseUrl = baseUrl;
        this.model = model;
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(apiKey);
    }

    public String ask(String userMessage) {
        if (!isConfigured()) {
            throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
        }

        String url = baseUrl + "/testapp/v3/chat-completions/" + model;
        Map<String, Object> body = Map.of(
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userMessage)
                ),
                "topP", 0.8,
                "topK", 0,
                "maxTokens", 512,
                "temperature", 0.5,
                "repetitionPenalty", 1.1
        );

        try {
            String requestBody = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("HyperCLOVA X 비정상 응답 HTTP {} - body: {}", response.statusCode(), truncate(response.body()));
                throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
            }

            JsonNode root = objectMapper.readTree(response.body());
            String statusCode = root.path("status").path("code").asString("");
            if (!"20000".equals(statusCode)) {
                log.warn("HyperCLOVA X 오류 응답: status={}, message={}", statusCode,
                        root.path("status").path("message").asString(""));
                throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
            }

            String answer = root.path("result").path("message").path("content").asString(null);
            if (answer == null || answer.isBlank()) {
                throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
            }
            return answer.trim();
        } catch (IOException | InterruptedException e) {
            log.warn("HyperCLOVA X 호출 실패: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            throw new CustomException(ErrorCode.SUPPORT_CHAT_SERVICE_UNAVAILABLE);
        }
    }

    private String truncate(String body) {
        if (body == null) {
            return null;
        }
        return body.length() > 500 ? body.substring(0, 500) + "..." : body;
    }
}
