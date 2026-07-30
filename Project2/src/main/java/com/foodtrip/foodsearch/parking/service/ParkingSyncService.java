package com.foodtrip.foodsearch.parking.service;

import com.foodtrip.foodsearch.parking.dto.ParkingSyncResponseDto;

public interface ParkingSyncService {

    ParkingSyncResponseDto sync(int maxPages);
}
