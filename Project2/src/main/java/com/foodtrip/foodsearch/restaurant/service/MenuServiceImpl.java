package com.foodtrip.foodsearch.restaurant.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.restaurant.dto.MenuListResponseDto;
import com.foodtrip.foodsearch.restaurant.dto.MenuResponseDto;
import com.foodtrip.foodsearch.restaurant.entity.Menu;
import com.foodtrip.foodsearch.restaurant.entity.MenuImage;
import com.foodtrip.foodsearch.restaurant.repository.MenuImageRepository;
import com.foodtrip.foodsearch.restaurant.repository.MenuRepository;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;

@Service
@Transactional(readOnly = true)
public class MenuServiceImpl implements MenuService {

    private final RestaurantRepository restaurantRepository;
    private final MenuRepository menuRepository;
    private final MenuImageRepository menuImageRepository;

    public MenuServiceImpl(RestaurantRepository restaurantRepository, MenuRepository menuRepository,
                            MenuImageRepository menuImageRepository) {
        this.restaurantRepository = restaurantRepository;
        this.menuRepository = menuRepository;
        this.menuImageRepository = menuImageRepository;
    }

    @Override
    public MenuListResponseDto getMenus(String restaurantId) {
        // 음식점 자체가 없으면 404, 메뉴가 없는 것뿐이면 빈 배열(001-02 2-4-4장) — 이 둘을 구분하기 위해
        // 존재 확인만 먼저 한다.
        restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESTAURANT_NOT_FOUND));

        List<Menu> menus = menuRepository
                .findByRestaurantIdAndIsAvailableTrueAndDeletedAtIsNullOrderByIsSignatureDescPriceAsc(restaurantId);
        // 메뉴 사진(2026-08-10, 최대 3장) — 첫 번째 사진만 고객용 카드 썸네일로 사용(001-04 참고).
        List<Long> menuIds = menus.stream().map(Menu::getMenuId).collect(Collectors.toList());
        Map<Long, String> firstImageByMenuId = menuImageRepository.findByMenuIdInOrderByMenuImageIdAsc(menuIds).stream()
                .collect(Collectors.toMap(MenuImage::getMenuId, MenuImage::getImageUrl, (first, second) -> first));

        List<MenuResponseDto> menuDtos = menus.stream()
                .map(m -> toMenuDto(m, firstImageByMenuId.get(m.getMenuId())))
                .collect(Collectors.toList());
        return new MenuListResponseDto(restaurantId, menuDtos);
    }

    private MenuResponseDto toMenuDto(Menu menu, String imageUrl) {
        return new MenuResponseDto(menu.getMenuId(), menu.getMenuName(), menu.getPrice(),
                menu.getDescription(), imageUrl, menu.getIsSignature());
    }
}
