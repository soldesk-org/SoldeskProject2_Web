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
 * 이메일 찾기(닉네임+전화번호 조회) 성공 이후, SMS 인증으로 이메일을 전체공개하기까지
 * 짧은 시간 동안 "이 클라이언트가 방금 그 회원을 찾아냈다"는 것을 증명하는 단기 세션 토큰.
 *
 * memberId(순차 증가 PK)를 응답/요청에 그대로 노출하면 다른 memberId를 넣어 무차별로
 * SMS 인증을 시도(비용 발생)할 위험이 있어([001-02(이메일찾기) 12-4장] 참고), PasswordResetTokenService와
 * 동일한 패턴(Redis + SHA-256 해시 저장)의 단기 토큰으로 대체한다.
 */
@Component
public class FindEmailVerificationSessionService {

    private static final int TOKEN_BYTES = 24;
    private static final Duration SESSION_TTL = Duration.ofMinutes(10);
    private static final String KEY_PREFIX = "findemail:session:";

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public FindEmailVerificationSessionService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public String issue(Long memberId) {
        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        redisTemplate.opsForValue().set(key(rawToken), String.valueOf(memberId), SESSION_TTL);
        return rawToken;
    }

    /**
     * 세션이 유효한 동안(TTL 10분) 여러 번(발송→확인→공개조회) 조회할 수 있어야 하므로,
     * PasswordResetTokenService.consume()과 달리 조회만 하고 삭제하지 않는다. 만료는 TTL로만 처리.
     */
    public Long resolve(String rawToken) {
        String value = redisTemplate.opsForValue().get(key(rawToken));
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
            throw new IllegalStateException("조회 세션 토큰 해시 생성에 실패했습니다.", e);
        }
    }
}
