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

    public String issue(String provider) {
        byte[] randomBytes = new byte[STATE_BYTES];
        secureRandom.nextBytes(randomBytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        redisTemplate.opsForValue().set(key(state), provider, STATE_TTL);
        return state;
    }

    /**
     * state가 존재하고(=발급 후 5분 이내) 저장된 provider와 일치하는지 확인한 뒤 즉시 삭제(1회용)한다.
     */
    public boolean validate(String state, String provider) {
        if (state == null || state.isBlank()) {
            return false;
        }
        String stored = redisTemplate.opsForValue().getAndDelete(key(state));
        return stored != null && stored.equals(provider);
    }

    private String key(String state) {
        return KEY_PREFIX + state;
    }
}
