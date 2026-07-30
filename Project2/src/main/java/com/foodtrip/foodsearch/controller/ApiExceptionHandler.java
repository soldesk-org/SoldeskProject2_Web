package com.foodtrip.foodsearch.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.foodtrip.foodsearch.dto.ApiErrorDTO;

/**
 * 잘못된 음BTI 답변을 서버 오류(500)가 아닌 요청 오류(400)로 변환합니다.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorDTO> handleIllegalArgument(IllegalArgumentException exception) {
        ApiErrorDTO error = new ApiErrorDTO(
                "INVALID_FOOD_BTI_ANSWER",
                exception.getMessage());

        return ResponseEntity.badRequest().body(error);
    }
}
