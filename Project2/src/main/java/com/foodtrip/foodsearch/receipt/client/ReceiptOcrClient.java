package com.foodtrip.foodsearch.receipt.client;

import java.net.http.HttpClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
 * 영수증 OCR 연동(08 영수증OCR, 001-02 4장). 사업자등록증명원 검증(01(회원가입))과 같은 Python(FastAPI)
 * 서버(receipt-biz-verify)의 다른 라우터(POST /parse-receipt)를 호출한다 — 같은 서버라 base-url도
 * BusinessVerificationClient와 동일한 설정값(business-verify.base-url)을 그대로 재사용한다.
 * 평문 HTTP 내부 서버 연동 시 JDK HttpClient의 기본 HTTP/2 업그레이드 시도로 요청이 깨지는 문제를 여러
 * 차례 겪었던 것과 같은 이유로(01/07 문서에 기록됨) HTTP/1.1을 명시적으로 강제한다.
 */
@Component
public class ReceiptOcrClient {

    private static final Logger log = LoggerFactory.getLogger(ReceiptOcrClient.class);

    private final RestClient restClient;

    public ReceiptOcrClient(@Value("${business-verify.base-url}") String baseUrl) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    public ReceiptOcrResult parse(MultipartFile file) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        try {
            MediaType contentType = file.getContentType() != null
                    ? MediaType.parseMediaType(file.getContentType())
                    : MediaType.APPLICATION_OCTET_STREAM;
            builder.part("file", file.getResource())
                    .filename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "receipt")
                    .contentType(contentType);
        } catch (Exception e) {
            log.warn("영수증 파일을 읽는 중 오류", e);
            throw new CustomException(ErrorCode.INVALID_INPUT, "영수증 파일을 읽을 수 없습니다.");
        }

        Map<String, Object> body;
        try {
            body = restClient.post()
                    .uri("/parse-receipt")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(builder.build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {
                    });
        } catch (RestClientResponseException e) {
            throw mapErrorResponse(e);
        } catch (RestClientException e) {
            // 원인(연결 거부, 타임아웃 등) 내부 예외 메시지는 사용자에게 그대로 노출하지 않고 로그로만
            // 남긴다(2026-08-05 — business_auth.py의 serviceKey 노출 건과 같은 종류의 문제 방지).
            log.warn("영수증 인식 서버와 통신 실패", e);
            throw new CustomException(ErrorCode.RECEIPT_OCR_SERVICE_UNAVAILABLE);
        }

        if (body == null) {
            throw new CustomException(ErrorCode.RECEIPT_OCR_SERVICE_UNAVAILABLE, "영수증 인식 서버 응답이 비어 있습니다.");
        }
        return toResult(body);
    }

    // Python 서버의 { "error": "CODE", "message": "...", "parsed": {...} } 형식을 그대로 우리 ErrorCode로
    // 매핑한다(001-02 7장 표). 부분 인식 결과("parsed")는 CustomException이 추가 페이로드를 담는 구조가
    // 아니라서 이번엔 넘기지 않는다(001-03에서 필요성이 실제로 확인되면 그때 CustomException 확장 검토).
    private CustomException mapErrorResponse(RestClientResponseException e) {
        String code = null;
        // Python 서버가 직접 내려준 message만 사용자에게 보여준다(그쪽이 이미 사용자 노출을 염두에 두고
        // 작성한 문구라 안전함) — HTTP 예외 자체의 e.getMessage()(상태줄 등 내부 정보)는 그대로 노출하지
        // 않는다(2026-08-05). 파싱 실패/필드 없음이면 null로 두고 ErrorCode 기본 메시지를 쓴다.
        String message = null;
        try {
            Map<String, Object> errorBody = e.getResponseBodyAs(new ParameterizedTypeReference<Map<String, Object>>() {
            });
            if (errorBody != null) {
                code = String.valueOf(errorBody.get("error"));
                Object rawMessage = errorBody.get("message");
                if (rawMessage != null) message = String.valueOf(rawMessage);
            }
        } catch (Exception parseFailure) {
            log.warn("영수증 인식 서버 오류 응답 파싱 실패", parseFailure);
        }

        ErrorCode errorCode = switch (String.valueOf(code)) {
            case "EMPTY_FILE" -> ErrorCode.RECEIPT_EMPTY_FILE;
            case "INVALID_IMAGE" -> ErrorCode.RECEIPT_INVALID_IMAGE;
            case "NO_TEXT_DETECTED" -> ErrorCode.RECEIPT_NO_TEXT_DETECTED;
            case "RECEIPT_PARSE_FAILED" -> ErrorCode.RECEIPT_PARSE_FAILED;
            case "STORE_NAME_NOT_FOUND" -> ErrorCode.RECEIPT_STORE_NAME_NOT_FOUND;
            case "ORDER_DATETIME_NOT_FOUND" -> ErrorCode.RECEIPT_ORDER_DATETIME_NOT_FOUND;
            case "TRANSACTION_ID_NOT_FOUND" -> ErrorCode.RECEIPT_TRANSACTION_ID_NOT_FOUND;
            default -> ErrorCode.RECEIPT_OCR_SERVICE_UNAVAILABLE;
        };
        return message != null ? new CustomException(errorCode, message) : new CustomException(errorCode);
    }

    @SuppressWarnings("unchecked")
    private ReceiptOcrResult toResult(Map<String, Object> body) {
        String storeName = (String) body.get("store_name");
        String orderDatetime = (String) body.get("order_datetime");
        Integer totalPrice = body.get("total_price") != null ? ((Number) body.get("total_price")).intValue() : null;
        String transactionId = (String) body.get("transaction_id");

        List<ReceiptOcrResult.MenuItemResult> menuItems = new ArrayList<>();
        Object menuItemsRaw = body.get("menu_items");
        if (menuItemsRaw instanceof List<?> list) {
            for (Object itemRaw : list) {
                Map<String, Object> item = (Map<String, Object>) itemRaw;
                String name = (String) item.get("name");
                Integer price = item.get("price") != null ? ((Number) item.get("price")).intValue() : null;
                menuItems.add(new ReceiptOcrResult.MenuItemResult(name, price));
            }
        }
        return new ReceiptOcrResult(storeName, orderDatetime, menuItems, totalPrice, transactionId);
    }
}
