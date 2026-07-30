package com.foodtrip.foodsearch.parking.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.parking.dto.ParkingLotResponseDto;
import com.foodtrip.foodsearch.parking.service.ParkingLotService;

// 15(주차장-정보) — 07(음식점 상세)과 별도의 공개 API로 둔다(로그인 불필요). 음식점 상세 화면에서 그
// 음식점의 좌표(카카오 응답값, 07 001-02 5-2장)를 그대로 이 API에 넘기면 된다 — RestaurantDetailResponseDto를
// 직접 확장하지 않고 별도 엔드포인트로 분리해서, 이미 여러 곳에서 쓰는 그 DTO의 생성자를 건드리지 않았다.
@RestController
public class ParkingLotController {

    private final ParkingLotService parkingLotService;

    public ParkingLotController(ParkingLotService parkingLotService) {
        this.parkingLotService = parkingLotService;
    }

    @GetMapping("/api/parking-lots/nearby")
    public List<ParkingLotResponseDto> findNearby(@RequestParam BigDecimal latitude,
                                                    @RequestParam BigDecimal longitude,
                                                    @RequestParam(required = false) Integer radiusM) {
        return parkingLotService.findNearby(latitude, longitude, radiusM);
    }
}
