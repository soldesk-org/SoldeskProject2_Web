package com.foodtrip.foodsearch.receipt.service;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.common.storage.ReceiptImageStorageService;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.receipt.client.ReceiptOcrClient;
import com.foodtrip.foodsearch.receipt.client.ReceiptOcrResult;
import com.foodtrip.foodsearch.receipt.dto.ReceiptItemResponseDto;
import com.foodtrip.foodsearch.receipt.dto.ReceiptUploadResponseDto;
import com.foodtrip.foodsearch.receipt.entity.Receipt;
import com.foodtrip.foodsearch.receipt.repository.ReceiptRepository;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchClient;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchItem;
import com.foodtrip.foodsearch.restaurant.entity.Restaurant;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 이 클래스는 의도적으로 클래스 전체를 @Transactional로 감싸지 않는다 — 예전엔 그렇게 했다가,
// OCR 실패 시 CustomException을 던지는 순간 그 안에서 미리 저장해둔 "실패 기록"까지 같은 트랜잭션으로
// 묶여 통째로 롤백돼버리는 버그를 2026-07-21 실데이터 테스트(빈 이미지 업로드 후 DB에 실패 로그가
// 하나도 안 남는 것)로 실제 발견했다. 대신 각 단계를 독립 트랜잭션으로 커밋되는 작은 컴포넌트
// (ReceiptFailureRecorder/ReceiptSuccessRecorder)로 쪼개서, 이 클래스는 그것들을 순서대로 호출하는
// 오케스트레이션만 담당한다.
@Service
public class ReceiptServiceImpl implements ReceiptService {

    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter DATE_ONLY_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final ReceiptRepository receiptRepository;
    private final RestaurantRepository restaurantRepository;
    private final ReceiptImageStorageService receiptImageStorageService;
    private final ReceiptOcrClient receiptOcrClient;
    private final ReceiptFailureRecorder receiptFailureRecorder;
    private final ReceiptSuccessRecorder receiptSuccessRecorder;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;
    private final KakaoLocalSearchClient kakaoLocalSearchClient;

    public ReceiptServiceImpl(ReceiptRepository receiptRepository,
                               RestaurantRepository restaurantRepository,
                               ReceiptImageStorageService receiptImageStorageService,
                               ReceiptOcrClient receiptOcrClient,
                               ReceiptFailureRecorder receiptFailureRecorder,
                               ReceiptSuccessRecorder receiptSuccessRecorder,
                               JwtProvider jwtProvider,
                               AccessTokenSessionService accessTokenSessionService,
                               KakaoLocalSearchClient kakaoLocalSearchClient) {
        this.receiptRepository = receiptRepository;
        this.restaurantRepository = restaurantRepository;
        this.receiptImageStorageService = receiptImageStorageService;
        this.receiptOcrClient = receiptOcrClient;
        this.receiptFailureRecorder = receiptFailureRecorder;
        this.receiptSuccessRecorder = receiptSuccessRecorder;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
        this.kakaoLocalSearchClient = kakaoLocalSearchClient;
    }

    @Override
    public ReceiptUploadResponseDto uploadAndParse(String authorizationHeader, String restaurantId,
                                                    String restaurantName, MultipartFile image) {
        Long memberId = resolveMemberId(authorizationHeader);
        // 2026-07-21: 음식점 상호명을 더 이상 DB에 저장해두지 않으므로(카카오 운영정책, 001-05 참고),
        // 매칭 판정에 쓸 상호명은 프론트가 검색 결과에서 이미 들고 있는 값을 함께 받는다. 부가정보 행이
        // 없으면(이 음식점을 처음 건드리는 경우) 이 시점에 만든다.
        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId)
                .orElseGet(() -> restaurantRepository.save(Restaurant.createExtras(restaurantId)));

        // 2026-08-10 보안 수정 — OCR이 거래번호를 못 읽는 영수증(예: 그 영역을 가리거나 지운 사진)은
        // 기존 중복 검사(transaction_id)를 아예 안 거쳐서, 같은 사진을 반복 업로드해 여러 개의 "인증된"
        // 영수증을 만들 수 있었다. transaction_id 인식 여부와 무관하게 이미지 바이트 자체의 해시로도
        // 중복을 막는다 — OCR 호출/저장 전에 먼저 확인해 낭비도 줄인다.
        String imageHash = hashImage(image);
        if (imageHash != null && receiptRepository.existsByImageHash(imageHash)) {
            throw new CustomException(ErrorCode.DUPLICATE_RECEIPT);
        }

        String imagePath = receiptImageStorageService.store(image);
        // 별도 트랜잭션으로 즉시 커밋 — 이후 단계가 실패해도 "시도했다"는 기록 자체는 남는다.
        Receipt receipt = receiptRepository.save(Receipt.createPending(memberId, imagePath, imageHash));

        long startedAt = System.currentTimeMillis();
        ReceiptOcrResult result;
        try {
            result = receiptOcrClient.parse(image);
        } catch (CustomException e) {
            receiptFailureRecorder.record(receipt.getReceiptId(), e.getMessage(), System.currentTimeMillis() - startedAt);
            throw e;
        }

        // 중복 검사(001-02 5장 6단계) — 어뷰징 방지. transaction_id를 못 찾은 경우(null)는 막지 않는다.
        if (result.transactionId() != null && receiptRepository.existsByTransactionId(result.transactionId())) {
            receiptFailureRecorder.record(receipt.getReceiptId(), "duplicate transactionId", System.currentTimeMillis() - startedAt);
            throw new CustomException(ErrorCode.DUPLICATE_RECEIPT);
        }

        LocalDateTime parsedPaymentDate = parseDateTime(result.orderDatetime());
        // 2026-08-10 보안 수정 — 예전엔 클라이언트가 보낸 restaurantName을 그대로 신뢰해서 비교했는데,
        // 공격자가 restaurantId(리뷰를 남길 대상)와 restaurantName(자기가 올린 영수증 내용에 맞춘 값)을
        // 서로 무관하게 따로 조작할 수 있었다(예: 전혀 다른 가게 영수증을 올리면서 그 영수증에 찍힌
        // 이름을 restaurantName으로 그대로 보내면 항상 매칭 성공). 카카오에서 이 restaurantId가 실제로
        // 그 이름인지 다시 확인한 값으로만 비교한다.
        String trustedRestaurantName = resolveTrustedRestaurantName(restaurantId, restaurantName);
        boolean verified = trustedRestaurantName != null && matchesRestaurant(result.storeName(), trustedRestaurantName);
        long processingTimeMs = System.currentTimeMillis() - startedAt;
        receiptSuccessRecorder.record(receipt.getReceiptId(), result, rawJsonOf(result), parsedPaymentDate,
                verified, restaurantId, processingTimeMs);

        // 2026-08-06 추가 - 저장 시점(ReceiptSuccessRecorder)에서만 걸러내고 이 업로드 응답은 원본
        // OCR 결과를 그대로 보여주고 있어서, "lo 8원" 같은 무의미한 항목이 화면(step2)에는 계속 남아있던
        // 문제가 있었다. 같은 판정(MenuItemResult.isPlausible())을 여기도 적용해 화면과 DB를 일치시킨다.
        List<ReceiptItemResponseDto> menuItems = result.menuItems().stream()
                .filter(ReceiptOcrResult.MenuItemResult::isPlausible)
                .map(item -> new ReceiptItemResponseDto(item.name(), item.price()))
                .collect(Collectors.toList());

        return new ReceiptUploadResponseDto(receipt.getReceiptId(), result.storeName(), result.orderDatetime(),
                result.totalPrice(), menuItems, verified, verified ? restaurantId : null);
    }

    // 이미지 바이트의 SHA-256 해시(2026-08-10 추가, 중복 영수증 검사 보조용). 계산 실패는 치명적이지
    // 않으므로(해시 없이도 기존 transaction_id 검사는 그대로 동작) null을 반환해 그냥 건너뛴다.
    private String hashImage(MultipartFile image) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(image.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (IOException | NoSuchAlgorithmException e) {
            return null;
        }
    }

    // restaurantId가 실제로 카카오 상에서 restaurantName(클라이언트가 준 검색 힌트)에 해당하는지 다시
    // 확인하고, 확인되면 카카오가 직접 준 상호명을 돌려준다(2026-08-10 보안 수정). 카카오가 place id
    // 단건 재조회를 지원하지 않아 tryAutoClaim()/claimByRestaurantId()와 동일하게 키워드 검색 결과에서
    // id로 찾는다. 못 찾으면 null(=인증 불가로 처리).
    private String resolveTrustedRestaurantName(String restaurantId, String restaurantName) {
        if (restaurantName == null || restaurantName.isBlank()) {
            return null;
        }
        try {
            List<KakaoLocalSearchItem> items = kakaoLocalSearchClient.searchByKeyword(restaurantName);
            for (KakaoLocalSearchItem item : items) {
                if (item.id().equals(restaurantId)) {
                    return item.placeName();
                }
            }
        } catch (CustomException e) {
            // 카카오 호출 실패 시 검증 불가 — 인증 리뷰 오남용을 막는 쪽이 우선이라 실패로 처리한다.
        }
        return null;
    }

    // 정규화(공백 제거) 후 완전 일치 또는 양방향 부분 문자열 포함이면 방문 인증 성공으로 판단한다
    // (001-02 5장 7단계/8장 — 07(음식점-메뉴-검색)의 카테고리/주소 매칭과 같은 톤이지만, 리뷰 인증은
    // 오탐 시 신뢰도 문제가 더 커서 나중에 더 엄격한 기준으로 좁혀질 수 있는 잠정 규칙).
    private boolean matchesRestaurant(String ocrStoreName, String restaurantName) {
        if (ocrStoreName == null || ocrStoreName.isBlank() || restaurantName == null || restaurantName.isBlank()) {
            return false;
        }
        String normalizedOcr = ocrStoreName.replaceAll("\\s", "");
        String normalizedRestaurant = restaurantName.replaceAll("\\s", "");
        return normalizedOcr.equals(normalizedRestaurant)
                || normalizedOcr.contains(normalizedRestaurant)
                || normalizedRestaurant.contains(normalizedOcr);
    }

    // Python 서버가 OCR 원본 텍스트 줄은 안 주고 구조화된 파싱 결과만 주기 때문에(001-01 참고),
    // ocr_raw_text에는 그 파싱 결과 JSON을 그대로 남긴다(001-02 3장) — 나중에 재검토할 최소한의 근거.
    private String rawJsonOf(ReceiptOcrResult result) {
        return "{\"storeName\":\"" + safe(result.storeName()) + "\","
                + "\"orderDatetime\":\"" + safe(result.orderDatetime()) + "\","
                + "\"totalPrice\":" + result.totalPrice() + ","
                + "\"transactionId\":\"" + safe(result.transactionId()) + "\"}";
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\"", "'");
    }

    // Python 서버가 "yyyy-MM-dd HH:mm" 또는(시간을 못 찾으면) "yyyy-MM-dd"만 줄 수 있어(001-01 참고)
    // 두 포맷을 순서대로 시도한다 — 둘 다 실패하면 null로 남기고 저장 자체는 계속 진행한다.
    private LocalDateTime parseDateTime(String orderDatetime) {
        if (orderDatetime == null || orderDatetime.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(orderDatetime, DATETIME_FORMAT);
        } catch (DateTimeParseException ignored) {
            // 시간 없이 날짜만 온 경우 아래에서 재시도
        }
        try {
            return java.time.LocalDate.parse(orderDatetime, DATE_ONLY_FORMAT).atStartOfDay();
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    // 07(음식점-메뉴-검색) RestaurantOwnerServiceImpl.resolveMemberId()와 동일한 로직 — 패키지가 달라
    // private 헬퍼를 공유할 수 없어 그대로 복제했다(그 문서 2장에서 확정한 것과 같은 이유).
    private Long resolveMemberId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        Claims claims;
        try {
            claims = jwtProvider.parseClaims(accessToken);
        } catch (JwtException e) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        if (!accessTokenSessionService.isActive(claims.getId())) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        return Long.valueOf(claims.getSubject());
    }
}
