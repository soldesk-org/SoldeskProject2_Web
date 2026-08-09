package com.foodtrip.foodsearch.shortlink.controller;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.shortlink.dto.CreateShortLinkRequestDto;
import com.foodtrip.foodsearch.shortlink.dto.ShortLinkResponseDto;
import com.foodtrip.foodsearch.shortlink.service.ShortLinkService;

import jakarta.validation.Valid;

// 단축 URL(2026-08-09 추가) — 음식점 상세/AI 추천 공유 링크가 shopId/name/category/address/좌표까지
// 전부 쿼리스트링에 실려 너무 길다는 지적으로 도입. 로그인 여부와 무관하게 공개 API(공유 자체가 로그인
// 없이도 되는 기존 동작을 그대로 유지). "/s/{code}"는 PageRoutingController의 단일 세그먼트 페이지
// 화이트리스트 라우팅과 경로 형태(슬래시 2개)가 달라 겹치지 않는다.
@RestController
public class ShortLinkController {

    private final ShortLinkService shortLinkService;

    public ShortLinkController(ShortLinkService shortLinkService) {
        this.shortLinkService = shortLinkService;
    }

    @PostMapping("/api/short-links")
    public ShortLinkResponseDto create(@Valid @RequestBody CreateShortLinkRequestDto request) {
        String code = shortLinkService.createOrReuse(request.getPath());
        return new ShortLinkResponseDto(code, request.getPath());
    }

    @GetMapping("/s/{code}")
    public ResponseEntity<Void> redirect(@PathVariable String code) {
        String targetPath = shortLinkService.resolve(code);
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create("/" + targetPath)).build();
    }
}
