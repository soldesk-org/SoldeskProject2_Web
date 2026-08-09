package com.foodtrip.foodsearch.shortlink.service;

import java.security.SecureRandom;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.shortlink.entity.ShortLink;
import com.foodtrip.foodsearch.shortlink.repository.ShortLinkRepository;

@Service
public class ShortLinkServiceImpl implements ShortLinkService {

    private static final String ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"; // 0/O/1/I/l 제외(혼동 방지)
    private static final int CODE_LENGTH = 7;
    private static final int MAX_GENERATE_ATTEMPTS = 5;

    // "페이지이름?쿼리스트링" 형태의 우리 사이트 내부 상대 경로만 허용한다 — scheme(http:)이나 "//"로
    // 시작하는 값은 절대 통과시키지 않는다(오픈 리다이렉트 방지). 페이지 이름은 PageRoutingController의
    // 화이트리스트와 같은 [a-z0-9-]+ 형태, 쿼리스트링은 URL 인코딩된 값만 허용.
    private static final Pattern TARGET_PATH_PATTERN =
            Pattern.compile("^[a-z0-9-]+(\\?[A-Za-z0-9%._~:/?#\\[\\]@!$&'()*+,;=-]*)?$");

    private final ShortLinkRepository shortLinkRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public ShortLinkServiceImpl(ShortLinkRepository shortLinkRepository) {
        this.shortLinkRepository = shortLinkRepository;
    }

    @Override
    @Transactional
    public String createOrReuse(String path) {
        String normalized = path == null ? "" : path.trim();
        // 앞에 "/"가 붙어 와도(예: "/explore?...") 받아주되, scheme/authority가 섞인 값은 걸러낸다.
        if (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        if (normalized.isEmpty() || !TARGET_PATH_PATTERN.matcher(normalized).matches()) {
            throw new CustomException(ErrorCode.SHORT_LINK_INVALID_TARGET);
        }
        final String targetPath = normalized;

        return shortLinkRepository.findFirstByTargetPath(targetPath)
                .map(ShortLink::getCode)
                .orElseGet(() -> shortLinkRepository.save(ShortLink.create(generateUniqueCode(), targetPath)).getCode());
    }

    @Override
    public String resolve(String code) {
        return shortLinkRepository.findByCode(code)
                .map(ShortLink::getTargetPath)
                .orElseThrow(() -> new CustomException(ErrorCode.SHORT_LINK_NOT_FOUND));
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
            String candidate = randomCode();
            if (!shortLinkRepository.existsByCode(candidate)) {
                return candidate;
            }
        }
        // 7자리 base57 공간(57^7 ≈ 2,000억)에서 5연속 충돌은 사실상 불가능 — 방어적으로만 처리.
        throw new CustomException(ErrorCode.SHORT_LINK_INVALID_TARGET, "단축 코드 생성에 실패했습니다. 다시 시도해주세요.");
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET.charAt(secureRandom.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
