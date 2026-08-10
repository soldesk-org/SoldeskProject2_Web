package com.foodtrip.foodsearch.common.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

// 영수증 이미지(08 영수증OCR, 2026-07-21 추가) 파일을 로컬 디스크에 저장한다. RestaurantImageStorageService
// (07)/ProfileImageStorageService(005)와 완전히 같은 패턴 — 공용 유틸로 합치지 않는 이유도 동일(과한
// 공통화보다 단순함 우선, 001-02(음식점-메뉴-검색) 3장에서 이미 여러 번 확정).
@Component
public class ReceiptImageStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
    // 2026-08-10 보안 수정(경로 조작 방지) — extractExtension()이 반환할 수 있는 값을 이 화이트리스트로
    // 제한한다. 원본 파일명에 "/"나 ".."가 섞여 있어도(예: "a.jpg/../../evil") 화이트리스트에 없으니
    // 그냥 빈 문자열로 떨어져, uploadDir.resolve(filename)이 디렉터리 밖으로 나가지 못한다.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    private final Path uploadDir;
    private final String baseUrl;
    private final long maxSizeBytes;

    public ReceiptImageStorageService(@Value("${receipt-image.upload-dir}") String uploadDir,
                                       @Value("${receipt-image.base-url}") String baseUrl,
                                       @Value("${receipt-image.max-size-bytes:5242880}") long maxSizeBytes) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl;
        this.maxSizeBytes = maxSizeBytes;
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("영수증 이미지 저장 디렉터리를 만들 수 없습니다: " + this.uploadDir, e);
        }
    }

    public String store(MultipartFile file) {
        validate(file);
        String filename = UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INVALID_RECEIPT_IMAGE, "이미지 저장에 실패했습니다: " + e.getMessage());
        }
        return baseUrl + "/" + filename;
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.RECEIPT_EMPTY_FILE);
        }
        if (file.getSize() > maxSizeBytes) {
            throw new CustomException(ErrorCode.INVALID_RECEIPT_IMAGE,
                    "이미지 파일 용량은 " + (maxSizeBytes / (1024 * 1024)) + "MB를 초과할 수 없습니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new CustomException(ErrorCode.INVALID_RECEIPT_IMAGE, "지원하지 않는 이미지 형식입니다(jpg/png/gif/webp만 가능).");
        }
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int idx = originalFilename.lastIndexOf('.');
        String ext = idx >= 0 ? originalFilename.substring(idx).toLowerCase() : "";
        return ALLOWED_EXTENSIONS.contains(ext) ? ext : "";
    }
}
