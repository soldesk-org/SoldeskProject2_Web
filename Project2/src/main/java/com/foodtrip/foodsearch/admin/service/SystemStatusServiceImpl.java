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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.admin.dto.SystemStatusItemDto;
import com.foodtrip.foodsearch.common.sms.PpurioSmsService;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchClient;

// 14(관리자-권한) 2차 — "현재 API 상태들 실시간으로 모니터링" 요청으로 추가. admin-test.html이 이 API를
// 주기적으로 폴링해서(5초 간격) 화면을 갱신한다 — 서버가 클라이언트에 push하는 진짜 실시간(WebSocket 등)은
// 아니고, 이 프로젝트에 이미 있는 "폴링" 패턴(예: 07 지도 검색 등)과 같은 방식이다. 이 서비스 자체는
// AdminServiceImpl과 마찬가지로 컨트롤러 단에서 이미 ADMIN 권한이 확인된 뒤 호출된다.
//
// 2026-08-06 개편 — 카카오/메일/SMS도 "설정값 존재 여부만" 확인하던 것을 실제 연결까지 확인하도록 바꿨다.
// 다만 5초마다 폴링되므로 매번 실제로 호출하면 카카오 쿼터를 낭비하거나(호출 자체는 과금/쿼터가 드는 건
// 아니지만 불필요하게 자주 때릴 이유가 없음) SMS 토큰을 불필요하게 재발급하게 된다 — 그래서 이 세 항목은
// CACHE_TTL(60초) 동안 결과를 캐싱해두고, 그 안에 다시 폴링되면 캐시된 결과를 그대로 돌려준다.
@Service
public class SystemStatusServiceImpl implements SystemStatusService {

    private static final Duration PING_TIMEOUT = Duration.ofSeconds(2);
    private static final Duration LIVE_CHECK_CACHE_TTL = Duration.ofSeconds(60);

    private final DataSource dataSource;
    private final StringRedisTemplate redisTemplate;
    private final HttpClient httpClient;
    private final KakaoLocalSearchClient kakaoLocalSearchClient;
    private final JavaMailSenderImpl javaMailSender;
    private final PpurioSmsService ppurioSmsService;

    private final String businessVerifyBaseUrl;
    private final String businessVerifyInternalToken;
    private final String recommendationBaseUrl;
    private final String kakaoClientId;
    private final String mailUsername;
    private final String ppurioAccount;

    private final Map<String, CachedStatus> liveCheckCache = new ConcurrentHashMap<>();

    private record CachedStatus(SystemStatusItemDto item, long checkedAtMs) {
    }

    public SystemStatusServiceImpl(DataSource dataSource,
                                    StringRedisTemplate redisTemplate,
                                    KakaoLocalSearchClient kakaoLocalSearchClient,
                                    JavaMailSenderImpl javaMailSender,
                                    PpurioSmsService ppurioSmsService,
                                    @Value("${business-verify.base-url}") String businessVerifyBaseUrl,
                                    @Value("${business-verify.internal-token:}") String businessVerifyInternalToken,
                                    @Value("${recommendation.base-url}") String recommendationBaseUrl,
                                    @Value("${oauth.kakao.client-id:}") String kakaoClientId,
                                    @Value("${spring.mail.username:}") String mailUsername,
                                    @Value("${ppurio.account:}") String ppurioAccount) {
        this.dataSource = dataSource;
        this.redisTemplate = redisTemplate;
        this.kakaoLocalSearchClient = kakaoLocalSearchClient;
        this.javaMailSender = javaMailSender;
        this.ppurioSmsService = ppurioSmsService;
        this.businessVerifyBaseUrl = businessVerifyBaseUrl;
        this.businessVerifyInternalToken = businessVerifyInternalToken;
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
        results.add(checkHttpServer("사업자/영수증 OCR 서버", businessVerifyBaseUrl, businessVerifyInternalToken));
        results.add(checkHttpServer("AI 추천 서버", recommendationBaseUrl, null));
        results.add(checkWithCache("카카오 API", kakaoClientId, this::pingKakao));
        results.add(checkWithCache("메일 발송", mailUsername, this::pingMail));
        results.add(checkWithCache("SMS 발송", ppurioAccount, this::pingSms));
        return results;
    }

    private SystemStatusItemDto checkDatabase() {
        long start = System.currentTimeMillis();
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid((int) PING_TIMEOUT.getSeconds());
            long latency = System.currentTimeMillis() - start;
            return valid
                    ? new SystemStatusItemDto("DB", "UP", "정상 연결", latency, LocalDateTime.now())
                    : new SystemStatusItemDto("DB", "DOWN", "연결은 됐으나 유효성 검사 실패", latency,
                            LocalDateTime.now());
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new SystemStatusItemDto("DB", "DOWN", e.getMessage(), latency, LocalDateTime.now());
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

    // FastAPI 앱은 루트("/")에 라우트를 안 두면 404를 주는 게 정상이라(2026-08-06, 실제로 그렇게 뜨는 걸
    // 확인) 루트 응답 코드로는 "떠있는지"를 못 가른다 — 대신 FastAPI가 자동으로 만들어주는 Swagger 문서
    // 경로("/docs")를 확인한다. 2xx가 아니면 명확히 DOWN으로 표시한다(예전엔 404여도 "UP"으로 잘못 표시됨).
    private SystemStatusItemDto checkHttpServer(String name, String baseUrl, String internalToken) {
        long start = System.currentTimeMillis();
        try {
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder(URI.create(baseUrl + "/docs"))
                    .timeout(PING_TIMEOUT)
                    .GET();
            // 2026-08-08 — api.eattyway.com이 X-Internal-Token 없는 요청을 전부 401로 거부하게 바뀌어서,
            // 이 상태 조회도 토큰을 실어 보내야 "UP"으로 정상 확인된다(그렇지 않으면 401을 DOWN으로 오인함).
            if (internalToken != null && !internalToken.isBlank()) {
                requestBuilder.header("X-Internal-Token", internalToken);
            }
            HttpRequest request = requestBuilder.build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            long latency = System.currentTimeMillis() - start;
            boolean up = response.statusCode() >= 200 && response.statusCode() < 300;
            return new SystemStatusItemDto(name, up ? "UP" : "DOWN",
                    "HTTP " + response.statusCode() + " 응답", latency, LocalDateTime.now());
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new SystemStatusItemDto(name, "DOWN", "연결 실패", latency, LocalDateTime.now());
        }
    }

    // 카카오/메일/SMS는 실제로 호출해 확인하되, 5초 폴링마다 매번 때리지 않도록 캐싱해서 재사용한다.
    private SystemStatusItemDto checkWithCache(String name, String configuredValue, Runnable livePing) {
        if (configuredValue == null || configuredValue.isBlank()) {
            return new SystemStatusItemDto(name, "NOT_CONFIGURED", "환경변수가 비어있음", null, LocalDateTime.now());
        }
        CachedStatus cached = liveCheckCache.get(name);
        long now = System.currentTimeMillis();
        if (cached != null && now - cached.checkedAtMs() < LIVE_CHECK_CACHE_TTL.toMillis()) {
            return cached.item();
        }

        long start = System.currentTimeMillis();
        SystemStatusItemDto result;
        try {
            livePing.run();
            long latency = System.currentTimeMillis() - start;
            result = new SystemStatusItemDto(name, "UP", "실제 연결 확인됨", latency, LocalDateTime.now());
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            result = new SystemStatusItemDto(name, "DOWN", "연결 실패: " + e.getMessage(), latency, LocalDateTime.now());
        }
        liveCheckCache.put(name, new CachedStatus(result, now));
        return result;
    }

    private void pingKakao() {
        kakaoLocalSearchClient.ping();
    }

    private void pingMail() {
        try {
            javaMailSender.testConnection();
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private void pingSms() {
        ppurioSmsService.checkConnection();
    }
}
