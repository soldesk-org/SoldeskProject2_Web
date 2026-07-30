package com.foodtrip.foodsearch.restaurant.service;

import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchClient;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchItem;
import com.foodtrip.foodsearch.restaurant.entity.Restaurant;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantManager;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantManagerRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;

/**
 * 사업장 주소 자동귀속(2026-07-20 요구사항 추가, 01(회원가입) 8-4장 / 07(음식점-메뉴-검색) 관련).
 * 2026-07-21 재설계: 예전에는 DB에 저장해둔 음식점 주소와 비교했지만, 이제 음식점 주소 자체를 DB에
 * 저장하지 않으므로(카카오 운영정책, 001-05 참고) 사업장 주소를 카카오 키워드 검색으로 실시간 조회해
 * 후보를 찾는다. 후보가 정확히 1개일 때만 자동으로 부가정보 행을 만들고(Restaurant.createExtras) 귀속
 * 처리한다(오탐 방지 — 0개/여러 개면 아무것도 하지 않음, 기존과 동일한 안전한 기본값).
 */
@Service
public class RestaurantClaimServiceImpl implements RestaurantClaimService {

    private static final Logger log = LoggerFactory.getLogger(RestaurantClaimServiceImpl.class);

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
    public void tryAutoClaimByAddress(Long memberId, Long businessProfileId, String businessAddress) {
        if (businessAddress == null || businessAddress.isBlank()) {
            log.info("사업장 주소가 없어(OCR 미추출) 음식점 자동귀속을 건너뜁니다 (memberId={})", memberId);
            return;
        }
        String normalizedBusinessAddress = normalize(businessAddress);

        List<KakaoLocalSearchItem> candidates;
        try {
            candidates = kakaoLocalSearchClient.searchByKeyword(businessAddress).stream()
                    .filter(item -> matches(normalizedBusinessAddress, item.addressName())
                            || matches(normalizedBusinessAddress, item.roadAddressName()))
                    .toList();
        } catch (CustomException e) {
            log.warn("카카오 로컬 API 호출에 실패해 음식점 자동귀속을 건너뜁니다 (memberId={})", memberId, e);
            return;
        }

        if (candidates.isEmpty()) {
            log.info("사업장 주소와 일치하는 카카오 검색 결과가 없어 자동귀속을 건너뜁니다 (memberId={})", memberId);
            return;
        }
        if (candidates.size() > 1) {
            log.warn("사업장 주소와 일치하는 검색 결과가 {}개라 모호해서 자동귀속을 건너뜁니다 (memberId={})",
                    candidates.size(), memberId);
            return;
        }

        KakaoLocalSearchItem matched = candidates.get(0);
        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(matched.id())
                .orElseGet(() -> restaurantRepository.save(Restaurant.createExtras(matched.id())));
        restaurant.claim();
        restaurantManagerRepository.save(
                RestaurantManager.createOwner(restaurant.getRestaurantId(), businessProfileId, memberId));
        log.info("음식점 자동귀속 완료 (restaurantId={}, memberId={})", restaurant.getRestaurantId(), memberId);
    }

    private boolean matches(String normalizedBusinessAddress, String candidateAddress) {
        if (candidateAddress == null || candidateAddress.isBlank()) {
            return false;
        }
        String normalizedCandidate = normalize(candidateAddress);
        return normalizedBusinessAddress.contains(normalizedCandidate)
                || normalizedCandidate.contains(normalizedBusinessAddress);
    }

    private String normalize(String address) {
        return address.replaceAll("\\s", "");
    }
}
