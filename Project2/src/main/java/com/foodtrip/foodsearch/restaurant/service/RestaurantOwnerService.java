package com.foodtrip.foodsearch.restaurant.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.restaurant.dto.BusinessHourItemDto;
import com.foodtrip.foodsearch.restaurant.dto.CreateMenuRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.RestaurantDetailResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.UpdateMenuRequestDto;

// 사업자 등록(2026-07-20 요구사항 추가) — restaurant_managers에 ACTIVE로 연결된(귀속된) 음식점만
// 본인이 직접 전화번호/영업시간/메뉴/사진을 수정할 수 있다(001-02 8장에서 열어뒀던 질문의 답).
// restaurantId는 2026-07-21부터 카카오 로컬 API의 place id(문자열)이다.
public interface RestaurantOwnerService {

    RestaurantDetailResponseDto updatePhone(String restaurantId, String authorizationHeader, String phone);

    RestaurantDetailResponseDto replaceBusinessHours(String restaurantId, String authorizationHeader,
                                                       List<BusinessHourItemDto> businessHours);

    RestaurantDetailResponseDto createMenu(String restaurantId, String authorizationHeader, CreateMenuRequestDto request);

    RestaurantDetailResponseDto updateMenu(String restaurantId, Long menuId, String authorizationHeader,
                                            UpdateMenuRequestDto request);

    RestaurantDetailResponseDto deleteMenu(String restaurantId, Long menuId, String authorizationHeader);

    RestaurantDetailResponseDto uploadImage(String restaurantId, String authorizationHeader, MultipartFile file);

    RestaurantDetailResponseDto deleteImage(String restaurantId, String authorizationHeader);
}
