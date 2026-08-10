package com.foodtrip.foodsearch.restaurant.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.common.storage.RestaurantImageStorageService;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.restaurant.dto.BusinessHourItemDto;
import com.foodtrip.foodsearch.restaurant.dto.CreateMenuRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.OwnerMenuResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantDetailResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantImageResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.UpdateMenuRequestDto;
import com.foodtrip.foodsearch.restaurant.entity.Menu;
import com.foodtrip.foodsearch.restaurant.entity.Restaurant;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantBusinessHour;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantImage;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantManager;
import com.foodtrip.foodsearch.restaurant.repository.MenuRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantBusinessHourRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantImageRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantManagerRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

@Service
@Transactional
public class RestaurantOwnerServiceImpl implements RestaurantOwnerService {

    private static final int GALLERY_IMAGE_LIMIT = 4;

    private final RestaurantRepository restaurantRepository;
    private final RestaurantManagerRepository restaurantManagerRepository;
    private final RestaurantBusinessHourRepository restaurantBusinessHourRepository;
    private final MenuRepository menuRepository;
    private final RestaurantImageRepository restaurantImageRepository;
    private final RestaurantImageStorageService restaurantImageStorageService;
    private final RestaurantService restaurantService;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    public RestaurantOwnerServiceImpl(RestaurantRepository restaurantRepository,
                                       RestaurantManagerRepository restaurantManagerRepository,
                                       RestaurantBusinessHourRepository restaurantBusinessHourRepository,
                                       MenuRepository menuRepository,
                                       RestaurantImageRepository restaurantImageRepository,
                                       RestaurantImageStorageService restaurantImageStorageService,
                                       RestaurantService restaurantService,
                                       JwtProvider jwtProvider,
                                       AccessTokenSessionService accessTokenSessionService) {
        this.restaurantRepository = restaurantRepository;
        this.restaurantManagerRepository = restaurantManagerRepository;
        this.restaurantBusinessHourRepository = restaurantBusinessHourRepository;
        this.menuRepository = menuRepository;
        this.restaurantImageRepository = restaurantImageRepository;
        this.restaurantImageStorageService = restaurantImageStorageService;
        this.restaurantService = restaurantService;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    public RestaurantDetailResponseDto updatePhone(String restaurantId, String authorizationHeader, String phone) {
        Restaurant restaurant = resolveOwnedRestaurant(restaurantId, authorizationHeader);
        restaurant.updatePhone(phone);
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public RestaurantDetailResponseDto updateExtras(String restaurantId, String authorizationHeader,
                                                      String description, List<String> amenities, String priceRange) {
        Restaurant restaurant = resolveOwnedRestaurant(restaurantId, authorizationHeader);
        String amenitiesCsv = amenities == null || amenities.isEmpty() ? null : String.join(",", amenities);
        restaurant.updateExtras(description, amenitiesCsv, priceRange);
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public RestaurantDetailResponseDto replaceBusinessHours(String restaurantId, String authorizationHeader,
                                                              List<BusinessHourItemDto> businessHours) {
        resolveOwnedRestaurant(restaurantId, authorizationHeader);
        // 요일 7개를 개별 upsert하는 대신 통째로 지우고 다시 넣는다(001-02 3장에서 이미 "필요한 만큼만"
        // 원칙으로 QueryDSL 등 도입을 미룬 것과 같은 이유 — 요일별 upsert 로직보다 훨씬 단순함).
        restaurantBusinessHourRepository.deleteByRestaurantId(restaurantId);
        for (BusinessHourItemDto item : businessHours) {
            restaurantBusinessHourRepository.save(RestaurantBusinessHour.create(
                    restaurantId, item.getDayOfWeek(), item.getOpenTime(), item.getCloseTime(),
                    Boolean.TRUE.equals(item.getIsClosed())));
        }
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public RestaurantDetailResponseDto updateOpenStatus(String restaurantId, String authorizationHeader, boolean tempClosed) {
        Restaurant restaurant = resolveOwnedRestaurant(restaurantId, authorizationHeader);
        restaurant.updateBusinessStatus(tempClosed ? Restaurant.BUSINESS_STATUS_TEMP_CLOSED : Restaurant.BUSINESS_STATUS_UNKNOWN);
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public RestaurantDetailResponseDto createMenu(String restaurantId, String authorizationHeader, CreateMenuRequestDto request) {
        resolveOwnedRestaurant(restaurantId, authorizationHeader);
        menuRepository.save(Menu.create(restaurantId, request.getMenuName(), request.getPrice(),
                request.getDescription(), request.isSignature()));
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public RestaurantDetailResponseDto updateMenu(String restaurantId, Long menuId, String authorizationHeader,
                                                   UpdateMenuRequestDto request) {
        resolveOwnedRestaurant(restaurantId, authorizationHeader);
        Menu menu = menuRepository.findByMenuIdAndRestaurantIdAndDeletedAtIsNull(menuId, restaurantId)
                .orElseThrow(() -> new CustomException(ErrorCode.MENU_NOT_FOUND));
        menu.update(request.getMenuName(), request.getPrice(), request.getDescription(),
                request.isSignature(), Boolean.TRUE.equals(request.getIsAvailable()));
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public RestaurantDetailResponseDto deleteMenu(String restaurantId, Long menuId, String authorizationHeader) {
        resolveOwnedRestaurant(restaurantId, authorizationHeader);
        Menu menu = menuRepository.findByMenuIdAndRestaurantIdAndDeletedAtIsNull(menuId, restaurantId)
                .orElseThrow(() -> new CustomException(ErrorCode.MENU_NOT_FOUND));
        menu.markDeleted();
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public RestaurantDetailResponseDto uploadImage(String restaurantId, String authorizationHeader, MultipartFile file) {
        Restaurant restaurant = resolveOwnedRestaurant(restaurantId, authorizationHeader);
        String previousImageUrl = restaurant.getImageUrl();
        String newImageUrl = restaurantImageStorageService.store(file);
        restaurant.updateImageUrl(newImageUrl);
        restaurantImageStorageService.delete(previousImageUrl);
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public RestaurantDetailResponseDto deleteImage(String restaurantId, String authorizationHeader) {
        Restaurant restaurant = resolveOwnedRestaurant(restaurantId, authorizationHeader);
        restaurantImageStorageService.delete(restaurant.getImageUrl());
        restaurant.updateImageUrl(null);
        return restaurantService.getDetail(restaurantId, authorizationHeader, null, null, null, null, null);
    }

    @Override
    public List<OwnerMenuResponseDto> listMyMenus(String restaurantId, String authorizationHeader) {
        resolveOwnedRestaurant(restaurantId, authorizationHeader);
        return menuRepository.findByRestaurantIdAndDeletedAtIsNullOrderByIsSignatureDescPriceAsc(restaurantId)
                .stream()
                .map(m -> new OwnerMenuResponseDto(m.getMenuId(), m.getMenuName(), m.getPrice(), m.getDescription(),
                        Boolean.TRUE.equals(m.getIsSignature()), Boolean.TRUE.equals(m.getIsAvailable())))
                .collect(Collectors.toList());
    }

    @Override
    public List<RestaurantImageResponseDto> listGalleryImages(String restaurantId, String authorizationHeader) {
        resolveOwnedRestaurant(restaurantId, authorizationHeader);
        return toImageDtos(restaurantId);
    }

    @Override
    public List<RestaurantImageResponseDto> addGalleryImage(String restaurantId, String authorizationHeader, MultipartFile file) {
        Restaurant restaurant = resolveOwnedRestaurant(restaurantId, authorizationHeader);
        long existingCount = restaurantImageRepository.countByRestaurantId(restaurantId);
        if (existingCount >= GALLERY_IMAGE_LIMIT) {
            throw new CustomException(ErrorCode.RESTAURANT_IMAGE_LIMIT_EXCEEDED);
        }
        String url = restaurantImageStorageService.store(file);
        boolean isFirst = existingCount == 0;
        RestaurantImage image = restaurantImageRepository.save(RestaurantImage.create(restaurantId, url, isFirst));
        if (isFirst) {
            restaurant.updateImageUrl(image.getImageUrl());
        }
        return toImageDtos(restaurantId);
    }

    @Override
    public List<RestaurantImageResponseDto> deleteGalleryImage(String restaurantId, Long imageId, String authorizationHeader) {
        Restaurant restaurant = resolveOwnedRestaurant(restaurantId, authorizationHeader);
        RestaurantImage image = restaurantImageRepository.findByRestaurantImageIdAndRestaurantId(imageId, restaurantId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESTAURANT_IMAGE_NOT_FOUND));
        boolean wasMain = image.isMain();
        restaurantImageStorageService.delete(image.getImageUrl());
        restaurantImageRepository.delete(image);

        List<RestaurantImage> remaining = restaurantImageRepository.findByRestaurantIdOrderByIsMainDescCreatedAtAsc(restaurantId);
        if (wasMain && !remaining.isEmpty()) {
            RestaurantImage newMain = remaining.get(0);
            newMain.markMain();
            restaurant.updateImageUrl(newMain.getImageUrl());
        } else if (remaining.isEmpty()) {
            restaurant.updateImageUrl(null);
        }
        return toImageDtos(restaurantId);
    }

    @Override
    public List<RestaurantImageResponseDto> setMainGalleryImage(String restaurantId, Long imageId, String authorizationHeader) {
        Restaurant restaurant = resolveOwnedRestaurant(restaurantId, authorizationHeader);
        RestaurantImage target = restaurantImageRepository.findByRestaurantImageIdAndRestaurantId(imageId, restaurantId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESTAURANT_IMAGE_NOT_FOUND));
        for (RestaurantImage image : restaurantImageRepository.findByRestaurantIdOrderByIsMainDescCreatedAtAsc(restaurantId)) {
            if (image.getRestaurantImageId().equals(target.getRestaurantImageId())) {
                image.markMain();
            } else {
                image.unmarkMain();
            }
        }
        restaurant.updateImageUrl(target.getImageUrl());
        return toImageDtos(restaurantId);
    }

    private List<RestaurantImageResponseDto> toImageDtos(String restaurantId) {
        return restaurantImageRepository.findByRestaurantIdOrderByIsMainDescCreatedAtAsc(restaurantId).stream()
                .map(img -> new RestaurantImageResponseDto(img.getRestaurantImageId(), img.getImageUrl(), img.isMain()))
                .collect(Collectors.toList());
    }

    // 존재 확인(RESTAURANT_NOT_FOUND) + 로그인 필수(NOT_LOGGED_IN) + 이 음식점의 ACTIVE 관리자인지
    // (RESTAURANT_ACCESS_DENIED)까지 한 번에 확인한다. 목록/상세 조회(RestaurantServiceImpl)의
    // resolveMemberIdOrNull()과 달리, 쓰기 API는 로그인 없이는 아예 호출할 이유가 없어 헤더가
    // 없거나 무효하면 바로 에러로 처리한다(선택적 인증이 아님).
    private Restaurant resolveOwnedRestaurant(String restaurantId, String authorizationHeader) {
        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESTAURANT_NOT_FOUND));
        Long memberId = resolveMemberId(authorizationHeader);
        boolean isActiveManager = restaurantManagerRepository
                .existsByRestaurantIdAndMemberIdAndManagerStatus(restaurantId, memberId, RestaurantManager.STATUS_ACTIVE);
        if (!isActiveManager) {
            throw new CustomException(ErrorCode.RESTAURANT_ACCESS_DENIED);
        }
        return restaurant;
    }

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
