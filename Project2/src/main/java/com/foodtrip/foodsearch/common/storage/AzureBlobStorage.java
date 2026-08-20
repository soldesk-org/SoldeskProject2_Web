package com.foodtrip.foodsearch.common.storage;

import java.io.IOException;
import java.io.UncheckedIOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.azure.identity.ManagedIdentityCredential;
import com.azure.identity.ManagedIdentityCredentialBuilder;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.PublicAccessType;
import com.azure.storage.blob.options.BlobContainerCreateOptions;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

/**
 * Azure Blob Storage 마이그레이션(2026-08-18 추가) — 4개의 *ImageStorageService(profile/receipt/
 * review/restaurant)가 로컬 디스크 저장 코드는 거의 그대로 복제해도 괜찮다고 판단해온 것과 달리,
 * Azure SDK 호출부(BlobServiceClient 생성/업로드/삭제)는 컨테이너 이름만 다르고 완전히 동일한 코드라
 * 4번 복붙하지 않고 이 클래스 하나로 공유한다. 각 *ImageStorageService는 여전히 자기 컨테이너 이름을
 * 알고 있는 얇은 래퍼로 남고, 실제 SDK 호출은 전부 여기로 위임한다.
 *
 * 2026-08-18 2차 수정 — 처음엔 연결 문자열(계정 키) 방식으로 만들었는데, 실제 배포해서 업로드해보니
 * 계정 자체의 "키 액세스 허용" 토글은 켜져 있어도 모든 요청이 AuthorizationFailure(403)로 거부됐다.
 * 원인은 이 Azure 구독(크레딧/스폰서)에 걸려있는 "로컬 인증(계정 키/SAS) 금지, Azure AD만 허용" 정책 —
 * Azure Portal(Entra ID 세션 인증)로는 컨테이너가 정상 생성되는데 계정 키로는 안 되는 것으로 실측 확인.
 * 그래서 인증 방식을 VM의 시스템 관리 ID(Managed Identity)를 통한 Azure AD 인증으로 전환했다 — VM에
 * 관리 ID를 켜고 스토리지 계정에 "Storage Blob Data Contributor" 역할을 그 ID에 할당해둬야 동작한다
 * (docs/00.공통/인프라/Azure-Blob-Storage-이미지저장-가이드.md 참고). 이 방식은 계정 키 자체가 아예
 * 필요 없어져서(유출 위험 원천 차단) 오히려 더 안전하다.
 *
 * AZURE_STORAGE_ACCOUNT_URL이 비어있어도(이 워크트리처럼 아직 실제 Azure 계정이 없는 경우 포함) 서버가
 * 정상 기동해야 한다는 이 프로젝트의 원칙(business-verify.internal-token, PARKING_DATA_SERVICE_KEY 등과
 * 동일) 때문에, BlobServiceClient를 생성자에서 즉시 만들지 않는다 — 값이 있어도 실제로 처음
 * store()/delete()가 호출되는 시점에 지연 생성(lazy init)하고, 없으면 AZURE_STORAGE_NOT_CONFIGURED로
 * 명확하게 실패시킨다(기동 시점이 아니라 실제 호출 시점에만). ManagedIdentityCredential 자체도 실제로는
 * VM 위에서만 동작하므로(로컬 개발 PC에는 관리 ID가 없음), 로컬 개발 환경에서는 이 기능을 그냥 안 쓰면
 * 된다(backend=local이 기본값).
 */
@Component
public class AzureBlobStorage {

    private final String accountUrl;
    // 2026-08-21 추가 — Azure CDN/Front Door로 images.eattyway.com 같은 자체 도메인을 씌웠을 때,
    // 응답에 나가는 URL도 원본 blob.core.windows.net 대신 그 도메인으로 내보내기 위한 값.
    // 비어있으면(기본값) 지금까지처럼 원본 blob URL을 그대로 쓴다 — CDN을 아직 안 붙인 환경에서도
    // 아무 영향 없이 그대로 동작해야 한다는 원칙(AZURE_STORAGE_ACCOUNT_URL과 동일한 이유).
    private final String publicBaseUrl;
    private volatile BlobServiceClient serviceClient;

    public AzureBlobStorage(@Value("${azure-storage.account-url:}") String accountUrl,
                             @Value("${azure-storage.public-base-url:}") String publicBaseUrl) {
        this.accountUrl = accountUrl;
        this.publicBaseUrl = publicBaseUrl;
    }

    public boolean isConfigured() {
        return accountUrl != null && !accountUrl.isBlank();
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
                    ManagedIdentityCredential credential = new ManagedIdentityCredentialBuilder().build();
                    client = new BlobServiceClientBuilder().endpoint(accountUrl).credential(credential).buildClient();
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
     * createIfNotExists()를 인자 없이 호출하면 Azure SDK 기본값(비공개 컨테이너)으로 만들어져서,
     * 스토리지 계정에서 "Blob 익명 액세스"를 켜도 실제로는 이미지가 403으로 막힌다 — 반드시
     * PublicAccessType.BLOB(익명 Blob 읽기만 허용, 컨테이너 목록 나열은 막힘)을 명시해야 한다.
     */
    public String upload(String containerName, String filename, MultipartFile file, ErrorCode failureErrorCode) {
        BlobContainerClient container = client().getBlobContainerClient(containerName);
        if (!container.exists()) {
            container.createIfNotExistsWithResponse(
                    new BlobContainerCreateOptions().setPublicAccessType(PublicAccessType.BLOB), null, null);
        }
        BlobClient blob = container.getBlobClient(filename);
        try {
            blob.upload(file.getInputStream(), file.getSize(), true);
        } catch (IOException e) {
            throw new CustomException(failureErrorCode, "이미지 저장에 실패했습니다: " + e.getMessage());
        } catch (UncheckedIOException e) {
            throw new CustomException(failureErrorCode, "이미지 저장에 실패했습니다: " + e.getMessage());
        }
        return toPublicUrl(blob.getBlobUrl());
    }

    // 원본 blob URL(https://{계정}.blob.core.windows.net/{컨테이너}/{파일})의 스킴+호스트만
    // publicBaseUrl로 바꿔치기하고, 경로(컨테이너/파일명)는 그대로 유지한다. CDN 오리진이 이
    // 스토리지 계정 그대로라 경로 구조가 똑같아야 한다.
    private String toPublicUrl(String blobUrl) {
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return blobUrl;
        }
        int pathStart = blobUrl.indexOf('/', "https://".length());
        String path = pathStart >= 0 ? blobUrl.substring(pathStart) : "";
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + path;
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
