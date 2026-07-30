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
 * 프로필 사진(회원가입/회원정보수정/소셜로그인 공통) 파일을 로컬 디스크에 저장한다.
 * 이 프로젝트는 클라우드 스토리지(S3 등)를 아직 도입하지 않아, 다른 파일(사업자등록증명원)처럼
 * 외부 서버로 전달만 하고 버리는 방식 대신 이번엔 실제로 디스크에 남겨 URL로 서빙해야 해서 최소한의
 * 저장 컴포넌트를 새로 둔다(StaticResourceConfig가 이 upload-dir을 그대로 정적 서빙한다).
 */
@Component
public class ProfileImageStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/gif", "image/webp");

    private final Path uploadDir;
    private final String baseUrl;
    private final long maxSizeBytes;

    public ProfileImageStorageService(@Value("${profile-image.upload-dir}") String uploadDir,
                                       @Value("${profile-image.base-url}") String baseUrl,
                                       @Value("${profile-image.max-size-bytes:5242880}") long maxSizeBytes) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl;
        this.maxSizeBytes = maxSizeBytes;
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("프로필 사진 저장 디렉터리를 만들 수 없습니다: " + this.uploadDir, e);
        }
    }

    public String store(MultipartFile file) {
        validate(file);
        String filename = UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INVALID_PROFILE_IMAGE, "이미지 저장에 실패했습니다: " + e.getMessage());
        }
        return baseUrl + "/" + filename;
    }

    // 소셜 플랫폼이 준 외부 URL(우리가 저장한 파일이 아님)은 지우지 않도록, baseUrl로 시작하는 경우에만 삭제한다.
    public void delete(String profileImageUrl) {
        if (profileImageUrl == null || !profileImageUrl.startsWith(baseUrl + "/")) {
            return;
        }
        String filename = profileImageUrl.substring((baseUrl + "/").length());
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
            throw new CustomException(ErrorCode.INVALID_PROFILE_IMAGE,
                    "이미지 파일 용량은 " + (maxSizeBytes / (1024 * 1024)) + "MB를 초과할 수 없습니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new CustomException(ErrorCode.INVALID_PROFILE_IMAGE, "지원하지 않는 이미지 형식입니다(jpg/png/gif/webp만 가능).");
        }
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int idx = originalFilename.lastIndexOf('.');
        return idx >= 0 ? originalFilename.substring(idx) : "";
    }
}
