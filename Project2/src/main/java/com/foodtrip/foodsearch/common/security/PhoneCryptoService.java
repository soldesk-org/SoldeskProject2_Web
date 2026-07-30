package com.foodtrip.foodsearch.common.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 전화번호처럼 "나중에 평문으로 다시 꺼내 써야 하는" 민감정보를 위한 양방향 암호화(AES-256-GCM) +
 * 결정적 해시(HMAC-SHA256) 서비스.
 *
 * 암호화(encrypt/decrypt)는 저장/조회 시 평문 왕복이 필요할 때, 해시(hash)는 같은 값인지 비교(중복 확인,
 * DB UNIQUE 조회)만 필요할 때 사용한다. 두 목적에 서로 다른 키를 쓰는 것이 안전하므로 키를 분리했다.
 */
@Component
public class PhoneCryptoService {

    private static final String CIPHER_ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final SecretKeySpec aesKey;
    private final SecretKeySpec hmacKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public PhoneCryptoService(@Value("${phone-crypto.aes-key}") String aesKeyBase64,
                               @Value("${phone-crypto.hash-key}") String hashKeyBase64) {
        this.aesKey = new SecretKeySpec(Base64.getDecoder().decode(aesKeyBase64), "AES");
        this.hmacKey = new SecretKeySpec(Base64.getDecoder().decode(hashKeyBase64), HMAC_ALGORITHM);
    }

    /**
     * AES-256-GCM으로 암호화한다. 저장 형식: Base64(IV(12바이트) + 암호문+태그)
     */
    public String encrypt(String plainText) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(CIPHER_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, aesKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            byte[] result = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, result, 0, iv.length);
            System.arraycopy(cipherText, 0, result, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(result);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("전화번호 암호화에 실패했습니다.", e);
        }
    }

    public String decrypt(String encoded) {
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            byte[] cipherText = new byte[combined.length - GCM_IV_LENGTH_BYTES];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(CIPHER_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, aesKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] plainBytes = cipher.doFinal(cipherText);

            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("전화번호 복호화에 실패했습니다.", e);
        }
    }

    /**
     * HMAC-SHA256 기반 결정적(deterministic) 해시. 같은 입력은 항상 같은 출력을 내므로
     * 중복 확인/조회(DB UNIQUE 컬럼)용으로 쓴다. Argon2/BCrypt처럼 salt를 넣지 않는 것이 의도된 설계다.
     */
    public String hash(String plainText) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(hmacKey);
            byte[] hashed = mac.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("전화번호 해시 생성에 실패했습니다.", e);
        }
    }
}
