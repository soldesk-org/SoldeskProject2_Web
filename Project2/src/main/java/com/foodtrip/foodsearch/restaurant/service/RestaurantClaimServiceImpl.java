package com.foodtrip.foodsearch.restaurant.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchClient;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchItem;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantCandidateDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantClaimResult;
import com.foodtrip.foodsearch.restaurant.entity.Restaurant;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantManager;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantManagerRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;

/**
 * 사업장 주소 자동귀속(2026-07-20 요구사항 추가, 01(회원가입) 8-4장 / 07(음식점-메뉴-검색) 관련).
 * 2026-07-21 재설계: 예전에는 DB에 저장해둔 음식점 주소와 비교했지만, 이제 음식점 주소 자체를 DB에
 * 저장하지 않으므로(카카오 운영정책, 001-05 참고) 사업장 주소를 카카오 키워드 검색으로 실시간 조회해
 * 후보를 찾는다.
 * 2026-08-07 재설계: 주소만으로는 같은 주소에 여러 상호(예: 1층 A카페/2층 B카페)가 있을 때 구분이
 * 안 되는 문제가 있어, 가게명(회원가입 신규 필수 입력)으로 카카오 키워드 검색을 하고 그 결과 중 주소까지
 * 일치하는 것만 후보로 남긴다. 후보가 정확히 1개일 때만 자동 귀속하고, 0개/여러 개면 귀속하지 않고
 * 그 상태(NOT_FOUND/AMBIGUOUS)와 후보 목록을 회원가입 응답에 실어 보내 프론트가
 * POST /api/business/claim-restaurant로 수동 귀속을 안내할 수 있게 한다(RestaurantClaimResult).
 */
@Service
public class RestaurantClaimServiceImpl implements RestaurantClaimService {

    private static final Logger log = LoggerFactory.getLogger(RestaurantClaimServiceImpl.class);
    private static final int MAX_CANDIDATES = 10;

    private final KakaoLocalSearchClient kakaoLocalSearchClient;
    private final RestaurantRepository restaurantRepository;
    private final RestaurantManagerRepository restaurantManagerRepository;

    public RestaurantClaimServiceImpl(KakaoLocalSearchClient kakaoLocalSearchClient,
                                       RestaurantRepository restaurantRepository,
                                       RestaurantManagerRepository restaurantManagerRepository) {
        this.kakaoLocalSearchClient = kakaoLocalSearchClient;
        this.restaurantRepository = restaurantRepository;
        this.restaurantManagerRepository = restaurantManagerRepository;
    }

    @Override
    @Transactional
    public RestaurantClaimResult tryAutoClaim(Long memberId, Long businessProfileId, String businessAddress,
                                               String storeName) {
        if (businessAddress == null || businessAddress.isBlank()) {
            log.info("사업장 주소가 없어(OCR 미추출) 음식점 자동귀속을 건너뜁니다 (memberId={})", memberId);
            return RestaurantClaimResult.skipped();
        }
        // 가게명은 2026-08-07부터 회원가입 STEP1이 아니라 STEP2(매장 정보)에서 받는다 — STEP1 제출
        // 시점에는 값이 없으므로 여기서는 자동귀속만 건너뛰고, 실제 귀속은 STEP2가 끝난 뒤
        // POST /api/business/claim-restaurant로 처리한다.
        if (storeName == null || storeName.isBlank()) {
            log.info("가게명이 없어(STEP2에서 입력 예정) 음식점 자동귀속을 건너뜁니다 (memberId={})", memberId);
            return RestaurantClaimResult.skipped();
        }
        String normalizedBusinessAddress = normalize(businessAddress);

        List<KakaoLocalSearchItem> candidates;
        try {
            candidates = kakaoLocalSearchClient.searchByKeyword(storeName).stream()
                    .filter(item -> matches(normalizedBusinessAddress, item.addressName())
                            || matches(normalizedBusinessAddress, item.roadAddressName()))
                    .toList();
        } catch (CustomException e) {
            log.warn("카카오 로컬 API 호출에 실패해 음식점 자동귀속을 건너뜁니다 (memberId={})", memberId, e);
            return RestaurantClaimResult.skipped();
        }

        if (candidates.isEmpty()) {
            log.info("가게명+주소가 일치하는 카카오 검색 결과가 없어 자동귀속을 건너뜁니다 (memberId={})", memberId);
            return RestaurantClaimResult.notFound();
        }
        if (candidates.size() > 1) {
            log.warn("가게명+주소가 일치하는 검색 결과가 {}개라 모호해서 자동귀속을 건너뜁니다 (memberId={})",
                    candidates.size(), memberId);
            return RestaurantClaimResult.ambiguous(toCandidateDtos(candidates));
        }

        KakaoLocalSearchItem matched = candidates.get(0);
        claimRestaurant(memberId, businessProfileId, matched.id());
        return RestaurantClaimResult.claimed();
    }

    @Override
    @Transactional
    public void claimByRestaurantId(Long memberId, Long businessProfileId, String businessAddress,
                                     String restaurantId, String candidateAddress, String candidateRoadAddress) {
        if (businessAddress == null || businessAddress.isBlank()) {
            throw new CustomException(ErrorCode.BUSINESS_RESTAURANT_NOT_CLAIMED, "사업장 주소 정보가 없어 매장을 연결할 수 없습니다.");
        }
        String normalizedBusinessAddress = normalize(businessAddress);
        boolean addressOk = matches(normalizedBusinessAddress, candidateAddress)
                || matches(normalizedBusinessAddress, candidateRoadAddress);
        if (!addressOk) {
            throw new CustomException(ErrorCode.RESTAURANT_ADDRESS_MISMATCH);
        }

        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId)
                .orElseGet(() -> restaurantRepository.save(Restaurant.createExtras(restaurantId)));
        if (Restaurant.MANAGEMENT_STATUS_CLAIMED.equals(restaurant.getManagementStatus())) {
            throw new CustomException(ErrorCode.RESTAURANT_ALREADY_CLAIMED);
        }
        if (restaurantManagerRepository.findFirstByMemberIdAndManagerStatus(memberId, RestaurantManager.STATUS_ACTIVE).isPresent()) {
            throw new CustomException(ErrorCode.BUSINESS_RESTAURANT_ALREADY_LINKED);
        }

        claimRestaurant(memberId, businessProfileId, restaurantId);
    }

    private void claimRestaurant(Long memberId, Long businessProfileId, String restaurantId) {
        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId)
                .orElseGet(() -> restaurantRepository.save(Restaurant.createExtras(restaurantId)));
        restaurant.claim();
        restaurantManagerRepository.save(
                RestaurantManager.createOwner(restaurant.getRestaurantId(), businessProfileId, memberId));
        log.info("음식점 귀속 완료 (restaurantId={}, memberId={})", restaurant.getRestaurantId(), memberId);
    }

    private List<RestaurantCandidateDto> toCandidateDtos(List<KakaoLocalSearchItem> items) {
        return items.stream()
                .limit(MAX_CANDIDATES)
                .map(item -> new RestaurantCandidateDto(item.id(), item.placeName(), item.addressName(), item.roadAddressName()))
                .toList();
    }

    private boolean matches(String normalizedBusinessAddress, String candidateAddress) {
        if (candidateAddress == null || candidateAddress.isBlank()) {
            return false;
        }
        String normalizedCandidate = normalize(candidateAddress);
        return normalizedBusinessAddress.contains(normalizedCandidate)
                || normalizedCandidate.contains(normalizedBusinessAddress);
    }

    // 2026-08-09 — 공백만 제거하고 끝나서, 사업자등록증명원(OCR) 주소는 "서울특별시 서초구 ..."처럼
    // 정식 명칭을 쓰는데 카카오는 "서울 서초구 ..."처럼 광역단체명을 줄여서 주는 경우 둘 다 서로의
    // 부분 문자열이 아니게 돼 실제로는 같은 주소인데도 불일치로 판정될 위험이 있었다. 시/도 이름 뒤의
    // 행정구역 접미사를 지워서 두 표기를 같은 형태로 맞춘다.
    private static final java.util.regex.Pattern SIDO_SUFFIX =
            java.util.regex.Pattern.compile("^(서울|부산|대구|인천|광주|대전|울산|세종)(특별시|광역시|특별자치시)?");
    private static final java.util.regex.Pattern DO_SUFFIX =
            java.util.regex.Pattern.compile("^(경기|강원|충북|충남|전북|전남|경북|경남|제주)(특별자치도|도)?");

    private String normalize(String address) {
        String s = address.replaceAll("\\s", "");
        s = SIDO_SUFFIX.matcher(s).replaceFirst("$1");
        s = DO_SUFFIX.matcher(s).replaceFirst("$1");
        return s;
    }
}
