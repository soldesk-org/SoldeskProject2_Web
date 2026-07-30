package com.foodtrip.foodsearch.mypage.service;

import java.util.List;

import com.foodtrip.foodsearch.mypage.dto.MyPagePlaceResponseDto;
import com.foodtrip.foodsearch.mypage.dto.MyPageReviewResponseDto;
import com.foodtrip.foodsearch.mypage.dto.MyPageSearchHistoryResponseDto;

public interface MyPageService {

    List<MyPagePlaceResponseDto> getFavorites(String authorizationHeader);

    List<MyPageReviewResponseDto> getReviews(String authorizationHeader);

    List<MyPagePlaceResponseDto> getVisits(String authorizationHeader);

    List<MyPageSearchHistoryResponseDto> getSearchHistories(String authorizationHeader);

    void deleteSearchHistory(Long searchHistoryId, String authorizationHeader);

    void clearSearchHistories(String authorizationHeader);
}
