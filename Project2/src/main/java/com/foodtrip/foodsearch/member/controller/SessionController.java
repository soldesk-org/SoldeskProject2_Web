package com.foodtrip.foodsearch.member.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.foodtrip.foodsearch.member.dto.LoginRequestDto;
import com.foodtrip.foodsearch.member.dto.LoginResponseDto;
import com.foodtrip.foodsearch.member.dto.LogoutRequestDto;
import com.foodtrip.foodsearch.member.dto.LogoutResponseDto;
import com.foodtrip.foodsearch.member.dto.RefreshRequestDto;
import com.foodtrip.foodsearch.member.dto.RefreshResponseDto;
import com.foodtrip.foodsearch.member.service.MemberService;

import jakarta.validation.Valid;

// REST 라우팅 전면 개편(2026-08-14) — 로그인/로그아웃/토큰 재발급을 "세션" 리소스로 모델링.
// 기존 /api/members/login, /refresh, /logout 이 여기로 이동(로직은 MemberService 그대로 재사용).
@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final MemberService memberService;

    public SessionController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping
    public LoginResponseDto login(@Valid @RequestBody LoginRequestDto request) {
        return memberService.login(request);
    }

    @PostMapping("/refresh-tokens")
    public RefreshResponseDto refresh(@Valid @RequestBody RefreshRequestDto request) {
        return memberService.refresh(request);
    }

    @DeleteMapping
    public LogoutResponseDto logout(@Valid @RequestBody LogoutRequestDto request) {
        return memberService.logout(request);
    }
}
