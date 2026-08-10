package com.foodtrip.foodsearch.restaurant.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.restaurant.dto.CategoryResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.CreateMenuRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.MenuListResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.OwnerMenuResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantDetailResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantImageResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantListResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.UpdateBusinessHoursRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.UpdateMenuRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.UpdateRestaurantExtrasRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.UpdateRestaurantPhoneRequestDto;
import com.foodtrip.foodsearch.restaurant.service.MenuService;
import com.foodtrip.foodsearch.restaurant.service.RestaurantOwnerService;
import com.foodtrip.foodsearch.restaurant.service.RestaurantService;

import jakarta.validation.Valid;

// 001-02(음식점-메뉴-검색) 5장. 목록/상세/검색/메뉴/주변조회는 전부 공개 API(로그인 불필요) —
// favorite 필드만 Authorization 헤더가 있을 때 선택적으로 채워진다(5-0장). 전화/영업시간/메뉴/사진
// 쓰기 API(2026-07-20 추가)는 반대로 로그인 필수 + 그 음식점의 ACTIVE 관리자만 가능(RestaurantOwnerService).
// 2026-07-21: restaurantId는 카카오 로컬 API의 place id(문자열)이고, 검색/목록/주변조회는 DB 저장 없이
// 매 요청 카카오를 라이브로 호출한다(001-05, 카카오 운영정책상 결과 저장 금지) — /sync, /sync-area 트리거
// 엔드포인트는 그래서 폐지함.
@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final RestaurantService restaurantService;
    private final MenuService menuService;
    private final RestaurantOwnerService restaurantOwnerService;

    public RestaurantController(RestaurantService restaurantService, MenuService menuService,
                                 RestaurantOwnerService restaurantOwnerService) {
        this.restaurantService = restaurantService;
        this.menuService = menuService;
        this.restaurantOwnerService = restaurantOwnerService;
    }

    @GetMapping
    public RestaurantListResponseDto list(@RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size,
                                           @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantService.list(page, size, authorizationHeader);
    }

    // 카테고리 버튼 목록(2026-07-21 추가). categoryId가 환경마다 달라질 수 있어 프론트가 이 API로 받아써야 함.
    @GetMapping("/categories")
    public List<CategoryResponseDto> listCategories() {
        return restaurantService.listCategories();
    }

    // 음식점명·메뉴명 검색(1-1장, 2026-07-20 필터와 분리 확정) — keyword 전용, 카카오 키워드 검색 라이브 호출.
    // minLat/maxLat/minLng/maxLng는 지도 뷰포트를 넘기면 그 범위로 좁혀서 검색하는 선택 파라미터.
    // type(2026-08-03 추가): all(기본, 가게명+메뉴명 모두)|shop(가게명만)|menu(메뉴명만).
    @GetMapping("/search")
    public RestaurantListResponseDto search(@RequestParam(required = false) String keyword,
                                             @RequestParam(required = false) BigDecimal minLat,
                                             @RequestParam(required = false) BigDecimal maxLat,
                                             @RequestParam(required = false) BigDecimal minLng,
                                             @RequestParam(required = false) BigDecimal maxLng,
                                             @RequestParam(required = false) Boolean openNow,
                                             @RequestParam(defaultValue = "all") String type,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size,
                                             @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantService.search(keyword, minLat, maxLat, minLng, maxLng, openNow, type, page, size, authorizationHeader);
    }

    // 카테고리·가격대 필터(1-1장, 2026-07-20 신규). 카카오 카테고리(bbox) 검색을 라이브로 호출하므로
    // minLat/maxLat/minLng/maxLng 4개는 이제 필수다(2026-07-21).
    @GetMapping("/filter")
    public RestaurantListResponseDto filter(@RequestParam(required = false) Long categoryId,
                                             @RequestParam(required = false) Integer minPrice,
                                             @RequestParam(required = false) Integer maxPrice,
                                             @RequestParam(required = false) BigDecimal minLat,
                                             @RequestParam(required = false) BigDecimal maxLat,
                                             @RequestParam(required = false) BigDecimal minLng,
                                             @RequestParam(required = false) BigDecimal maxLng,
                                             @RequestParam(required = false) Boolean openNow,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size,
                                             @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantService.filter(categoryId, minPrice, maxPrice, minLat, maxLat, minLng, maxLng,
                openNow, page, size, authorizationHeader);
    }

    @GetMapping("/nearby")
    public RestaurantListResponseDto nearby(@RequestParam BigDecimal latitude,
                                             @RequestParam BigDecimal longitude,
                                             @RequestParam(required = false) Double radiusKm,
                                             @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantService.nearby(latitude, longitude, radiusKm, authorizationHeader);
    }

    // 상세 조회(2026-07-21 개편) — 카카오가 place id 단건 재조회를 지원하지 않아, 프론트가 검색 결과에서
    // 이미 들고 있는 name/address/roadAddress/latitude/longitude를 그대로 넘겨받는다(선택 — 없으면 그
    // 필드들만 null로 내려감). 값 자체를 서버가 어딘가에 저장하지는 않는다(요청 처리 중에만 사용).
    @GetMapping("/{restaurantId}")
    public RestaurantDetailResponseDto getDetail(@PathVariable String restaurantId,
                                                  @RequestParam(required = false) String name,
                                                  @RequestParam(required = false) String address,
                                                  @RequestParam(required = false) String roadAddress,
                                                  @RequestParam(required = false) BigDecimal latitude,
                                                  @RequestParam(required = false) BigDecimal longitude,
                                                  @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantService.getDetail(restaurantId, authorizationHeader, name, address, roadAddress, latitude, longitude);
    }

    @GetMapping("/{restaurantId}/menus")
    public MenuListResponseDto getMenus(@PathVariable String restaurantId) {
        return menuService.getMenus(restaurantId);
    }

    // ---- 사업자 등록(2026-07-20 요구사항 추가) — 로그인 필수 + 이 음식점의 ACTIVE 관리자만 가능 ----

    @PatchMapping("/{restaurantId}/phone")
    public RestaurantDetailResponseDto updatePhone(@PathVariable String restaurantId,
                                                     @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                     @Valid @RequestBody UpdateRestaurantPhoneRequestDto request) {
        return restaurantOwnerService.updatePhone(restaurantId, authorizationHeader, request.getPhone());
    }

    // 매장 소개/편의시설(2026-08-09 추가) — 사업자 마이페이지 "매장 정보" 탭에서 저장 API가 없어
    // 비활성화돼 있던 두 필드를 실제로 저장하게 함.
    @PatchMapping("/{restaurantId}/extras")
    public RestaurantDetailResponseDto updateExtras(@PathVariable String restaurantId,
                                                       @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                       @Valid @RequestBody UpdateRestaurantExtrasRequestDto request) {
        return restaurantOwnerService.updateExtras(restaurantId, authorizationHeader, request.getDescription(),
                request.getAmenities());
    }

    // 요일별 개별 API 대신 7일치를 통째로 교체(001-02 3장 원칙과 동일하게 필요한 만큼만 단순하게).
    @PutMapping("/{restaurantId}/business-hours")
    public RestaurantDetailResponseDto replaceBusinessHours(@PathVariable String restaurantId,
                                                               @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                               @Valid @RequestBody UpdateBusinessHoursRequestDto request) {
        return restaurantOwnerService.replaceBusinessHours(restaurantId, authorizationHeader, request.getBusinessHours());
    }

    @PostMapping("/{restaurantId}/menus")
    public RestaurantDetailResponseDto createMenu(@PathVariable String restaurantId,
                                                    @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                    @Valid @RequestBody CreateMenuRequestDto request) {
        return restaurantOwnerService.createMenu(restaurantId, authorizationHeader, request);
    }

    @PatchMapping("/{restaurantId}/menus/{menuId}")
    public RestaurantDetailResponseDto updateMenu(@PathVariable String restaurantId, @PathVariable Long menuId,
                                                    @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                    @Valid @RequestBody UpdateMenuRequestDto request) {
        return restaurantOwnerService.updateMenu(restaurantId, menuId, authorizationHeader, request);
    }

    @DeleteMapping("/{restaurantId}/menus/{menuId}")
    public RestaurantDetailResponseDto deleteMenu(@PathVariable String restaurantId, @PathVariable Long menuId,
                                                    @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantOwnerService.deleteMenu(restaurantId, menuId, authorizationHeader);
    }

    @PostMapping(value = "/{restaurantId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RestaurantDetailResponseDto uploadImage(@PathVariable String restaurantId,
                                                     @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                     @RequestParam("image") MultipartFile image) {
        return restaurantOwnerService.uploadImage(restaurantId, authorizationHeader, image);
    }

    @DeleteMapping("/{restaurantId}/image")
    public RestaurantDetailResponseDto deleteImage(@PathVariable String restaurantId,
                                                     @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantOwnerService.deleteImage(restaurantId, authorizationHeader);
    }

    // 사업자 마이페이지 "메뉴 관리"(2026-08-06 추가) — 판매중지 메뉴 포함 전체 목록.
    @GetMapping("/{restaurantId}/menus/mine")
    public List<OwnerMenuResponseDto> listMyMenus(@PathVariable String restaurantId,
                                                    @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantOwnerService.listMyMenus(restaurantId, authorizationHeader);
    }

    // 사업자 마이페이지 "사진 관리"(2026-08-06 추가) — 최대 4장 갤러리.
    @GetMapping("/{restaurantId}/images")
    public List<RestaurantImageResponseDto> listGalleryImages(@PathVariable String restaurantId,
                                                                 @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantOwnerService.listGalleryImages(restaurantId, authorizationHeader);
    }

    @PostMapping(value = "/{restaurantId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<RestaurantImageResponseDto> addGalleryImage(@PathVariable String restaurantId,
                                                               @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                               @RequestParam("image") MultipartFile image) {
        return restaurantOwnerService.addGalleryImage(restaurantId, authorizationHeader, image);
    }

    @DeleteMapping("/{restaurantId}/images/{imageId}")
    public List<RestaurantImageResponseDto> deleteGalleryImage(@PathVariable String restaurantId, @PathVariable Long imageId,
                                                                  @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantOwnerService.deleteGalleryImage(restaurantId, imageId, authorizationHeader);
    }

    @PatchMapping("/{restaurantId}/images/{imageId}/main")
    public List<RestaurantImageResponseDto> setMainGalleryImage(@PathVariable String restaurantId, @PathVariable Long imageId,
                                                                    @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return restaurantOwnerService.setMainGalleryImage(restaurantId, imageId, authorizationHeader);
    }
}
