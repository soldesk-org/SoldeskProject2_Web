package com.foodtrip.foodsearch.mail.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.mail.dto.MailResponseDto;
import com.foodtrip.foodsearch.mail.dto.SendCodeRequestDto;
import com.foodtrip.foodsearch.mail.dto.VerifyCodeRequestDto;
import com.foodtrip.foodsearch.mail.service.EmailAuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/mail")
public class EmailAuthController {

    private final EmailAuthService emailAuthService;

    public EmailAuthController(EmailAuthService emailAuthService) {
        this.emailAuthService = emailAuthService;
    }

    @PostMapping("/verification-codes")
    public MailResponseDto sendCode(@Valid @RequestBody SendCodeRequestDto request) {
        emailAuthService.sendVerificationCode(request.getEmail());
        return new MailResponseDto(true, "인증번호가 발송되었습니다.");
    }

    @PostMapping("/verification-codes/confirmation")
    public MailResponseDto verifyCode(@Valid @RequestBody VerifyCodeRequestDto request) {
        emailAuthService.verifyCode(request.getEmail(), request.getCode());
        return new MailResponseDto(true, "이메일 인증이 완료되었습니다.");
    }
}
