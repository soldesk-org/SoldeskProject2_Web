package com.foodtrip.foodsearch.member.dto;

public class MyProfileResponseDto {

    private final boolean success;
    private final String email;
    private final String nickname;
    private final String profileImageUrl;
    // 마이페이지(11) 추가(2026-07-22) — 기존엔 GET /me 응답에서 의도적으로 뺐던 필드지만(005 3-1장),
    // 마이페이지는 본인 정보 화면이라 그대로 노출해도 문제 없어 이 시점에 추가함.
    private final String phone;
    private final String foodBti;
    // 마이페이지 프로필 수정 UI(2026-07-22 추가) — 소셜 계정이면 프론트가 비밀번호 입력 필드 자체를
    // 아예 숨길 수 있도록. 실제 차단 로직(SOCIAL_ACCOUNT_PASSWORD_CHANGE_NOT_ALLOWED)은 이미
    // updateProfile()에 있으니 이 필드는 UI를 위한 사전 안내용이다.
    private final boolean social;

    public MyProfileResponseDto(boolean success, String email, String nickname, String profileImageUrl,
                                 String phone, String foodBti, boolean social) {
        this.success = success;
        this.email = email;
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
        this.phone = phone;
        this.foodBti = foodBti;
        this.social = social;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getEmail() {
        return email;
    }

    public String getNickname() {
        return nickname;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public String getPhone() {
        return phone;
    }

    public String getFoodBti() {
        return foodBti;
    }

    public boolean isSocial() {
        return social;
    }
}
