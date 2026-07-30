package com.foodtrip.foodsearch.reviewfilter.client;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

// 리뷰 욕설/비속어 필터(17.리뷰-필터링, 2026-07-24 추가) — 새로 만든 Python(FastAPI) 서버
// (SoldeskProject2_Python/review-filter, 한국어 욕설 판별 오픈소스 라이브러리 korcen 사용)의
// POST /check를 호출한다. business-verify/recommendation과 같은 "Python 서버는 팀 로컬에서 별도로
// 기동, Spring이 서버 쪽에서 대신 호출" 패턴을 그대로 재사용.
@Component
public class ReviewFilterClient {

    private final RestClient restClient;

    public ReviewFilterClient(@Value("${review-filter.base-url}") String baseUrl) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    // 필터 서버가 꺼져 있거나 응답이 없으면 예외를 던지지 않고 false(비속어 아님)로 통과시킨다 — 리뷰
    // 작성이라는 핵심 기능이 부가 기능(욕설 필터) 하나 때문에 완전히 막히면 안 된다고 판단(08 영수증OCR의
    // "매칭 실패해도 업로드는 성공" 톤과 같은 방어적 설계). 대신 로그는 남겨서 필터 서버가 꺼져있다는 걸
    // 나중에 알아챌 수 있게 한다.
    public boolean containsProfanity(String text) {
        try {
            Map<String, Object> response = restClient.post()
                    .uri("/check")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("text", text))
                    .retrieve()
                    .body(Map.class);
            return response != null && Boolean.TRUE.equals(response.get("profanity"));
        } catch (RestClientException e) {
            return false;
        }
    }
}
