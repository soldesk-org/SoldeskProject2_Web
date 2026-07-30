package com.foodtrip.foodsearch.mypage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.mypage.dto.MyPagePlaceResponseDto;
import com.foodtrip.foodsearch.mypage.dto.MyPageReviewResponseDto;
import com.foodtrip.foodsearch.mypage.dto.MyPageSearchHistoryResponseDto;
import com.foodtrip.foodsearch.mypage.service.MyPageService;

// 마이페이지(11) 001-02 3장. 전부 로그인 필수 — 본인 데이터만 조회.
@RestController
@RequestMapping("/api/mypage")
public class MyPageController {

    private final MyPageService myPageService;

    public MyPageController(MyPageService myPageService) {
        this.myPageService = myPageService;
    }

    @GetMapping("/favorites")
    public List<MyPagePlaceResponseDto> getFavorites(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return myPageService.getFavorites(authorizationHeader);
    }

    @GetMapping("/reviews")
    public List<MyPageReviewResponseDto> getReviews(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return myPageService.getReviews(authorizationHeader);
    }

    @GetMapping("/visits")
    public List<MyPagePlaceResponseDto> getVisits(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return myPageService.getVisits(authorizationHeader);
    }

    @GetMapping("/search-histories")
    public List<MyPageSearchHistoryResponseDto> getSearchHistories(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return myPageService.getSearchHistories(authorizationHeader);
    }

    @DeleteMapping("/search-histories/{searchHistoryId}")
    public ResponseEntity<Void> deleteSearchHistory(@PathVariable Long searchHistoryId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        myPageService.deleteSearchHistory(searchHistoryId, authorizationHeader);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/search-histories")
    public ResponseEntity<Void> clearSearchHistories(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        myPageService.clearSearchHistories(authorizationHeader);
        return ResponseEntity.noContent().build();
    }
}
