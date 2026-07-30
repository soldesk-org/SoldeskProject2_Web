package com.foodtrip.foodsearch.phone.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.common.web.ClientIpUtil;
import com.foodtrip.foodsearch.phone.dto.PhoneResponseDto;
import com.foodtrip.foodsearch.phone.dto.SendPhoneCodeRequestDto;
import com.foodtrip.foodsearch.phone.dto.VerifyPhoneCodeRequestDto;
import com.foodtrip.foodsearch.phone.service.PhoneAuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/phone")
public class PhoneAuthController {

    private final PhoneAuthService phoneAuthService;

    public PhoneAuthController(PhoneAuthService phoneAuthService) {
        this.phoneAuthService = phoneAuthService;
    }

    @PostMapping("/send-code")
    public PhoneResponseDto sendCode(@Valid @RequestBody SendPhoneCodeRequestDto request, HttpServletRequest httpRequest) {
        phoneAuthService.sendSignupVerificationCode(request.getEmail(), request.getPhone(), ClientIpUtil.resolve(httpRequest));
        return new PhoneResponseDto(true, "인증번호가 발송되었습니다.");
    }

    @PostMapping("/verify-code")
    public PhoneResponseDto verifyCode(@Valid @RequestBody VerifyPhoneCodeRequestDto request) {
        phoneAuthService.verifySignupCode(request.getEmail(), request.getPhone(), request.getCode());
        return new PhoneResponseDto(true, "전화번호 인증이 완료되었습니다.");
    }
}
