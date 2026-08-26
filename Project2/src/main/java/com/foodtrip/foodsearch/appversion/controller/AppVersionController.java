package com.foodtrip.foodsearch.appversion.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.appversion.dto.AppVersionResponseDto;
import com.foodtrip.foodsearch.appversion.dto.ReportBuildRequestDto;
import com.foodtrip.foodsearch.appversion.service.AppVersionService;

/**
 * iOS 앱 최신 빌드 조회/보고 엔드포인트(2026-08-26 신규). 로그인 불필요(SecurityConfig에서 /api/admin/**
 * 외에는 permitAll). 앱은 실행 시 자기 빌드를 보고하고, 웹은 응답의 최신 빌드와 설치된 빌드를 비교해
 * 업데이트 팝업 여부를 결정한다.
 */
@RestController
@RequestMapping("/api/app")
public class AppVersionController {

    private final AppVersionService appVersionService;

    public AppVersionController(AppVersionService appVersionService) {
        this.appVersionService = appVersionService;
    }

    // 앱이 자기 빌드 번호를 보고하면 최댓값을 갱신하고 최신 빌드 번호를 돌려준다.
    // build가 없으면(웹 등) 현재 최신 빌드 번호만 돌려준다.
    @PostMapping("/version")
    public AppVersionResponseDto report(@RequestBody(required = false) ReportBuildRequestDto request) {
        Long build = request != null ? request.getBuild() : null;
        long latest = (build != null && build > 0)
                ? appVersionService.reportAndGetLatest(build)
                : appVersionService.getLatest();
        return new AppVersionResponseDto(latest);
    }

    // 조회 전용(보고 없이 최신 빌드만).
    @GetMapping("/version")
    public AppVersionResponseDto latest() {
        return new AppVersionResponseDto(appVersionService.getLatest());
    }
}
