package com.foodtrip.foodsearch.restaurant.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.restaurant.dto.MenuListResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.MenuResponseDto;
import com.foodtrip.foodsearch.restaurant.entity.Menu;
import com.foodtrip.foodsearch.restaurant.repository.MenuRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;

@Service
@Transactional(readOnly = true)
public class MenuServiceImpl implements MenuService {

    private final RestaurantRepository restaurantRepository;
    private final MenuRepository menuRepository;

    public MenuServiceImpl(RestaurantRepository restaurantRepository, MenuRepository menuRepository) {
        this.restaurantRepository = restaurantRepository;
        this.menuRepository = menuRepository;
    }

    @Override
    public MenuListResponseDto getMenus(String restaurantId) {
        // 음식점 자체가 없으면 404, 메뉴가 없는 것뿐이면 빈 배열(001-02 2-4-4장) — 이 둘을 구분하기 위해
        // 존재 확인만 먼저 한다.
        restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESTAURANT_NOT_FOUND));

        List<MenuResponseDto> menus = menuRepository
                .findByRestaurantIdAndIsAvailableTrueAndDeletedAtIsNullOrderByIsSignatureDescPriceAsc(restaurantId)
                .stream()
                .map(this::toMenuDto)
                .collect(Collectors.toList());
        return new MenuListResponseDto(restaurantId, menus);
    }

    private MenuResponseDto toMenuDto(Menu menu) {
        return new MenuResponseDto(menu.getMenuId(), menu.getMenuName(), menu.getPrice(),
                menu.getDescription(), menu.getImageUrl(), menu.getIsSignature());
    }
}
