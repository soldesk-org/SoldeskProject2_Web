package com.foodtrip.foodsearch.business.client;

import java.net.http.HttpClient;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

/**
 * 사업자등록증명원 OCR + 원본확인(홈택스) + 진위확인(국세청 API)을 수행하는 Python(FastAPI) 서버 연동.
 * 서버 코드는 이 프로젝트가 아니라 별도 저장소(receipt-biz-verify)에 이미 구현되어 있으며,
 * 여기서는 그 서버의 POST /verify 엔드포인트를 그대로 호출만 한다.
 *
 * 평문 HTTP(TLS 아님) 내부 서버라서 JDK HttpClient 기본값(HTTP/2 우선, h2c 업그레이드 시도)을 그대로 쓰면
 * uvicorn 개발 서버가 그 업그레이드 요청을 못 받아들여 요청이 깨질 수 있다(2026-07-20 다른 평문 HTTP
 * Python 서버 연동 중 실제로 재현/확인된 문제). 같은 이유로 이 클라이언트도 HTTP/1.1을 명시적으로 강제해서 예방한다.
 */
@Component
public class BusinessVerificationClient {

    private final RestClient restClient;

    public BusinessVerificationClient(@Value("${business-verify.base-url}") String baseUrl,
                                       @Value("${business-verify.internal-token:}") String internalToken) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(new JdkClientHttpRequestFactory(httpClient));
        // api.eattyway.com이 우리 백엔드를 거치지 않은 직접 호출을 거부하도록 공유 비밀 헤더를 붙인다
        // (2026-08-08, Python main.py의 검증 미들웨어와 짝). 로컬 개발처럼 토큰이 비어있으면 헤더 자체를
        // 안 보내고, Python 쪽도 토큰 미설정 시 검사를 건너뛴다(fail-open).
        if (!internalToken.isBlank()) {
            builder.defaultHeader("X-Internal-Token", internalToken);
        }
        this.restClient = builder.build();
    }

    public BusinessVerificationResult verify(MultipartFile file) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        try {
            MediaType contentType = file.getContentType() != null
                    ? MediaType.parseMediaType(file.getContentType())
                    : MediaType.APPLICATION_OCTET_STREAM;
            builder.part("file", file.getResource())
                    .filename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "business_license")
                    .contentType(contentType);
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "사업자등록증명원 파일을 읽을 수 없습니다: " + e.getMessage());
        }

        Map<String, Object> body;
        try {
            body = restClient.post()
                    .uri("/verify")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(builder.build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {
                    });
        } catch (RestClientResponseException e) {
            // 사업자 인증 서버는 검증 실패 시 4xx로 {"status"/"error": "...", "message": "..."} 형태를 반환한다.
            String message = extractErrorMessage(e);
            throw new CustomException(ErrorCode.BUSINESS_VERIFICATION_FAILED, message);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.BUSINESS_VERIFY_SERVICE_UNAVAILABLE,
                    "사업자 인증 서버와 통신할 수 없습니다: " + e.getMessage());
        }

        if (body == null || !"SUCCESS".equals(String.valueOf(body.get("status")))) {
            String message = body != null ? String.valueOf(body.getOrDefault("message", "사업자등록증명원 검증에 실패했습니다."))
                    : "사업자 인증 서버 응답이 비어 있습니다.";
            throw new CustomException(ErrorCode.BUSINESS_VERIFICATION_FAILED, message);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> extracted = (Map<String, Object>) body.get("extracted");
        // address는 Python 쪽 Gemini 추출 스키마에 이미 있던 필드였는데(business_auth.py _EXTRACTION_PROMPT
        // 참고) 이쪽에서 안 읽고 버리고 있었음(2026-07-20 발견) — 사업장 주소 자동귀속(07 기능)에 필요해
        // 읽어오도록 추가. 빈 문자열이면 그대로 두고(자동귀속 쪽에서 blank 체크), null이 되지 않게 방어.
        String address = extracted.get("address") != null ? String.valueOf(extracted.get("address")) : "";
        return new BusinessVerificationResult(
                String.valueOf(extracted.get("business_number")),
                String.valueOf(extracted.get("company_name")),
                String.valueOf(extracted.get("representative_name")),
                address,
                formatOpenDate(extracted.get("start_date"))
        );
    }

    // Python 쪽 OCR 추출 스키마는 개업일을 "YYYYMMDD" 8자리로 준다(business_auth.py _EXTRACTION_PROMPT
    // 참고) — 화면에 그대로 붙여넣기 편하게 "YYYY-MM-DD"로 변환한다(2026-08-04 추가, 이전에는 이 필드
    // 자체를 읽지 않고 버리고 있었음).
    private String formatOpenDate(Object rawStartDate) {
        String v = rawStartDate != null ? String.valueOf(rawStartDate) : "";
        if (v.length() != 8 || !v.chars().allMatch(Character::isDigit)) {
            return "";
        }
        return v.substring(0, 4) + "-" + v.substring(4, 6) + "-" + v.substring(6, 8);
    }

    // 2026-08-22 추가 — 증명원 업로드 없이 사업자등록번호만으로 "등록된 번호 + 영업 중인지"를 즉시
    // 확인하는 가벼운 확인(국세청 상태조회 API, business_auth.py의 새 /verify-number). 기존 verify()
    // 는 이름/개업일까지 대조하는 완전한 진위확인이라 증명원 없이는 애초에 호출이 불가능했는데
    // ("증명원을 올려야 진위확인이 된다" 지적), 그 전 단계로 번호만 먼저 가볍게 확인할 수 있게 한다.
    public String checkNumberStatus(String businessNumber) {
        Map<String, Object> body;
        try {
            body = restClient.post()
                    .uri("/verify-number")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("businessNumber", businessNumber))
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {
                    });
        } catch (RestClientResponseException e) {
            throw new CustomException(ErrorCode.BUSINESS_VERIFICATION_FAILED, extractErrorMessage(e));
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.BUSINESS_VERIFY_SERVICE_UNAVAILABLE,
                    "사업자 인증 서버와 통신할 수 없습니다: " + e.getMessage());
        }

        if (body == null || !"SUCCESS".equals(String.valueOf(body.get("status")))) {
            String message = body != null ? String.valueOf(body.getOrDefault("message", "사업자등록번호 확인에 실패했습니다."))
                    : "사업자 인증 서버 응답이 비어 있습니다.";
            throw new CustomException(ErrorCode.BUSINESS_VERIFICATION_FAILED, message);
        }
        return String.valueOf(body.getOrDefault("businessStatus", "계속사업자"));
    }

    private String extractErrorMessage(RestClientResponseException e) {
        try {
            Map<String, Object> errorBody = e.getResponseBodyAs(new ParameterizedTypeReference<Map<String, Object>>() {
            });
            if (errorBody != null && errorBody.get("message") != null) {
                return String.valueOf(errorBody.get("message"));
            }
        } catch (Exception ignored) {
            // 응답 본문을 JSON으로 해석하지 못하면 아래 기본 메시지로 대체한다.
        }
        return "사업자등록증명원 검증에 실패했습니다: " + e.getMessage();
    }
}
