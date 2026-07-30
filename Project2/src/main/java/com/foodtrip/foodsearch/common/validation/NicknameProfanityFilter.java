package com.foodtrip.foodsearch.common.validation;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

import org.springframework.core.io.ClassPathResource;

// 닉네임 욕설/비속어 차단(2026-07-21 추가). 단어 목록은 이 프로젝트가 직접 만든 게 아니라
// https://github.com/yoonheyjung/badwords-ko (MIT License)의 한국어 비속어 목록을 그대로 가져와
// resources/data/nickname-badwords-ko.txt에 옮겨 담았다(#으로 시작하는 첫 줄이 출처 주석).
// Bean Validation ConstraintValidator(NoProfanityValidator)가 이 클래스를 사용한다.
public final class NicknameProfanityFilter {

    private static final Set<String> BAD_WORDS = loadBadWords();

    private NicknameProfanityFilter() {
    }

    // 공백 제거 후 부분 문자열 포함 여부로 판단한다 — "바보 새 끼"처럼 띄어쓰기로 필터를 피하는 경우를
    // 막기 위함(원본 단어 목록에도 "개 새 끼" 같은 띄어쓰기 변형이 이미 여러 개 포함돼 있음).
    public static boolean containsProfanity(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return false;
        }
        String normalized = nickname.replaceAll("\\s", "").toLowerCase();
        return BAD_WORDS.stream().anyMatch(normalized::contains);
    }

    private static Set<String> loadBadWords() {
        Set<String> words = new HashSet<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource("data/nickname-badwords-ko.txt").getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                words.add(trimmed.replaceAll("\\s", "").toLowerCase());
            }
        } catch (IOException e) {
            throw new IllegalStateException("닉네임 비속어 목록을 읽을 수 없습니다.", e);
        }
        return words;
    }
}
