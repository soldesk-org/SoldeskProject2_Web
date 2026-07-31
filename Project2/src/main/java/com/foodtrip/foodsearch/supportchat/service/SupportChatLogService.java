package com.foodtrip.foodsearch.supportchat.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.ObjectMapper;

/**
 * AI 고객센터 챗봇 대화 내용을 JSON Lines(.jsonl) 파일에 남긴다(2026-07-31 2차 추가).
 * question/answer는 AES-256-GCM으로 암호화해서 저장하고, sessionId/timestamp/type은 로그를
 * 나중에 훑어보기 쉽도록 평문으로 남긴다 — {@link com.foodtrip.foodsearch.common.security.PhoneCryptoService}와
 * 완전히 같은 암복호화 방식이지만, "서로 다른 목적엔 서로 다른 키를 쓴다"는 그 서비스의 설계를 그대로
 * 따라 별도 키(CHAT_LOG_AES_KEY)를 쓰는 별개 클래스로 둔다(패키지도 다르고 목적도 달라 공유 헬퍼로
 * 묶지 않음 — 이 프로젝트가 지금까지 일관되게 택해온 방식).
 */
@Component
public class SupportChatLogService {

    private static final Logger log = LoggerFactory.getLogger(SupportChatLogService.class);
    private static final String CIPHER_ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private final SecretKeySpec aesKey;
    private final Path logFile;
    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final SecureRandom secureRandom = new SecureRandom();
    private final Object writeLock = new Object();

    public SupportChatLogService(@Value("${support-chat-log.aes-key}") String aesKeyBase64,
                                  @Value("${support-chat-log.log-file}") String logFilePath) {
        this.aesKey = new SecretKeySpec(Base64.getDecoder().decode(aesKeyBase64), "AES");
        this.logFile = Path.of(logFilePath);
    }

    public void logTurn(String sessionId, String question, String answer) {
        writeLine("QNA", sessionId, question, answer);
    }

    public void logSessionEnd(String sessionId, String reason) {
        writeLine("SESSION_END", sessionId, reason, null);
    }

    private void writeLine(String type, String sessionId, String field1, String field2) {
        try {
            var entry = new java.util.LinkedHashMap<String, Object>();
            entry.put("type", type);
            entry.put("sessionId", sessionId);
            entry.put("timestamp", Instant.now().toString());
            if (field1 != null) {
                entry.put(type.equals("QNA") ? "question" : "reason", encrypt(field1));
            }
            if (field2 != null) {
                entry.put("answer", encrypt(field2));
            }
            String line = objectMapper.writeValueAsString(entry) + System.lineSeparator();

            synchronized (writeLock) {
                if (logFile.getParent() != null) {
                    Files.createDirectories(logFile.getParent());
                }
                Files.writeString(logFile, line, StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            }
        } catch (IOException e) {
            // 로그 남기기 실패가 챗봇 응답 자체를 막으면 안 된다(부가 기능) — 경고만 남기고 통과.
            log.warn("챗봇 대화 로그 기록 실패: {}", e.getMessage());
        }
    }

    private String encrypt(String plainText) {
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
            throw new IllegalStateException("챗봇 로그 암호화에 실패했습니다.", e);
        }
    }

    /** 복호화(사후 감사/조회용) — 평상시 애플리케이션 흐름에서는 호출되지 않는다. */
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
            throw new IllegalStateException("챗봇 로그 복호화에 실패했습니다.", e);
        }
    }
}
