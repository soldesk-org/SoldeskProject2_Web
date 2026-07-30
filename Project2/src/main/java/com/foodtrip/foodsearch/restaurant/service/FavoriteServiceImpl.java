package com.foodtrip.foodsearch.restaurant.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.restaurant.dto.FavoriteAddRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.FavoriteResponseDto;
import com.foodtrip.foodsearch.restaurant.entity.Favorite;
import com.foodtrip.foodsearch.restaurant.entity.Restaurant;
import com.foodtrip.foodsearch.restaurant.repository.FavoriteRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 즐겨찾기 등록/해제(마이페이지 11, 2026-07-22 추가) — 로그인 필수(RestaurantOwnerServiceImpl과 같은
// "무효 토큰=바로 401" 패턴, 07 001-02 5-8장). 등록/해제 둘 다 멱등(idempotent)하게 처리한다 — 이미
// 즐겨찾기한 걸 다시 등록하거나, 없는 걸 다시 해제해도 에러 없이 그냥 성공으로 응답(05 프로필 사진 삭제와
// 같은 "관대한 API" 톤).
@Service
public class FavoriteServiceImpl implements FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final RestaurantRepository restaurantRepository;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public FavoriteServiceImpl(FavoriteRepository favoriteRepository, RestaurantRepository restaurantRepository,
                                JwtProvider jwtProvider, AccessTokenSessionService accessTokenSessionService) {
        this.favoriteRepository = favoriteRepository;
        this.restaurantRepository = restaurantRepository;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    @Transactional
    public FavoriteResponseDto add(String restaurantId, String authorizationHeader, FavoriteAddRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        if (favoriteRepository.existsByMemberIdAndRestaurantId(memberId, restaurantId)) {
            return new FavoriteResponseDto(true, true);
        }
        // 리뷰(2-1장)와 같은 지연 생성 패턴 — 즐겨찾기도 "실제 상호작용"이라 부가정보 행을 이 시점에 만든다.
        restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId)
                .orElseGet(() -> restaurantRepository.save(Restaurant.createExtras(restaurantId)));

        favoriteRepository.save(Favorite.create(memberId, restaurantId, request.getName(), request.getAddress(),
                request.getRoadAddress(), request.getLatitude(), request.getLongitude()));
        return new FavoriteResponseDto(true, true);
    }

    @Override
    @Transactional
    public FavoriteResponseDto remove(String restaurantId, String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        favoriteRepository.findByMemberIdAndRestaurantId(memberId, restaurantId)
                .ifPresent(favoriteRepository::delete);
        return new FavoriteResponseDto(true, false);
    }

    // 07/08/10 기능의 resolveMemberId()와 동일한 로직 — 패키지가 달라 그대로 복제(이 프로젝트가 계속 써온 패턴).
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
