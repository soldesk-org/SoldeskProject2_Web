package com.foodtrip.foodsearch.restaurant.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.restaurant.dto.BusinessHourItemDto;
import com.foodtrip.foodsearch.restaurant.dto.CreateMenuRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.OwnerMenuResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantDetailResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantImageResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.UpdateMenuRequestDto;

// 사업자 등록(2026-07-20 요구사항 추가) — restaurant_managers에 ACTIVE로 연결된(귀속된) 음식점만
// 본인이 직접 전화번호/영업시간/메뉴/사진을 수정할 수 있다(001-02 8장에서 열어뒀던 질문의 답).
// restaurantId는 2026-07-21부터 카카오 로컬 API의 place id(문자열)이다.
public interface RestaurantOwnerService {

    RestaurantDetailResponseDto updatePhone(String restaurantId, String authorizationHeader, String phone);

    // 매장 소개/편의시설 수정(2026-08-09 추가) — amenities는 콤마 구분 문자열로 저장(Restaurant.amenities).
    RestaurantDetailResponseDto updateExtras(String restaurantId, String authorizationHeader, String description,
                                              List<String> amenities, String priceRange);

    RestaurantDetailResponseDto replaceBusinessHours(String restaurantId, String authorizationHeader,
                                                       List<BusinessHourItemDto> businessHours);

    // 임시 휴업 토글(2026-08-10 추가) — 영업시간표와 무관하게 강제로 영업종료 처리한다.
    RestaurantDetailResponseDto updateOpenStatus(String restaurantId, String authorizationHeader, boolean tempClosed);

    RestaurantDetailResponseDto createMenu(String restaurantId, String authorizationHeader, CreateMenuRequestDto request);

    RestaurantDetailResponseDto updateMenu(String restaurantId, Long menuId, String authorizationHeader,
                                            UpdateMenuRequestDto request);

    RestaurantDetailResponseDto deleteMenu(String restaurantId, Long menuId, String authorizationHeader);

    RestaurantDetailResponseDto uploadImage(String restaurantId, String authorizationHeader, MultipartFile file);

    RestaurantDetailResponseDto deleteImage(String restaurantId, String authorizationHeader);

    // 사업자 마이페이지 "메뉴 관리"(2026-08-06 추가) — 판매중지 메뉴 포함 전체 목록.
    List<OwnerMenuResponseDto> listMyMenus(String restaurantId, String authorizationHeader);

    // 메뉴 사진(2026-08-10 추가, 최대 3장) — 리뷰 사진과 동일한 다중 업로드/개별 삭제 구조.
    List<OwnerMenuResponseDto> addMenuImages(String restaurantId, Long menuId, String authorizationHeader,
                                              List<MultipartFile> files);

    List<OwnerMenuResponseDto> deleteMenuImage(String restaurantId, Long menuId, Long menuImageId,
                                                String authorizationHeader);

    // 사업자 마이페이지 "사진 관리"(2026-08-06 추가) — 최대 4장 갤러리. 대표 지정 시 Restaurant.imageUrl과 동기화.
    List<RestaurantImageResponseDto> listGalleryImages(String restaurantId, String authorizationHeader);

    List<RestaurantImageResponseDto> addGalleryImage(String restaurantId, String authorizationHeader, MultipartFile file);

    List<RestaurantImageResponseDto> deleteGalleryImage(String restaurantId, Long imageId, String authorizationHeader);

    List<RestaurantImageResponseDto> setMainGalleryImage(String restaurantId, Long imageId, String authorizationHeader);
}
