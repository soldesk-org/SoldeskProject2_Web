package com.foodtrip.foodsearch.chat.service;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

import com.foodtrip.foodsearch.chat.repository.ChatRoomRepository;

// 19(오픈채팅) — 카카오톡 오픈채팅 참가코드 스타일의 영문 대문자+숫자 6~8자리 랜덤 코드. 헷갈리기 쉬운
// 문자(0/O, 1/I/L)는 후보 알파벳에서 아예 빼서 사람이 직접 타이핑해서 공유해도 오타가 잘 안 나게 했다
// (카카오톡 오픈채팅 초대코드도 이런 방식). 8자리를 기본값으로 쓰고(엔트로피가 더 큼), DB에 이미 있는
// 코드와 우연히 겹치면 재시도한다(001-02 2-2장).
@Component
public class JoinCodeGenerator {

    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 0,O,1,I,L 제외
    private static final int DEFAULT_LENGTH = 8;
    private static final int MAX_ATTEMPTS = 10;

    private final ChatRoomRepository chatRoomRepository;
    private final SecureRandom random = new SecureRandom();

    public JoinCodeGenerator(ChatRoomRepository chatRoomRepository) {
        this.chatRoomRepository = chatRoomRepository;
    }

    public String generateUnique() {
        return generateUnique(DEFAULT_LENGTH);
    }

    public String generateUnique(int length) {
        if (length != 6 && length != 8) {
            throw new IllegalArgumentException("참가코드 길이는 6 또는 8자리만 지원합니다.");
        }
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String candidate = generate(length);
            if (!chatRoomRepository.existsByJoinCode(candidate)) {
                return candidate;
            }
        }
        // 8자리 기준 32^8(약 1조) 경우의 수라 실제로 여기까지 올 확률은 거의 없다 - 방어적 예외.
        throw new IllegalStateException("참가코드 생성에 반복적으로 실패했습니다. 다시 시도해주세요.");
    }

    private String generate(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
