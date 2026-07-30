package com.foodtrip.foodsearch.directions.controller;

import java.math.BigDecimal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.directions.client.NcpDirectionsClient;
import com.foodtrip.foodsearch.directions.dto.DirectionsResponseDto;

// 16(길찾기) — 15(주차장-정보)의 ParkingLotController와 같은 톤: 공개 API(로그인 불필요), 음식점 상세
// DTO를 확장하지 않고 별도 엔드포인트로 분리. 프론트가 사용자 현재 위치(startLat/startLng)와 음식점
// 좌표(goalLat/goalLng)를 넘기면, 서버가 NCP Direction 5를 대신 호출해서 경로를 돌려준다.
@RestController
public class DirectionsController {

    private final NcpDirectionsClient ncpDirectionsClient;

    public DirectionsController(NcpDirectionsClient ncpDirectionsClient) {
        this.ncpDirectionsClient = ncpDirectionsClient;
    }

    @GetMapping("/api/directions")
    public DirectionsResponseDto findRoute(@RequestParam BigDecimal startLat, @RequestParam BigDecimal startLng,
                                            @RequestParam BigDecimal goalLat, @RequestParam BigDecimal goalLng) {
        return ncpDirectionsClient.findRoute(startLat, startLng, goalLat, goalLng);
    }
}
