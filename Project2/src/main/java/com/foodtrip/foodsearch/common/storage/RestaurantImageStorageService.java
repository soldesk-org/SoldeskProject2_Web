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

/**
 * 음식점 사진(07 사업자 등록, 2026-07-20 추가) 파일을 로컬 디스크에 저장한다.
 * ProfileImageStorageService(005)와 완전히 같은 패턴 — 패키지/설정 키(profile-image.* vs
 * restaurant-image.*)/에러코드(INVALID_PROFILE_IMAGE vs INVALID_RESTAURANT_IMAGE)만 다르고,
 * 공용 유틸로 합치기보다 이 프로젝트가 지금까지 써온 대로 작은 클래스를 그대로 복제하는 쪽을 택함
 * (과한 공통화보다 단순함 우선 — 001-02(음식점-메뉴-검색) 등에서 이미 반복된 판단).
 */
@Component
public class RestaurantImageStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
    // 2026-08-10 보안 수정(경로 조작 방지) — extractExtension()이 반환할 수 있는 값을 이 화이트리스트로
    // 제한한다. 원본 파일명에 "/"나 ".."가 섞여 있어도(예: "a.jpg/../../evil") 화이트리스트에 없으니
    // 그냥 빈 문자열로 떨어져, uploadDir.resolve(filename)이 디렉터리 밖으로 나가지 못한다.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    private final Path uploadDir;
    private final String baseUrl;
    private final long maxSizeBytes;

    public RestaurantImageStorageService(@Value("${restaurant-image.upload-dir}") String uploadDir,
                                          @Value("${restaurant-image.base-url}") String baseUrl,
                                          @Value("${restaurant-image.max-size-bytes:5242880}") long maxSizeBytes) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl;
        this.maxSizeBytes = maxSizeBytes;
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("음식점 사진 저장 디렉터리를 만들 수 없습니다: " + this.uploadDir, e);
        }
    }

    public String store(MultipartFile file) {
        validate(file);
        String filename = UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INVALID_RESTAURANT_IMAGE, "이미지 저장에 실패했습니다: " + e.getMessage());
        }
        return baseUrl + "/" + filename;
    }

    public void delete(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith(baseUrl + "/")) {
            return;
        }
        String filename = imageUrl.substring((baseUrl + "/").length());
        try {
            Files.deleteIfExists(uploadDir.resolve(filename));
        } catch (IOException ignored) {
            // 정리 실패는 치명적이지 않음(디스크에 고아 파일 하나 남는 정도) — 삭제 자체를 실패시키지 않는다.
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "이미지 파일이 없습니다.");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new CustomException(ErrorCode.INVALID_RESTAURANT_IMAGE,
                    "이미지 파일 용량은 " + (maxSizeBytes / (1024 * 1024)) + "MB를 초과할 수 없습니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new CustomException(ErrorCode.INVALID_RESTAURANT_IMAGE, "지원하지 않는 이미지 형식입니다(jpg/png/gif/webp만 가능).");
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
