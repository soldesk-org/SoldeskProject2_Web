package com.foodtrip.foodsearch.restaurant.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.restaurant.dto.FavoriteAddRequestDto;
import com.foodtrip.foodsearch.restaurant.dto.FavoriteResponseDto;
import com.foodtrip.foodsearch.restaurant.service.FavoriteService;

import jakarta.validation.Valid;

// 즐겨찾기 등록/해제(마이페이지 11, 2026-07-22 추가). 로그인 필수 — FavoriteServiceImpl 참고.
@RestController
@RequestMapping("/api/restaurants/{restaurantId}/favorite")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @PostMapping
    public FavoriteResponseDto add(@PathVariable String restaurantId,
                                    @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                    @Valid @RequestBody FavoriteAddRequestDto request) {
        return favoriteService.add(restaurantId, authorizationHeader, request);
    }

    @DeleteMapping
    public FavoriteResponseDto remove(@PathVariable String restaurantId,
                                       @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return favoriteService.remove(restaurantId, authorizationHeader);
    }
}
