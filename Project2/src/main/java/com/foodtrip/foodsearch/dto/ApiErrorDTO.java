package com.foodtrip.foodsearch.dto;


 //API 오류를 프론트에 일정한 JSON 형식으로 전달합니다.

public class ApiErrorDTO {

    private String code;
    private String message;

    public ApiErrorDTO() {
    }

    public ApiErrorDTO(String code, String message) {
        this.code = code;
        this.message = message;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
