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
 * 리뷰 사진(2026-08-10 추가) 파일을 저장한다. RestaurantImageStorageService/ReceiptImageStorageService와
 * 완전히 같은 패턴(과한 공통화보다 단순함 우선 — 이 프로젝트가 계속 써온 판단).
 * Azure Blob Storage 마이그레이션(2026-08-18) — image-storage.backend에 따라 로컬 디스크/Azure Blob
 * 두 백엔드를 지원(기본값은 local). SDK 호출부는 AzureBlobStorage로 공유.
 */
@Component
public class ReviewImageStorageService {

    // Azure Blob Storage 컨테이너 이름 — 기존 로컬 upload-dir(review-images 폴더)과 1:1로 대응.
    private static final String BLOB_CONTAINER = "review-images";

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/gif", "image/webp");
    // 경로 조작 방지(2026-08-10) — extractExtension()이 반환할 수 있는 값을 화이트리스트로 제한한다.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    private final Path uploadDir;
    private final String baseUrl;
    private final long maxSizeBytes;
    private final String storageBackend;
    private final AzureBlobStorage azureBlobStorage;

    public ReviewImageStorageService(@Value("${review-image.upload-dir}") String uploadDir,
                                      @Value("${review-image.base-url}") String baseUrl,
                                      @Value("${review-image.max-size-bytes:5242880}") long maxSizeBytes,
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
            throw new IllegalStateException("리뷰 사진 저장 디렉터리를 만들 수 없습니다: " + this.uploadDir, e);
        }
    }

    public String store(MultipartFile file) {
        validate(file);
        String filename = UUID.randomUUID() + extractExtension(file.getOriginalFilename());
        if (isAzureBlobBackend()) {
            return azureBlobStorage.upload(BLOB_CONTAINER, filename, file, ErrorCode.INVALID_REVIEW_IMAGE);
        }
        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException(ErrorCode.INVALID_REVIEW_IMAGE, "이미지 저장에 실패했습니다: " + e.getMessage());
        }
        return baseUrl + "/" + filename;
    }

    // 로컬 baseUrl로 시작하면 기존 로컬 삭제(과거에 업로드된 파일이 backend 전환 후에도 로컬 baseUrl을
    // 가리킬 수 있어 backend 설정과 무관하게 우선 판별), 그 외 URL은 우리가 저장한 Blob으로 간주한다.
    public void delete(String imageUrl) {
        if (imageUrl == null) {
            return;
        }
        if (imageUrl.startsWith(baseUrl + "/")) {
            String filename = imageUrl.substring((baseUrl + "/").length());
            try {
                Files.deleteIfExists(uploadDir.resolve(filename));
            } catch (IOException ignored) {
                // 정리 실패는 치명적이지 않음(디스크에 고아 파일 하나 남는 정도) — 삭제 자체를 실패시키지 않는다.
            }
            return;
        }
        String blobFilename = extractBlobFilename(imageUrl);
        if (blobFilename != null) {
            azureBlobStorage.delete(BLOB_CONTAINER, blobFilename);
        }
    }

    private boolean isAzureBlobBackend() {
        return "azure-blob".equalsIgnoreCase(storageBackend);
    }

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
            throw new CustomException(ErrorCode.INVALID_REVIEW_IMAGE,
                    "이미지 파일 용량은 " + (maxSizeBytes / (1024 * 1024)) + "MB를 초과할 수 없습니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new CustomException(ErrorCode.INVALID_REVIEW_IMAGE, "지원하지 않는 이미지 형식입니다(jpg/png/gif/webp만 가능).");
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
