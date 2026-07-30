package com.foodtrip.foodsearch.admin.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.admin.dto.SystemStatusItemDto;

// 14(관리자-권한) 2차 — "현재 API 상태들 실시간으로 모니터링" 요청으로 추가. admin-test.html이 이 API를
// 주기적으로 폴링해서(5초 간격) 화면을 갱신한다 — 서버가 클라이언트에 push하는 진짜 실시간(WebSocket 등)은
// 아니고, 이 프로젝트에 이미 있는 "폴링" 패턴(예: 07 지도 검색 등)과 같은 방식이다. 이 서비스 자체는
// AdminServiceImpl과 마찬가지로 컨트롤러 단에서 이미 ADMIN 권한이 확인된 뒤 호출된다.
@Service
public class SystemStatusServiceImpl implements SystemStatusService {

    // DB/Redis처럼 순간적으로 응답하는 항목만 실시간 연결 확인 대상으로 삼는다. Python 서버(business-verify,
    // recommendation)도 로컬/사내 서버라 짧은 타임아웃으로 안전하게 확인 가능. 반면 카카오/메일/SMS는 매
    // 폴링(5초)마다 실제로 호출하면 카카오 API 쿼터를 소모하거나 진짜 메일/문자가 나가버리므로, 그 셋은
    // "설정값이 채워져 있는지"만 확인한다(4-2장 참고, 진짜 연결 확인이 아님을 화면에도 명시).
    private static final Duration PING_TIMEOUT = Duration.ofSeconds(2);

    private final DataSource dataSource;
    private final StringRedisTemplate redisTemplate;
    private final HttpClient httpClient;

    private final String businessVerifyBaseUrl;
    private final String recommendationBaseUrl;
    private final String kakaoClientId;
    private final String mailUsername;
    private final String ppurioAccount;

    public SystemStatusServiceImpl(DataSource dataSource,
                                    StringRedisTemplate redisTemplate,
                                    @Value("${business-verify.base-url}") String businessVerifyBaseUrl,
                                    @Value("${recommendation.base-url}") String recommendationBaseUrl,
                                    @Value("${oauth.kakao.client-id:}") String kakaoClientId,
                                    @Value("${spring.mail.username:}") String mailUsername,
                                    @Value("${ppurio.account:}") String ppurioAccount) {
        this.dataSource = dataSource;
        this.redisTemplate = redisTemplate;
        this.businessVerifyBaseUrl = businessVerifyBaseUrl;
        this.recommendationBaseUrl = recommendationBaseUrl;
        this.kakaoClientId = kakaoClientId;
        this.mailUsername = mailUsername;
        this.ppurioAccount = ppurioAccount;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(PING_TIMEOUT)
                .build();
    }

    @Override
    public List<SystemStatusItemDto> checkAll() {
        List<SystemStatusItemDto> results = new ArrayList<>();
        results.add(checkDatabase());
        results.add(checkRedis());
        results.add(checkHttpServer("사업자/영수증 OCR 서버 (business-verify)", businessVerifyBaseUrl));
        results.add(checkHttpServer("AI 추천 서버 (recommendation)", recommendationBaseUrl));
        results.add(checkConfigured("카카오 로컬/로그인 API", kakaoClientId));
        results.add(checkConfigured("메일 발송 (Daum SMTP)", mailUsername));
        results.add(checkConfigured("SMS 발송 (Ppurio)", ppurioAccount));
        return results;
    }

    private SystemStatusItemDto checkDatabase() {
        long start = System.currentTimeMillis();
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid((int) PING_TIMEOUT.getSeconds());
            long latency = System.currentTimeMillis() - start;
            return valid
                    ? new SystemStatusItemDto("DB (MariaDB)", "UP", "정상 연결", latency, LocalDateTime.now())
                    : new SystemStatusItemDto("DB (MariaDB)", "DOWN", "연결은 됐으나 유효성 검사 실패", latency,
                            LocalDateTime.now());
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new SystemStatusItemDto("DB (MariaDB)", "DOWN", e.getMessage(), latency, LocalDateTime.now());
        }
    }

    private SystemStatusItemDto checkRedis() {
        long start = System.currentTimeMillis();
        try {
            String pong = redisTemplate.getConnectionFactory().getConnection().ping();
            long latency = System.currentTimeMillis() - start;
            return "PONG".equalsIgnoreCase(pong)
                    ? new SystemStatusItemDto("Redis", "UP", "정상 연결", latency, LocalDateTime.now())
                    : new SystemStatusItemDto("Redis", "DOWN", "예상치 못한 응답: " + pong, latency, LocalDateTime.now());
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new SystemStatusItemDto("Redis", "DOWN", e.getMessage(), latency, LocalDateTime.now());
        }
    }

    // 응답 코드는 신경 쓰지 않는다(그 Python 서버가 루트 경로에 뭘 두든 상관없이, 연결 자체가 되는지만 확인) —
    // 연결이 거부되거나 타임아웃되면 그 서버가 기동되어 있지 않다는 뜻이다.
    private SystemStatusItemDto checkHttpServer(String name, String baseUrl) {
        long start = System.currentTimeMillis();
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl))
                    .timeout(PING_TIMEOUT)
                    .GET()
                    .build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            long latency = System.currentTimeMillis() - start;
            return new SystemStatusItemDto(name, "UP", "HTTP " + response.statusCode() + " 응답", latency,
                    LocalDateTime.now());
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new SystemStatusItemDto(name, "DOWN", "연결 실패 (" + baseUrl + ")", latency, LocalDateTime.now());
        }
    }

    private SystemStatusItemDto checkConfigured(String name, String value) {
        boolean configured = value != null && !value.isBlank();
        return new SystemStatusItemDto(name, configured ? "CONFIGURED" : "NOT_CONFIGURED",
                configured ? "설정값 있음 (실제 연결은 확인하지 않음)" : "환경변수가 비어있음", null, LocalDateTime.now());
    }
}
