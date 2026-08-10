package com.foodtrip.foodsearch.restaurant.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchClient;
import com.foodtrip.foodsearch.restaurant.client.KakaoLocalSearchItem;
import com.foodtrip.foodsearch.restaurant.dto.BusinessHourResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.CategoryResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.MenuResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantDetailResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantListResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantSummaryResponseDto;
import com.foodtrip.foodsearch.restaurant.entity.Menu;
import com.foodtrip.foodsearch.restaurant.entity.MenuKeyword;
import com.foodtrip.foodsearch.restaurant.entity.Restaurant;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantBusinessHour;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantCategory;
import com.foodtrip.foodsearch.restaurant.entity.RestaurantImage;
import com.foodtrip.foodsearch.restaurant.repository.FavoriteRepository;
import com.foodtrip.foodsearch.restaurant.repository.MenuRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantBusinessHourRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantCategoryRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantImageRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;
import com.foodtrip.foodsearch.restaurant.repository.TagRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// 2026-07-21 전면 재설계: 카카오 로컬 API 운영정책(실시간 호출만 허용, 저장 목적 호출 금지 — 카카오
// 데브톡 공식 답변, 001-05 참고)에 맞춰 검색/목록/주변조회를 전부 라이브 호출로 바꿨다. DB(Restaurant
// 엔티티)는 더 이상 상호명/주소/좌표를 담지 않고, 우리 서비스에서만 관리하는 부가정보(설명/사진/평점
// 캐시/관리상태/사업자 전화번호)만 카카오 place id를 키로 보관한다.
@Service
@Transactional(readOnly = true)
public class RestaurantServiceImpl implements RestaurantService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_KEYWORD_LENGTH = 100;
    private static final double DEFAULT_RADIUS_KM = 1.0;
    private static final double MAX_RADIUS_KM = 20.0;
    private static final double KM_PER_LATITUDE_DEGREE = 111.0;
    private static final double EARTH_RADIUS_KM = 6371.0;

    private final RestaurantRepository restaurantRepository;
    private final RestaurantCategoryRepository restaurantCategoryRepository;
    private final RestaurantCategoryMatchingService restaurantCategoryMatchingService;
    private final KakaoLocalSearchClient kakaoLocalSearchClient;
    private final TagRepository tagRepository;
    private final RestaurantBusinessHourRepository restaurantBusinessHourRepository;
    private final MenuRepository menuRepository;
    private final FavoriteRepository favoriteRepository;
    private final RestaurantImageRepository restaurantImageRepository;
    private final SearchHistoryRecorder searchHistoryRecorder;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;

    // 음식점 사진 미등록(사업자 등록 전) 시 대체할 기본 이미지 URL(005 프로필 사진과 동일 패턴).
    @Value("${restaurant.default-image-url:}")
    private String defaultImageUrl;

    public RestaurantServiceImpl(RestaurantRepository restaurantRepository,
                                  RestaurantCategoryRepository restaurantCategoryRepository,
                                  RestaurantCategoryMatchingService restaurantCategoryMatchingService,
                                  KakaoLocalSearchClient kakaoLocalSearchClient,
                                  TagRepository tagRepository,
                                  RestaurantBusinessHourRepository restaurantBusinessHourRepository,
                                  MenuRepository menuRepository,
                                  FavoriteRepository favoriteRepository,
                                  RestaurantImageRepository restaurantImageRepository,
                                  SearchHistoryRecorder searchHistoryRecorder,
                                  JwtProvider jwtProvider,
                                  AccessTokenSessionService accessTokenSessionService) {
        this.restaurantRepository = restaurantRepository;
        this.restaurantCategoryRepository = restaurantCategoryRepository;
        this.restaurantCategoryMatchingService = restaurantCategoryMatchingService;
        this.kakaoLocalSearchClient = kakaoLocalSearchClient;
        this.tagRepository = tagRepository;
        this.restaurantBusinessHourRepository = restaurantBusinessHourRepository;
        this.menuRepository = menuRepository;
        this.favoriteRepository = favoriteRepository;
        this.restaurantImageRepository = restaurantImageRepository;
        this.searchHistoryRecorder = searchHistoryRecorder;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
    }

    @Override
    public RestaurantListResponseDto list(int page, int size, String authorizationHeader) {
        // 위치 없이 "전체 목록"을 낼 방법이 없다(카카오 로컬 API는 좌표 기준 검색만 지원, 001-05 참고).
        return new RestaurantListResponseDto(page, size, 0, List.of());
    }

    @Override
    public List<CategoryResponseDto> listCategories() {
        return restaurantCategoryRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(c -> new CategoryResponseDto(c.getCategoryId(), c.getCategoryCode(), c.getCategoryName()))
                .collect(Collectors.toList());
    }

    @Override
    public RestaurantListResponseDto search(String keyword, BigDecimal minLat, BigDecimal maxLat,
                                             BigDecimal minLng, BigDecimal maxLng, Boolean openNow, String type,
                                             int page, int size, String authorizationHeader) {
        String normalizedKeyword = normalizeKeyword(keyword);
        validateBoundingBox(minLat, maxLat, minLng, maxLng);
        if (normalizedKeyword == null) {
            return new RestaurantListResponseDto(page, size, 0, List.of());
        }
        boolean searchShop = !"menu".equals(type);
        boolean searchMenu = !"shop".equals(type);

        // 검색 기록(마이페이지 11-연장, 2026-07-22 추가) — 로그인한 회원이 실제 검색어로 호출할 때만 남긴다
        // (비로그인은 search_histories.member_id NOT NULL이라 애초에 기록 불가, 07 001-02 8-2장에서 이미
        // 확인된 제약). 카테고리 필터(filter())는 "검색"이 아니라 별개 개념이라 기록 대상이 아니다.
        Long searchingMemberId = resolveMemberIdOrNull(authorizationHeader);
        if (searchingMemberId != null) {
            searchHistoryRecorder.record(searchingMemberId, normalizedKeyword);
        }

        boolean hasBoundingBox = hasBoundingBox(minLat, maxLat, minLng, maxLng);
        Map<String, KakaoLocalSearchItem> merged = new LinkedHashMap<>();
        // 1) 가게명 검색(type=all|shop일 때만): bbox가 있으면(지도에서 이름 검색, 2026-07-21 추가) 그
        // 범위 중심으로 위치 편향 검색을 써서 "설빙"/"써브웨이" 같은 전국 체인이어도 지금 보고 있는 지역의
        // 지점을 놓치지 않는다. bbox가 없으면(3차 보강) 전국 기준 관련도순 검색을 그대로 쓴다.
        if (searchShop) {
            try {
                List<KakaoLocalSearchItem> byName = hasBoundingBox
                        ? kakaoLocalSearchClient.searchByKeywordInBoundingBox(normalizedKeyword,
                                minLng.doubleValue(), minLat.doubleValue(), maxLng.doubleValue(), maxLat.doubleValue())
                        : kakaoLocalSearchClient.searchByKeyword(normalizedKeyword);
                byName.forEach(item -> merged.put(item.id(), item));
            } catch (CustomException e) {
                // 카카오 호출 실패는 무시(가게명 검색분만 빠지고 메뉴명 검색은 계속 진행).
            }
        }

        // 2) 음식 검색(type=all|menu일 때만, 2026-07-21 추가): "김치찌개"처럼 메뉴명으로도 찾는다. 메뉴는
        // 사업자가 직접 등록한 우리 DB 데이터라 먼저 그 메뉴를 파는 restaurantId들을 찾고, 지금 지도 범위의
        // 카카오 라이브 결과(bbox 전체)와 교집합해서 좌표를 채운다 — 카카오는 id 단건 재조회를 지원하지
        // 않아 이 방식 외에는 지도에 표시할 좌표를 구할 방법이 없다(001-05 참고). bbox가 없으면 좌표를
        // 구할 수 없어 메뉴명 검색은 건너뛴다.
        if (searchMenu && hasBoundingBox) {
            Set<String> menuMatchedIds = menuRepository.findRestaurantIdsByMenuNameContaining(normalizedKeyword);
            if (!menuMatchedIds.isEmpty()) {
                try {
                    List<KakaoLocalSearchItem> areaItems = kakaoLocalSearchClient.searchByBoundingBox(
                            minLng.doubleValue(), minLat.doubleValue(), maxLng.doubleValue(), maxLat.doubleValue());
                    areaItems.stream()
                            .filter(item -> menuMatchedIds.contains(item.id()))
                            .forEach(item -> merged.put(item.id(), item));
                } catch (CustomException e) {
                    // 카카오 호출 실패 시 메뉴명 검색분도 그냥 빠짐(전체 검색 자체는 막지 않음).
                }
            }
        }

        return buildListResponse(new ArrayList<>(merged.values()), null, null, openNow, page, size, authorizationHeader);
    }

    @Override
    public RestaurantListResponseDto filter(Long categoryId, Integer minPrice, Integer maxPrice,
                                             BigDecimal minLat, BigDecimal maxLat, BigDecimal minLng, BigDecimal maxLng,
                                             Boolean openNow, int page, int size, String authorizationHeader) {
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "최소 가격이 최대 가격보다 클 수 없습니다.");
        }
        validateBoundingBox(minLat, maxLat, minLng, maxLng);
        if (!hasBoundingBox(minLat, maxLat, minLng, maxLng)) {
            throw new CustomException(ErrorCode.INVALID_INPUT,
                    "minLat/maxLat/minLng/maxLng(지도 범위)가 필요합니다 — 카카오 로컬 API는 좌표 기준 검색만 지원합니다.");
        }

        List<KakaoLocalSearchItem> items;
        try {
            items = kakaoLocalSearchClient.searchByBoundingBox(
                    minLng.doubleValue(), minLat.doubleValue(), maxLng.doubleValue(), maxLat.doubleValue());
        } catch (CustomException e) {
            items = List.of();
        }
        return buildListResponse(items, categoryId, new PriceRange(minPrice, maxPrice), openNow, page, size, authorizationHeader);
    }

    @Override
    public RestaurantListResponseDto nearby(BigDecimal latitude, BigDecimal longitude, Double radiusKm, String authorizationHeader) {
        if (latitude == null || longitude == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "latitude/longitude는 필수입니다.");
        }
        double lat = latitude.doubleValue();
        double lng = longitude.doubleValue();
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "latitude/longitude 범위가 올바르지 않습니다.");
        }
        double radius = (radiusKm == null) ? DEFAULT_RADIUS_KM : radiusKm;
        if (radius <= 0 || radius > MAX_RADIUS_KM) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "radiusKm은 0보다 크고 " + MAX_RADIUS_KM + " 이하여야 합니다.");
        }
        double latDelta = radius / KM_PER_LATITUDE_DEGREE;
        double lngDelta = radius / (KM_PER_LATITUDE_DEGREE * Math.cos(Math.toRadians(lat)));

        List<KakaoLocalSearchItem> items;
        try {
            items = kakaoLocalSearchClient.searchByBoundingBox(lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta);
        } catch (CustomException e) {
            items = List.of();
        }

        List<ItemWithDistance> withDistance = new ArrayList<>();
        for (KakaoLocalSearchItem item : items) {
            if (item.latitude() == null || item.longitude() == null) {
                continue;
            }
            double distanceKm = haversineKm(lat, lng, item.latitude().doubleValue(), item.longitude().doubleValue());
            if (distanceKm <= radius) {
                withDistance.add(new ItemWithDistance(item, distanceKm));
            }
        }
        withDistance.sort((a, b) -> Double.compare(a.distanceKm(), b.distanceKm()));

        List<MenuKeyword> keywords = restaurantCategoryMatchingService.loadActiveKeywords();
        List<String> ids = withDistance.stream().map(iwd -> iwd.item().id()).toList();
        Map<String, Restaurant> extrasById = fetchExtrasByIds(ids);
        Set<String> favoritedIds = fetchFavoritedIds(ids, resolveMemberIdOrNull(authorizationHeader));

        List<RestaurantSummaryResponseDto> restaurants = new ArrayList<>();
        for (ItemWithDistance iwd : withDistance) {
            restaurants.add(toSummaryDto(iwd.item(), extrasById.get(iwd.item().id()), keywords, favoritedIds, iwd.distanceKm()));
        }
        return new RestaurantListResponseDto(0, restaurants.size(), restaurants.size(), restaurants);
    }

    @Override
    public RestaurantDetailResponseDto getDetail(String restaurantId, String authorizationHeader,
                                                  String name, String address, String roadAddress,
                                                  BigDecimal latitude, BigDecimal longitude) {
        // 클라이언트가 넘긴 name/address/좌표는 그대로 믿지 않는다(2026-08-06) — "고객 화면으로 보기"/
        // 공유 링크의 shopId/name/좌표 쿼리 파라미터는 URL에 그대로 노출돼 있어 누구나 임의로 바꿔서 없는
        // 가게를 실제처럼 보이게 하거나(존재하지 않는 shopId), 실제 가게를 엉뚱한 위치에 있는 것처럼
        // 조작할 수 있었다. 좌표 주변을 카카오 로컬 API로 실시간 재검색해서 이 restaurantId가 실제로
        // 그 자리에 있는 장소인지 검증하고, 통과하면 카카오가 준 값으로 덮어써서(클라이언트 값은 버림)
        // 화면에 신뢰할 수 있는 정보만 나가게 한다. 검증에 실패하면(좌표 없음/불일치/카카오 호출 실패)
        // 스냅샷을 비워 "id만 알고 상세 정보 없음" 상태로 안전하게 되돌린다.
        VerifiedSnapshot verified = verifySnapshot(restaurantId, latitude, longitude);
        name = verified.name();
        address = verified.address();
        roadAddress = verified.roadAddress();
        latitude = verified.latitude();
        longitude = verified.longitude();

        Restaurant restaurant = restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId).orElse(null);

        List<String> tags = tagRepository.findTagNamesByRestaurantId(restaurantId);
        List<BusinessHourResponseDto> businessHours = restaurantBusinessHourRepository
                .findByRestaurantIdOrderByDayOfWeekAsc(restaurantId).stream()
                .map(this::toBusinessHourDto)
                .collect(Collectors.toList());
        List<MenuResponseDto> menus = menuRepository
                .findByRestaurantIdAndIsAvailableTrueAndDeletedAtIsNullOrderByIsSignatureDescPriceAsc(restaurantId).stream()
                .map(this::toMenuDto)
                .collect(Collectors.toList());

        // name이 있어야(=프론트가 방금 검색 결과에서 클릭한 경우) 분류가 가능하다 — id만 아는 경우(스냅샷
        // 없음)는 카테고리도 알 수 없다(001-05, 카카오 단건 재조회 불가).
        // 1차: 상호명/메뉴명 키워드 매칭 → 실패 시 2차: verifySnapshot()이 재검증 과정에서 이미 받아온
        // 카카오 원본 카테고리 문자열로 보조 분류(classifyItem()과 같은 2단계 방식, 2026-08-08 추가) —
        // 목록/검색/주변조회에만 적용되고 공유 링크로 들어온 단건 상세조회는 대상이 아니었던 한계를
        // 메운다(AI 추천 결과의 "지도에서 보기" 공유 링크에서 카테고리 배지/마커가 미분류로 떨어지던
        // 문제로 발견됨).
        List<String> categories = List.of();
        if (name != null) {
            List<MenuKeyword> keywords = restaurantCategoryMatchingService.loadActiveKeywords();
            List<String> menuNames = menus.stream().map(MenuResponseDto::getMenuName).toList();
            Optional<RestaurantCategory> category = restaurantCategoryMatchingService.classify(name, menuNames, keywords);
            if (category.isEmpty() && verified.kakaoCategoryName() != null) {
                category = restaurantCategoryMatchingService.classifyByKakaoCategoryName(verified.kakaoCategoryName());
            }
            categories = category.map(c -> List.of(c.getCategoryName())).orElse(List.of());
        }
        String category = categories.isEmpty() ? null : categories.get(0);

        Long memberId = resolveMemberIdOrNull(authorizationHeader);
        boolean favorite = memberId != null
                && favoriteRepository.existsByMemberIdAndRestaurantId(memberId, restaurantId);

        String description = restaurant != null ? restaurant.getDescription() : null;
        String phone = restaurant != null ? restaurant.getPhone() : null;
        String businessStatus = restaurant != null ? restaurant.getBusinessStatus() : Restaurant.BUSINESS_STATUS_UNKNOWN;
        BigDecimal avgRating = restaurant != null ? restaurant.getAvgRating() : BigDecimal.ZERO;
        Integer reviewCount = restaurant != null ? restaurant.getReviewCount() : 0;
        String imageUrl = resolveImageUrl(restaurant);
        // 갤러리(2026-08-06 추가) — 대표 이미지가 항상 0번으로 오도록 리포지토리 정렬(isMain desc)을 그대로 쓴다.
        List<String> images = restaurantImageRepository.findByRestaurantIdOrderByIsMainDescCreatedAtAsc(restaurantId)
                .stream().map(RestaurantImage::getImageUrl).collect(Collectors.toList());
        String amenitiesCsv = restaurant != null ? restaurant.getAmenities() : null;
        List<String> amenities = (amenitiesCsv == null || amenitiesCsv.isBlank())
                ? List.of()
                : Arrays.stream(amenitiesCsv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        String priceRange = restaurant != null ? restaurant.getPriceRange() : null;

        return new RestaurantDetailResponseDto(
                restaurantId, name, category, description, roadAddress, address, latitude, longitude,
                phone, null, imageUrl, images, businessStatus, avgRating, reviewCount, favorite,
                categories, tags, businessHours, menus, amenities, priceRange);
    }

    // ---- 내부 헬퍼 ----

    private record PriceRange(Integer minPrice, Integer maxPrice) {
    }

    private record ItemWithDistance(KakaoLocalSearchItem item, double distanceKm) {
    }

    private RestaurantListResponseDto buildListResponse(List<KakaoLocalSearchItem> items, Long categoryId,
                                                          PriceRange priceRange, Boolean openNow, int page, int size,
                                                          String authorizationHeader) {
        List<MenuKeyword> keywords = restaurantCategoryMatchingService.loadActiveKeywords();
        List<String> ids = items.stream().map(KakaoLocalSearchItem::id).toList();
        Map<String, Restaurant> extrasById = fetchExtrasByIds(ids);
        Set<String> favoritedIds = fetchFavoritedIds(ids, resolveMemberIdOrNull(authorizationHeader));
        boolean filterOpenNow = Boolean.TRUE.equals(openNow);
        Map<String, List<RestaurantBusinessHour>> businessHoursById = filterOpenNow
                ? restaurantBusinessHourRepository.findByRestaurantIdIn(ids).stream()
                        .collect(Collectors.groupingBy(RestaurantBusinessHour::getRestaurantId))
                : Map.of();

        List<RestaurantSummaryResponseDto> matched = new ArrayList<>();
        for (KakaoLocalSearchItem item : items) {
            Optional<RestaurantCategory> category = classifyItem(item, keywords);
            if (categoryId != null && (category.isEmpty() || !categoryId.equals(category.get().getCategoryId()))) {
                continue;
            }
            if (priceRange != null && (priceRange.minPrice() != null || priceRange.maxPrice() != null)) {
                List<Menu> menus = menuRepository
                        .findByRestaurantIdAndIsAvailableTrueAndDeletedAtIsNullOrderByIsSignatureDescPriceAsc(item.id());
                if (menus.isEmpty()) {
                    continue; // 메뉴 정보가 없으면 "그 가격대"라고 판단할 근거가 없어 제외(기존 SQL 동작과 동일).
                }
                double avgPrice = menus.stream().mapToInt(Menu::getPrice).average().orElse(0);
                if (priceRange.minPrice() != null && avgPrice < priceRange.minPrice()) {
                    continue;
                }
                if (priceRange.maxPrice() != null && avgPrice > priceRange.maxPrice()) {
                    continue;
                }
            }
            if (filterOpenNow) {
                Restaurant extras = extrasById.get(item.id());
                boolean tempClosed = extras != null
                        && Restaurant.BUSINESS_STATUS_TEMP_CLOSED.equals(extras.getBusinessStatus());
                if (tempClosed || !isOpenNow(businessHoursById.get(item.id()))) {
                    continue; // 임시 휴업 중이거나, 영업시간 미등록이라 "지금 열려있는지" 알 방법이 없으면 제외.
                }
            }
            String categoryName = category.map(RestaurantCategory::getCategoryName).orElse(null);
            matched.add(toSummaryDto(item, extrasById.get(item.id()), categoryName, favoritedIds));
        }

        int safePage = Math.max(page, 0);
        int safeSize = (size <= 0) ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        int fromIndex = Math.min(safePage * safeSize, matched.size());
        int toIndex = Math.min(fromIndex + safeSize, matched.size());
        return new RestaurantListResponseDto(safePage, safeSize, matched.size(), matched.subList(fromIndex, toIndex));
    }

    // 1차: 우리 키워드 마스터(상호명 매칭) → 실패 시 2차: 카카오 원본 카테고리 문자열로 보조 분류
    // (2026-07-23 추가 — RestaurantCategoryMatchingService.classifyByKakaoCategoryName() 참고, "지도 마커
    // 카테고리별 표시" 요청의 실사용 커버리지를 높이기 위함).
    private Optional<RestaurantCategory> classifyItem(KakaoLocalSearchItem item, List<MenuKeyword> keywords) {
        Optional<RestaurantCategory> primary = restaurantCategoryMatchingService.classify(item.placeName(), List.of(), keywords);
        if (primary.isPresent()) {
            return primary;
        }
        return restaurantCategoryMatchingService.classifyByKakaoCategoryName(item.categoryName());
    }

    private Map<String, Restaurant> fetchExtrasByIds(List<String> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return restaurantRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Restaurant::getRestaurantId, r -> r));
    }

    private Set<String> fetchFavoritedIds(List<String> ids, Long memberId) {
        if (memberId == null || ids.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(favoriteRepository.findFavoritedRestaurantIds(memberId, ids));
    }

    private RestaurantSummaryResponseDto toSummaryDto(KakaoLocalSearchItem item, Restaurant extras,
                                                       String categoryName, Set<String> favoritedIds) {
        return new RestaurantSummaryResponseDto(
                item.id(), item.placeName(), categoryName, item.roadAddressName(), item.addressName(),
                item.latitude(), item.longitude(), item.placeUrl(), resolveImageUrl(extras),
                extras != null ? extras.getAvgRating() : BigDecimal.ZERO,
                extras != null ? extras.getReviewCount() : 0,
                favoritedIds.contains(item.id()), null);
    }

    private RestaurantSummaryResponseDto toSummaryDto(KakaoLocalSearchItem item, Restaurant extras,
                                                       List<MenuKeyword> keywords, Set<String> favoritedIds, Double distanceKm) {
        String categoryName = classifyItem(item, keywords).map(RestaurantCategory::getCategoryName).orElse(null);
        return new RestaurantSummaryResponseDto(
                item.id(), item.placeName(), categoryName, item.roadAddressName(), item.addressName(),
                item.latitude(), item.longitude(), item.placeUrl(), resolveImageUrl(extras),
                extras != null ? extras.getAvgRating() : BigDecimal.ZERO,
                extras != null ? extras.getReviewCount() : 0,
                favoritedIds.contains(item.id()), distanceKm);
    }

    private record VerifiedSnapshot(String name, String address, String roadAddress,
                                     BigDecimal latitude, BigDecimal longitude, String kakaoCategoryName) {
        static final VerifiedSnapshot EMPTY = new VerifiedSnapshot(null, null, null, null, null, null);
    }

    // 상세 조회 위·변조 방지(2026-08-06) — 클라이언트가 준 좌표 주변(약 300m)을 카카오로 실시간 재검색해
    // 이 restaurantId가 실제로 그 자리에 있는지 확인한다. 반경을 좁게 잡아 "실제 존재하는 다른 곳의
    // 좌표를 갖다 붙이는" 시도까지는 막지 못하지만(카카오 단건 재조회 불가라는 근본 제약, 001-05 참고),
    // 적어도 "존재하지 않는 가게를 지어내거나 좌표를 완전히 엉뚱한 곳으로 옮기는" 조작은 막는다.
    private VerifiedSnapshot verifySnapshot(String restaurantId, BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) {
            return VerifiedSnapshot.EMPTY;
        }
        double lat = latitude.doubleValue();
        double lng = longitude.doubleValue();
        double delta = 0.003; // 위도 기준 약 300m
        try {
            List<KakaoLocalSearchItem> items = kakaoLocalSearchClient.searchByBoundingBox(
                    lng - delta, lat - delta, lng + delta, lat + delta);
            for (KakaoLocalSearchItem item : items) {
                if (item.id().equals(restaurantId)) {
                    return new VerifiedSnapshot(item.placeName(), item.addressName(), item.roadAddressName(),
                            item.latitude(), item.longitude(), item.categoryName());
                }
            }
        } catch (CustomException e) {
            // 카카오 호출 실패 시 검증 불가 — 지어낸 정보를 보여주는 것보다 안전하게 비우는 쪽을 택한다.
        }
        return VerifiedSnapshot.EMPTY;
    }

    private String resolveImageUrl(Restaurant restaurant) {
        if (restaurant != null && restaurant.getImageUrl() != null) {
            return restaurant.getImageUrl();
        }
        return (defaultImageUrl == null || defaultImageUrl.isBlank()) ? null : defaultImageUrl;
    }

    private BusinessHourResponseDto toBusinessHourDto(RestaurantBusinessHour hour) {
        return new BusinessHourResponseDto(hour.getDayOfWeek(), hour.getOpenTime(), hour.getCloseTime(), hour.getIsClosed());
    }

    private MenuResponseDto toMenuDto(Menu menu) {
        return new MenuResponseDto(menu.getMenuId(), menu.getMenuName(), menu.getPrice(),
                menu.getDescription(), menu.getImageUrl(), menu.getIsSignature());
    }

    private boolean hasBoundingBox(BigDecimal minLat, BigDecimal maxLat, BigDecimal minLng, BigDecimal maxLng) {
        return minLat != null || maxLat != null || minLng != null || maxLng != null;
    }

    private void validateBoundingBox(BigDecimal minLat, BigDecimal maxLat, BigDecimal minLng, BigDecimal maxLng) {
        if (hasBoundingBox(minLat, maxLat, minLng, maxLng)
                && (minLat == null || maxLat == null || minLng == null || maxLng == null)) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "minLat/maxLat/minLng/maxLng는 넷 다 함께 넘겨야 합니다.");
        }
    }

    // dayOfWeek 0=일 ~ 6=토(BusinessHourItemDto 관례). java.time.DayOfWeek.getValue()는 1=월~7=일이라 %7로 맞춘다.
    private boolean isOpenNow(List<RestaurantBusinessHour> hours) {
        if (hours == null || hours.isEmpty()) {
            return false;
        }
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        int today = now.getDayOfWeek().getValue() % 7;
        java.time.LocalTime nowTime = now.toLocalTime();
        return hours.stream()
                .filter(h -> h.getDayOfWeek() != null && h.getDayOfWeek() == today)
                .anyMatch(h -> !Boolean.TRUE.equals(h.getIsClosed())
                        && h.getOpenTime() != null && h.getCloseTime() != null
                        && !nowTime.isBefore(h.getOpenTime()) && !nowTime.isAfter(h.getCloseTime()));
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        if (keyword.length() > MAX_KEYWORD_LENGTH) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "keyword는 최대 " + MAX_KEYWORD_LENGTH + "자까지 입력할 수 있습니다.");
        }
        return keyword;
    }

    // favorite 필드용 선택적 인증(001-02 5-0장/8장): 헤더가 없거나 무효(만료/위조/로그아웃됨)해도 에러를
    // 던지지 않고 비로그인으로 취급한다 — 이 API들은 로그인 여부와 무관하게 계속 공개로 동작해야 하기 때문.
    private Long resolveMemberIdOrNull(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        try {
            Claims claims = jwtProvider.parseClaims(accessToken);
            if (!accessTokenSessionService.isActive(claims.getId())) {
                return null;
            }
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
