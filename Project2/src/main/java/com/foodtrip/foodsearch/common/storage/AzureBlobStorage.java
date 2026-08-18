package com.foodtrip.foodsearch.common.storage;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

/**
 * Azure Blob Storage 마이그레이션(2026-08-18 추가) — 4개의 *ImageStorageService(profile/receipt/
 * review/restaurant)가 로컬 디스크 저장 코드는 거의 그대로 복제해도 괜찮다고 판단해온 것과 달리,
 * Azure SDK 호출부(BlobServiceClient 생성/업로드/삭제)는 컨테이너 이름만 다르고 완전히 동일한 코드라
 * 4번 복붙하지 않고 이 클래스 하나로 공유한다. 각 *ImageStorageService는 여전히 자기 컨테이너 이름을
 * 알고 있는 얇은 래퍼로 남고, 실제 SDK 호출은 전부 여기로 위임한다.
 *
 * AZURE_STORAGE_CONNECTION_STRING이 비어있어도(이 워크트리처럼 아직 실제 Azure 계정이 없는 경우 포함)
 * 서버가 정상 기동해야 한다는 이 프로젝트의 원칙(business-verify.internal-token, PARKING_DATA_SERVICE_KEY
 * 등과 동일) 때문에, BlobServiceClient를 생성자에서 즉시 만들지 않는다 — 연결 문자열이 있어도 실제로
 * 처음 store()/delete()가 호출되는 시점에 지연 생성(lazy init)하고, 없으면 AZURE_STORAGE_NOT_CONFIGURED로
 * 명확하게 실패시킨다(기동 시점이 아니라 실제 호출 시점에만).
 */
@Component
public class AzureBlobStorage {

    private final String connectionString;
    private volatile BlobServiceClient serviceClient;

    public AzureBlobStorage(@Value("${azure-storage.connection-string:}") String connectionString) {
        this.connectionString = connectionString;
    }

    public boolean isConfigured() {
        return connectionString != null && !connectionString.isBlank();
    }

    private BlobServiceClient client() {
        if (!isConfigured()) {
            throw new CustomException(ErrorCode.AZURE_STORAGE_NOT_CONFIGURED);
        }
        BlobServiceClient client = serviceClient;
        if (client == null) {
            synchronized (this) {
                client = serviceClient;
                if (client == null) {
                    client = new BlobServiceClientBuilder().connectionString(connectionString).buildClient();
                    serviceClient = client;
                }
            }
        }
        return client;
    }

    /**
     * containerName 컨테이너에 file을 filename으로 업로드하고, 업로드된 blob의 URL을 반환한다.
     * 컨테이너가 아직 없으면 자동으로 만든다(사업자가 Azure Portal에서 미리 만들어둘 필요 없이,
     * 컨테이너 이름당 한 번씩만 이 분기를 타고 이후엔 exists() 체크만 함).
     */
    public String upload(String containerName, String filename, MultipartFile file, ErrorCode failureErrorCode) {
        BlobContainerClient container = client().getBlobContainerClient(containerName);
        if (!container.exists()) {
            container.createIfNotExists();
        }
        BlobClient blob = container.getBlobClient(filename);
        try {
            blob.upload(file.getInputStream(), file.getSize(), true);
        } catch (IOException e) {
            throw new CustomException(failureErrorCode, "이미지 저장에 실패했습니다: " + e.getMessage());
        } catch (UncheckedIOException e) {
            throw new CustomException(failureErrorCode, "이미지 저장에 실패했습니다: " + e.getMessage());
        }
        return blob.getBlobUrl();
    }

    // 삭제 실패는 로컬 디스크 삭제와 마찬가지로 치명적이지 않다(Blob 하나 고아로 남는 정도) — 연결 문자열이
    // 없거나 이미 지워진 blob이어도 예외를 던지지 않고 조용히 넘어간다.
    public void delete(String containerName, String filename) {
        if (!isConfigured()) {
            return;
        }
        try {
            client().getBlobContainerClient(containerName).getBlobClient(filename).deleteIfExists();
        } catch (RuntimeException ignored) {
            // 정리 실패는 치명적이지 않음 — 삭제 자체를 실패시키지 않는다.
        }
    }
}
