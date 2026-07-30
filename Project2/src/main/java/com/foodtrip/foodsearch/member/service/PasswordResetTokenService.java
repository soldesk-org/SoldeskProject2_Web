package com.foodtrip.foodsearch.member.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 비밀번호 재설정 토큰을 DB 테이블(password_reset_tokens) 대신 Redis에 보관한다.
 * RefreshTokenService/LoginAttemptService와 같은 이유(유효시간이 있는 1회성 데이터, TTL로 만료 자동 처리)로
 * DB 테이블을 새로 만들지 않았다 (001-02 4-2장 참고).
 *
 * 이메일 링크에는 고엔트로피 원본 토큰만 노출하고, Redis에는 SHA-256 해시만 저장한다.
 * 되돌려 쓸 필요가 없는 값이라 PhoneCryptoService처럼 비밀키가 필요한 HMAC이 아니라 단순 해시로 충분하다.
 */
@Component
public class PasswordResetTokenService {

    private static final int TOKEN_BYTES = 32;
    private static final Duration TOKEN_TTL = Duration.ofHours(1);
    private static final String KEY_PREFIX = "pwreset:";

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetTokenService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 새 토큰을 발급하고 Redis에 (해시 -> memberId)로 저장한다. 반환값(rawToken)만 이메일로 보낸다.
     */
    public String issue(Long memberId) {
        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        redisTemplate.opsForValue().set(key(rawToken), String.valueOf(memberId), TOKEN_TTL);
        return rawToken;
    }

    /**
     * 토큰을 조회함과 동시에 즉시 삭제(1회용 처리)한다. 동시에 같은 토큰으로 두 번 요청이 와도
     * 하나만 성공하도록 GETDEL로 원자적으로 처리한다.
     */
    public Long consume(String rawToken) {
        String value = redisTemplate.opsForValue().getAndDelete(key(rawToken));
        return value == null ? null : Long.valueOf(value);
    }

    private String key(String rawToken) {
        return KEY_PREFIX + sha256Hex(rawToken);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("토큰 해시 생성에 실패했습니다.", e);
        }
    }
}
