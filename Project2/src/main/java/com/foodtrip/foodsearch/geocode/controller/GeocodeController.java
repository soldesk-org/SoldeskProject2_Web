package com.foodtrip.foodsearch.geocode.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.geocode.client.NcpGeocodingClient;
import com.foodtrip.foodsearch.geocode.dto.GeocodeResponseDto;

// 사업자 회원가입 STEP2 주소 검색(2026-08-04 신규) — 16(길찾기)의 DirectionsController와 같은 톤:
// 공개 API(로그인 불필요), 서버 전용 NCP 인증을 프론트 대신 처리해주는 얇은 프록시.
@RestController
public class GeocodeController {

    private final NcpGeocodingClient ncpGeocodingClient;

    public GeocodeController(NcpGeocodingClient ncpGeocodingClient) {
        this.ncpGeocodingClient = ncpGeocodingClient;
    }

    @GetMapping("/api/geocode")
    public GeocodeResponseDto geocode(@RequestParam String query) {
        return ncpGeocodingClient.geocode(query);
    }
}
