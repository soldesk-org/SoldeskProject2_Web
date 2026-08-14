package com.foodtrip.foodsearch.member.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.member.dto.PasswordResetConfirmRequestDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetConfirmResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetLinkOpenedResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetPollResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetRequestDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetResponseDto;
import com.foodtrip.foodsearch.member.service.MemberService;

import jakarta.validation.Valid;

// REST 라우팅 전면 개편(2026-08-14) — 비밀번호 재설정을 "토큰" 리소스로 모델링.
// 기존 /api/members/password-reset/** 가 여기로 이동(로직은 MemberService 그대로 재사용).
@RestController
@RequestMapping("/api/password-reset-tokens")
public class PasswordResetController {

    private final MemberService memberService;

    public PasswordResetController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping
    public PasswordResetResponseDto requestPasswordReset(@Valid @RequestBody PasswordResetRequestDto request) {
        return memberService.requestPasswordReset(request);
    }

    // 다른 탭(이메일 링크)에서 인증이 확인됐는지 폴링(2026-08-04 신규) — find-password-sent.html 전용.
    @GetMapping("/poll-status")
    public PasswordResetPollResponseDto pollPasswordReset(@RequestParam String pollKey) {
        return memberService.pollPasswordReset(pollKey);
    }

    // 이메일 링크(find-password-reset.html?token=...)가 열렸을 때 호출 — 실제 토큰은 소비하지 않는다.
    @PostMapping("/view-events")
    public PasswordResetLinkOpenedResponseDto confirmPasswordResetLinkOpened(@RequestParam String token) {
        return memberService.confirmPasswordResetLinkOpened(token);
    }

    @PutMapping("/consumption")
    public PasswordResetConfirmResponseDto confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequestDto request) {
        return memberService.confirmPasswordReset(request);
    }
}
