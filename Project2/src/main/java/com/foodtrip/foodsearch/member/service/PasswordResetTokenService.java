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
    // 2026-08-14 조정 — PC에서 요청하고 모바일에서 링크를 여는 실사용 흐름은 이메일 앱을 열고 찾는
    // 시간까지 포함해 10분을 넘기기 쉽고, PC 탭이 그동안 백그라운드에 있으면 폴링 타이머 자체도
    // 브라우저가 강하게 늦춰버려서(아래 find-password-sent.js의 visibilitychange 보강과 함께) 10분
    // 안에 확인을 못 하는 경우가 실제로 있었다. 토큰 자체의 유효시간(TOKEN_TTL)과 맞춰 1시간으로 늘린다.
    private static final Duration POLL_CONFIRM_TTL = Duration.ofHours(1);
    private static final String KEY_PREFIX = "pwreset:";
    private static final String POLL_KEY_PREFIX = "pwreset:poll:";
    private static final String TOKEN_TO_POLL_PREFIX = "pwreset:tokenpoll:";
    private static final String CONFIRMED_PREFIX = "pwreset:confirmed:";
    private static final String OPENED_PREFIX = "pwreset:opened:";

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetTokenService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 새 토큰을 발급하고 Redis에 (해시 -> memberId)로 저장한다. 반환값(rawToken)만 이메일로 보낸다.
     * pollKey가 함께 오면(2026-08-04 추가, find-password.html이 요청 전 생성) 다른 탭에서
     * "이메일 링크를 눌렀는지"를 폴링으로 확인할 수 있도록 상관관계도 함께 저장한다.
     */
    public String issue(Long memberId, String pollKey) {
        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        redisTemplate.opsForValue().set(key(rawToken), String.valueOf(memberId), TOKEN_TTL);

        if (pollKey != null && !pollKey.isBlank()) {
            redisTemplate.opsForValue().set(POLL_KEY_PREFIX + pollKey, rawToken, TOKEN_TTL);
            redisTemplate.opsForValue().set(TOKEN_TO_POLL_PREFIX + sha256Hex(rawToken), pollKey, TOKEN_TTL);
        }
        return rawToken;
    }

    /**
     * 이메일 링크(find-password-reset.html?token=...)가 열렸을 때 호출 — 실제 토큰을 소비(1회용 처리)하지
     * 않고, "이 링크가 클릭됐다"는 사실만 별도로 남긴다. 원본 탭의 폴링이 이 값을 확인한다.
     * 반환값은 "이번이 처음 열린 것인지"(true=처음) — 같은 링크를 다시 열면 false를 돌려주고,
     * 프론트(find-password-reset.js)는 이 경우 "이미 사용된 링크"로 안내한다(2026-08-04 추가).
     */
    public boolean markLinkOpened(String rawToken) {
        String pollKey = redisTemplate.opsForValue().get(TOKEN_TO_POLL_PREFIX + sha256Hex(rawToken));
        if (pollKey != null) {
            redisTemplate.opsForValue().set(CONFIRMED_PREFIX + pollKey, rawToken, POLL_CONFIRM_TTL);
        }
        Boolean firstTime = redisTemplate.opsForValue().setIfAbsent(OPENED_PREFIX + sha256Hex(rawToken), "1", TOKEN_TTL);
        return Boolean.TRUE.equals(firstTime);
    }

    /**
     * find-password-sent.html이 주기적으로 호출 — 이메일 링크가 클릭됐으면 그 토큰을 돌려준다.
     */
    public String checkConfirmed(String pollKey) {
        return redisTemplate.opsForValue().get(CONFIRMED_PREFIX + pollKey);
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
