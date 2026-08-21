package com.foodtrip.foodsearch.social.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * OAuth 인가(authorize) 요청 시 발급하는 state 값을 Redis에 보관해 CSRF를 방지한다
 * (001-02(소셜로그인) 3장). PasswordResetTokenService와 같은 패턴 — TTL로 자동 만료, 1회 검증 후 즉시 삭제.
 */
@Component
public class OAuthStateService {

    private static final int STATE_BYTES = 24;
    private static final Duration STATE_TTL = Duration.ofMinutes(5);
    private static final String KEY_PREFIX = "oauth:state:";

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public OAuthStateService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // 값 형식 "provider:rememberMe" — 2026-08-09 추가. 소셜로그인은 리다이렉트 콜백이라 우리가 직접
    // 제어하는 이 state 저장소를 거치지 않고는 "로그인 상태 유지" 여부를 콜백 시점까지 들고 올 방법이
    // 없다(카카오/네이버/구글이 code/state 외의 우리 커스텀 파라미터를 그대로 되돌려주지 않기 때문).
    //
    // 2026-08-21 — 값 형식을 "provider:rememberMe:client"로 확장했다(client = web | app). iOS 앱은
    // 소셜로그인을 앱 안 WebView가 아니라 시스템 브라우저(ASWebAuthenticationSession)로 열기 때문에,
    // 콜백 결과를 앱 커스텀 스킴(eattyway://oauth-callback)으로 되돌려줘야 그 창이 닫히고 앱으로
    // 복귀한다. 그 "앱에서 시작한 요청인지"도 rememberMe와 똑같은 이유로 여기에 실어야 콜백까지
    // 들고 올 수 있다. 이걸 안 하면 앱은 인가 요청 전에 우리 웹페이지를 한 번 거쳐 브라우저
    // sessionStorage에 표시를 남기는 우회가 필요했는데, 그러면 로그인 창이 카카오 화면이 아니라
    // eattyway.com 페이지부터 시작해서 사용자가 "왜 공식 로그인 화면이 아니냐"고 느끼게 된다.
    private static final String CLIENT_APP = "app";
    private static final String CLIENT_WEB = "web";

    public String issue(String provider, boolean rememberMe, boolean appClient) {
        byte[] randomBytes = new byte[STATE_BYTES];
        secureRandom.nextBytes(randomBytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        String value = provider + ":" + rememberMe + ":" + (appClient ? CLIENT_APP : CLIENT_WEB);
        redisTemplate.opsForValue().set(key(state), value, STATE_TTL);
        return state;
    }

    public record StateResult(boolean valid, boolean rememberMe, boolean appClient) {
        static final StateResult INVALID = new StateResult(false, false, false);
    }

    /**
     * state가 존재하고(=발급 후 5분 이내) 저장된 provider와 일치하는지 확인한 뒤 즉시 삭제(1회용)한다.
     */
    public StateResult validate(String state, String provider) {
        if (state == null || state.isBlank()) {
            return StateResult.INVALID;
        }
        String stored = redisTemplate.opsForValue().getAndDelete(key(state));
        if (stored == null) {
            return StateResult.INVALID;
        }
        // 배포 직후에는 이전 형식("provider:rememberMe", client 없음)으로 발급된 state가 최대 5분(TTL)
        // 동안 남아 있을 수 있어서 length를 2까지 허용한다 — 그 경우는 web으로 취급.
        String[] parts = stored.split(":", 3);
        if (parts.length < 2 || !parts[0].equals(provider)) {
            return StateResult.INVALID;
        }
        boolean appClient = parts.length >= 3 && CLIENT_APP.equals(parts[2]);
        return new StateResult(true, Boolean.parseBoolean(parts[1]), appClient);
    }

    /**
     * state를 소비하지 않고 "앱에서 시작한 요청인지"만 확인한다. 콜백은 성공/실패 어느 쪽이든 결과를
     * 되돌려줄 곳(웹 페이지 vs 앱 커스텀 스킴)을 먼저 정해야 하는데, 실제 검증(validate)은 1회용으로
     * state를 지워버리기 때문에 그 전에 읽어둘 수단이 필요하다. state 자체가 유효하지 않으면(만료 등)
     * 판단할 근거가 없으므로 false(=웹)로 본다.
     */
    public boolean isAppClient(String state) {
        if (state == null || state.isBlank()) {
            return false;
        }
        String stored = redisTemplate.opsForValue().get(key(state));
        if (stored == null) {
            return false;
        }
        String[] parts = stored.split(":", 3);
        return parts.length >= 3 && CLIENT_APP.equals(parts[2]);
    }

    private String key(String state) {
        return KEY_PREFIX + state;
    }
}
