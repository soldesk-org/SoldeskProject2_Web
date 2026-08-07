package com.foodtrip.foodsearch.member.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.common.web.ClientIpUtil;
import com.foodtrip.foodsearch.mail.dto.MailResponseDto;
import com.foodtrip.foodsearch.mail.dto.SendCodeRequestDto;
import com.foodtrip.foodsearch.mail.dto.VerifyCodeRequestDto;
import com.foodtrip.foodsearch.member.dto.BusinessSignUpRequestDto;
import com.foodtrip.foodsearch.member.dto.FindEmailRequestDto;
import com.foodtrip.foodsearch.member.dto.FindEmailResponseDto;
import com.foodtrip.foodsearch.member.dto.LoginRequestDto;
import com.foodtrip.foodsearch.member.dto.LoginResponseDto;
import com.foodtrip.foodsearch.member.dto.LogoutRequestDto;
import com.foodtrip.foodsearch.member.dto.LogoutResponseDto;
import com.foodtrip.foodsearch.member.dto.MyProfileResponseDto;
import com.foodtrip.foodsearch.member.dto.NicknameAvailabilityResponseDto;
import com.foodtrip.foodsearch.member.dto.NotificationSettingsResponseDto;
import com.foodtrip.foodsearch.member.dto.UpdateNotificationSettingsRequestDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetLinkOpenedResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetPollResponseDto;
import com.foodtrip.foodsearch.member.dto.ProfileImageResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetConfirmRequestDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetConfirmResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetRequestDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetResponseDto;
import com.foodtrip.foodsearch.member.dto.RefreshRequestDto;
import com.foodtrip.foodsearch.member.dto.RefreshResponseDto;
import com.foodtrip.foodsearch.member.dto.RevealEmailRequestDto;
import com.foodtrip.foodsearch.member.dto.RevealEmailResponseDto;
import com.foodtrip.foodsearch.member.dto.SendFindEmailPhoneCodeRequestDto;
import com.foodtrip.foodsearch.member.dto.SendProfilePhoneCodeRequestDto;
import com.foodtrip.foodsearch.member.dto.SignUpRequestDto;
import com.foodtrip.foodsearch.member.dto.SignUpResponseDto;
import com.foodtrip.foodsearch.member.dto.UpdateProfileRequestDto;
import com.foodtrip.foodsearch.member.dto.UpdateProfileResponseDto;
import com.foodtrip.foodsearch.member.dto.VerifyFindEmailPhoneCodeRequestDto;
import com.foodtrip.foodsearch.member.dto.VerifyPasswordRequestDto;
import com.foodtrip.foodsearch.member.dto.VerifyPasswordResponseDto;
import com.foodtrip.foodsearch.member.dto.VerifyProfilePhoneCodeRequestDto;
import com.foodtrip.foodsearch.member.dto.WithdrawRequestDto;
import com.foodtrip.foodsearch.member.dto.WithdrawResponseDto;
import com.foodtrip.foodsearch.member.service.MemberService;
import com.foodtrip.foodsearch.phone.dto.PhoneResponseDto;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping("/signup")
    public SignUpResponseDto signUp(@Valid @RequestBody SignUpRequestDto request) {
        return memberService.signUp(request);
    }

    // 닉네임 중복확인(회원가입 STEP2, 2026-08-04 신규) — 형식 검증은 최종 가입 제출 시 다시 하므로
    // 여기서는 중복 여부만 확인한다.
    @GetMapping("/check-nickname")
    public NicknameAvailabilityResponseDto checkNicknameAvailable(@RequestParam String nickname) {
        return memberService.checkNicknameAvailable(nickname);
    }

    @PostMapping(value = "/signup/business", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SignUpResponseDto signUpBusiness(@Valid @ModelAttribute BusinessSignUpRequestDto request,
                                             @RequestParam("businessLicenseFile") MultipartFile businessLicenseFile) {
        return memberService.signUpBusiness(request, businessLicenseFile);
    }

    @PostMapping("/login")
    public LoginResponseDto login(@Valid @RequestBody LoginRequestDto request) {
        return memberService.login(request);
    }

    @PostMapping("/refresh")
    public RefreshResponseDto refresh(@Valid @RequestBody RefreshRequestDto request) {
        return memberService.refresh(request);
    }

    @PostMapping("/logout")
    public LogoutResponseDto logout(@Valid @RequestBody LogoutRequestDto request) {
        return memberService.logout(request);
    }

    @PostMapping("/find-email")
    public FindEmailResponseDto findEmail(@Valid @RequestBody FindEmailRequestDto request) {
        return memberService.findEmail(request);
    }

    @PostMapping("/password-reset/request")
    public PasswordResetResponseDto requestPasswordReset(@Valid @RequestBody PasswordResetRequestDto request) {
        return memberService.requestPasswordReset(request);
    }

    // 다른 탭(이메일 링크)에서 인증이 확인됐는지 폴링(2026-08-04 신규) — find-password-sent.html 전용.
    @GetMapping("/password-reset/poll")
    public PasswordResetPollResponseDto pollPasswordReset(@RequestParam String pollKey) {
        return memberService.pollPasswordReset(pollKey);
    }

    // 이메일 링크(find-password-reset.html?token=...)가 열렸을 때 호출 — 실제 토큰은 소비하지 않는다.
    @PostMapping("/password-reset/confirm-click")
    public PasswordResetLinkOpenedResponseDto confirmPasswordResetLinkOpened(@RequestParam String token) {
        return memberService.confirmPasswordResetLinkOpened(token);
    }

    @PostMapping("/password-reset/confirm")
    public PasswordResetConfirmResponseDto confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequestDto request) {
        return memberService.confirmPasswordReset(request);
    }

    @PostMapping("/find-email/verify-phone/send-code")
    public PhoneResponseDto sendFindEmailPhoneCode(@Valid @RequestBody SendFindEmailPhoneCodeRequestDto request, HttpServletRequest httpRequest) {
        return memberService.sendFindEmailPhoneCode(request, ClientIpUtil.resolve(httpRequest));
    }

    @PostMapping("/find-email/verify-phone/confirm")
    public PhoneResponseDto verifyFindEmailPhoneCode(@Valid @RequestBody VerifyFindEmailPhoneCodeRequestDto request) {
        return memberService.verifyFindEmailPhoneCode(request);
    }

    @PostMapping("/find-email/reveal")
    public RevealEmailResponseDto revealEmail(@Valid @RequestBody RevealEmailRequestDto request) {
        return memberService.revealEmail(request);
    }

    @GetMapping("/me")
    public MyProfileResponseDto getMyProfile(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return memberService.getMyProfile(authorizationHeader);
    }

    @PostMapping("/me/email/send-code")
    public MailResponseDto sendProfileEmailCode(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                 @Valid @RequestBody SendCodeRequestDto request) {
        return memberService.sendProfileEmailCode(authorizationHeader, request);
    }

    @PostMapping("/me/email/verify-code")
    public MailResponseDto verifyProfileEmailCode(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                   @Valid @RequestBody VerifyCodeRequestDto request) {
        return memberService.verifyProfileEmailCode(authorizationHeader, request);
    }

    @PostMapping("/me/phone/send-code")
    public PhoneResponseDto sendProfilePhoneCode(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                  @Valid @RequestBody SendProfilePhoneCodeRequestDto request,
                                                  HttpServletRequest httpRequest) {
        return memberService.sendProfilePhoneCode(authorizationHeader, request, ClientIpUtil.resolve(httpRequest));
    }

    @PostMapping("/me/phone/verify-code")
    public PhoneResponseDto verifyProfilePhoneCode(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                    @Valid @RequestBody VerifyProfilePhoneCodeRequestDto request) {
        return memberService.verifyProfilePhoneCode(authorizationHeader, request);
    }

    @PatchMapping("/me")
    public UpdateProfileResponseDto updateProfile(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                    @Valid @RequestBody UpdateProfileRequestDto request) {
        return memberService.updateProfile(authorizationHeader, request);
    }

    // 마이페이지(11) "프로필 수정 진입 시 비밀번호 재확인" 게이트(2026-07-22 추가).
    @PostMapping("/me/verify-password")
    public VerifyPasswordResponseDto verifyPassword(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                      @Valid @RequestBody VerifyPasswordRequestDto request) {
        return memberService.verifyPassword(authorizationHeader, request);
    }

    @DeleteMapping("/me")
    public WithdrawResponseDto withdraw(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                         @Valid @RequestBody WithdrawRequestDto request) {
        return memberService.withdraw(authorizationHeader, request);
    }

    @PostMapping(value = "/me/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProfileImageResponseDto uploadProfileImage(@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
                                                        @RequestParam("profileImage") MultipartFile profileImage) {
        return memberService.uploadProfileImage(authorizationHeader, profileImage);
    }

    @DeleteMapping("/me/profile-image")
    public ProfileImageResponseDto deleteProfileImage(@RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return memberService.deleteProfileImage(authorizationHeader);
    }

    // 알림 설정(2026-08-06 추가) — 맞춤 맛집 추천/오픈채팅 메시지/이벤트·광고(마케팅) 알림 수신 여부.
    @GetMapping("/me/notification-settings")
    public NotificationSettingsResponseDto getNotificationSettings(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        return memberService.getNotificationSettings(authorizationHeader);
    }

    @PatchMapping("/me/notification-settings")
    public NotificationSettingsResponseDto updateNotificationSettings(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody UpdateNotificationSettingsRequestDto request) {
        return memberService.updateNotificationSettings(authorizationHeader, request);
    }
}
