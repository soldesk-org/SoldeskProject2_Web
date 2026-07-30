package com.foodtrip.foodsearch.parking.service;

import java.math.BigDecimal;
import java.util.List;

import com.foodtrip.foodsearch.parking.dto.ParkingLotResponseDto;

public interface ParkingLotService {

    List<ParkingLotResponseDto> findNearby(BigDecimal latitude, BigDecimal longitude, Integer radiusM);
}
