package com.foodtrip.foodsearch.admin.service;

import java.util.List;

import com.foodtrip.foodsearch.admin.dto.SystemStatusItemDto;

public interface SystemStatusService {

    List<SystemStatusItemDto> checkAll();
}
