package com.foodtrip.foodsearch.common.sms;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

/**
 * 뿌리오(Ppurio) 문자연동 API 연동 - 토큰 발급/캐싱 + SMS 발송.
 * 상세 스펙은 docs/00.공통/SMS-인증-Ppurio-연동-가이드.md 참고(2026-07-20 공식 문서 message.ppurio.com
 * 기준으로 재확인/갱신됨 — 이전에 참고했던 api.bizppurio.com 문서는 구버전이었음).
 *
 * 토큰은 24시간 유효하므로 매 발송마다 재발급하지 않고 Redis에 캐싱한다(TTL 23시간, 만료 직전 재사용 방지).
 */
@Component
public class PpurioSmsService {

    private static final String TOKEN_REDIS_KEY = "ppurio:token";
    private static final Duration TOKEN_TTL = Duration.ofHours(23);

    private final RestClient restClient;
    private final StringRedisTemplate redisTemplate;
    private final String account;
    private final String authKey;
    private final String senderNumber;

    public PpurioSmsService(StringRedisTemplate redisTemplate,
                             @Value("${ppurio.base-url}") String baseUrl,
                             @Value("${ppurio.account}") String account,
                             @Value("${ppurio.auth-key}") String authKey,
                             @Value("${ppurio.sender-number}") String senderNumber) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.redisTemplate = redisTemplate;
        this.account = account;
        this.authKey = authKey;
        this.senderNumber = senderNumber;
    }

    public void sendSms(String toPhone, String message) {
        String token = getAccessToken();
        String normalizedTo = toPhone.replace("-", "");
        String refKey = UUID.randomUUID().toString().replace("-", "").substring(0, 32);

        Map<String, Object> body = Map.of(
                "account", account,
                "messageType", "SMS",
                "content", message,
                "from", senderNumber,
                "duplicateFlag", "N",
                "targetCount", 1,
                "targets", List.of(Map.of("to", normalizedTo)),
                "refKey", refKey
        );

        try {
            SendResponse response = restClient.post()
                    .uri("/v1/message")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(SendResponse.class);

            if (response == null || response.code() != 1000) {
                String description = response == null ? "응답 없음" : response.description();
                throw new CustomException(ErrorCode.SMS_SEND_FAIL, "SMS 발송에 실패했습니다: " + description);
            }
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SMS_SEND_FAIL, "SMS 발송에 실패했습니다: " + e.getMessage());
        }
    }

    private String getAccessToken() {
        String cached = redisTemplate.opsForValue().get(TOKEN_REDIS_KEY);
        if (cached != null) {
            return cached;
        }

        // Basic Base64(계정:뿌리오 개발 인증키) — "인증키"는 뿌리오 콘솔 "연동개발(API)" 메뉴에서 발급받는
        // 값이며, 계정 로그인 비밀번호가 아니다(공식 문서 기준, 2026-07-20 확인).
        String credentials = Base64.getEncoder()
                .encodeToString((account + ":" + authKey).getBytes(StandardCharsets.UTF_8));

        try {
            TokenResponse response = restClient.post()
                    .uri("/v1/token")
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                    .contentType(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(TokenResponse.class);

            if (response == null || response.token() == null) {
                throw new CustomException(ErrorCode.SMS_SEND_FAIL, "SMS 토큰 발급에 실패했습니다.");
            }

            redisTemplate.opsForValue().set(TOKEN_REDIS_KEY, response.token(), TOKEN_TTL);
            return response.token();
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.SMS_SEND_FAIL, "SMS 토큰 발급에 실패했습니다: " + e.getMessage());
        }
    }

    private record TokenResponse(String token, String type, Long expired) {
    }

    private record SendResponse(int code, String description, String messageKey, String refKey) {
    }
}
