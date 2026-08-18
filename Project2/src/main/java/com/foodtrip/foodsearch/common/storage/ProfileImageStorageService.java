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
 * 프로필 사진(회원가입/회원정보수정/소셜로그인 공통) 파일을 저장한다.
 * 이 프로젝트는 원래 클라우드 스토리지 없이 로컬 디스크 + 정적 서빙(StaticResourceConfig)만 썼는데,
 * Azure Blob Storage 마이그레이션(2026-08-18)으로 image-storage.backend 설정값에 따라 로컬 디스크와
 * Azure Blob 두 백엔드를 모두 지원하게 됐다. 기본값은 여전히 local — 팀이 실제로 전환을 확정하기 전까지는
 * 기존 배포/이 워크트리 모두 지금까지와 동일하게 동작해야 하기 때문(운영 중인 VM에 이미 로컬 파일이 쌓여
 * 있어 무중단으로 바꿀 수 있는 시점이 아니면 굳이 기본값을 바꿀 이유가 없음).
 * Azure SDK 호출부는 AzureBlobStorage로 공유(4개 서비스가 그 부분만 복붙하지 않도록).
 */
@Component
public class ProfileImageStorageService {

    // Azure Blob Storage 컨테이너 이름 — 기존 로컬 upload-dir(profile-images 폴더)과 1:1로 대응.
    private static final String BLOB_CONTAINER = "profile-images";

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
    // 2026-08-10 보안 수정(경로 조작 방지) — extractExtension()이 반환할 수 있는 값을 이 화이트리스트로
    // 제한한다. 원본 파일명에 "/"나 ".."가 섞여 있어도(예: "a.jpg/../../evil") 화이트리스트에 없으니
    // 그냥 빈 문자열로 떨어져, uploadDir.resolve(filename)이 디렉터리 밖으로 나가지 못한다.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    private final Path uploadDir;
    private final String baseUrl;
    private final long maxSizeBytes;
    private final String storageBackend;
    private final AzureBlobStorage azureBlobStorage;

    public ProfileImageStorageService(@Value("${profile-image.upload-dir}") String uploadDir,
                                       @Value("${profile-image.base-url}") String baseUrl,
                                       @Value("${profile-image.max-size-bytes:5242880}") long maxSizeBytes,
                                       @Value("${image-storage.backend:local}") String storageBackend,
                                       AzureBlobStorage azureBlobStorage) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl;
        this.maxSizeBytes = maxSizeBytes;
        this.storageBackend = storageBackend;
        this.azureBlobStorage = azureBlobStorage;
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("프로필 사진 저장 디렉터리를 만들 수 없습니다: " + this.uploadDir, e);
        }
    }

    public String store(MultipartFile file) {
        validate(file);
        String filename = UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        if (isAzureBlobBackend()) {
            return azureBlobStorage.upload(BLOB_CONTAINER, filename, file, ErrorCode.INVALID_PROFILE_IMAGE);
        }
        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INVALID_PROFILE_IMAGE, "이미지 저장에 실패했습니다: " + e.getMessage());
        }
        return baseUrl + "/" + filename;
    }

    // 소셜 플랫폼이 준 외부 URL(우리가 저장한 파일이 아님)은 지우지 않도록, 로컬 baseUrl로 시작하는 경우에만
    // 로컬 삭제를 한다. 기존 로컬 파일 URL은 backend 설정과 무관하게 항상 이 경로로 지워져야 하므로(과거에
    // 업로드된 회원 데이터가 azure-blob으로 전환한 뒤에도 여전히 로컬 baseUrl을 가리키고 있을 수 있음),
    // startsWith(baseUrl) 판별을 backend 분기보다 먼저 한다 — 그 외의 URL은 우리가 저장한 Blob으로 간주한다.
    public void delete(String profileImageUrl) {
        if (profileImageUrl == null) {
            return;
        }
        if (profileImageUrl.startsWith(baseUrl + "/")) {
            String filename = profileImageUrl.substring((baseUrl + "/").length());
            try {
                Files.deleteIfExists(uploadDir.resolve(filename));
            } catch (IOException ignored) {
                // 정리 실패는 치명적이지 않음(디스크에 고아 파일 하나 남는 정도) — 삭제 자체를 실패시키지 않는다.
            }
            return;
        }
        String blobFilename = extractBlobFilename(profileImageUrl);
        if (blobFilename != null) {
            azureBlobStorage.delete(BLOB_CONTAINER, blobFilename);
        }
    }

    private boolean isAzureBlobBackend() {
        return "azure-blob".equalsIgnoreCase(storageBackend);
    }

    // Blob URL(https://{account}.blob.core.windows.net/{container}/{filename})의 마지막 경로 구간을
    // 파일명으로 본다 — store()가 만드는 파일명이 UUID + 확장자라 경로 구분자가 섞일 일이 없어 안전하다.
    private String extractBlobFilename(String blobUrl) {
        int idx = blobUrl.lastIndexOf('/');
        if (idx < 0 || idx == blobUrl.length() - 1) {
            return null;
        }
        return blobUrl.substring(idx + 1);
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
        String ext = idx >= 0 ? originalFilename.substring(idx).toLowerCase() : "";
        return ALLOWED_EXTENSIONS.contains(ext) ? ext : "";
    }
}
