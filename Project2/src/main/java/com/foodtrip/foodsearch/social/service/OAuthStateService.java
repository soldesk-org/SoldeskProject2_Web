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
    public String issue(String provider, boolean rememberMe) {
        byte[] randomBytes = new byte[STATE_BYTES];
        secureRandom.nextBytes(randomBytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        redisTemplate.opsForValue().set(key(state), provider + ":" + rememberMe, STATE_TTL);
        return state;
    }

    public record StateResult(boolean valid, boolean rememberMe) {
        static final StateResult INVALID = new StateResult(false, false);
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
        String[] parts = stored.split(":", 2);
        if (parts.length != 2 || !parts[0].equals(provider)) {
            return StateResult.INVALID;
        }
        return new StateResult(true, Boolean.parseBoolean(parts[1]));
    }

    private String key(String state) {
        return KEY_PREFIX + state;
    }
}
