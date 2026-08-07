package com.foodtrip.foodsearch.member.service;

import org.springframework.web.multipart.MultipartFile;

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
import com.foodtrip.foodsearch.member.dto.ProfileImageResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetConfirmRequestDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetConfirmResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetLinkOpenedResponseDto;
import com.foodtrip.foodsearch.member.dto.PasswordResetPollResponseDto;
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
import com.foodtrip.foodsearch.mail.dto.SendCodeRequestDto;
import com.foodtrip.foodsearch.mail.dto.MailResponseDto;
import com.foodtrip.foodsearch.mail.dto.VerifyCodeRequestDto;
import com.foodtrip.foodsearch.phone.dto.PhoneResponseDto;

public interface MemberService {

    SignUpResponseDto signUp(SignUpRequestDto request);

    // 닉네임 중복확인(회원가입 STEP2, 2026-08-04 신규).
    NicknameAvailabilityResponseDto checkNicknameAvailable(String nickname);

    SignUpResponseDto signUpBusiness(BusinessSignUpRequestDto request, MultipartFile businessLicenseFile);

    LoginResponseDto login(LoginRequestDto request);

    RefreshResponseDto refresh(RefreshRequestDto request);

    LogoutResponseDto logout(LogoutRequestDto request);

    FindEmailResponseDto findEmail(FindEmailRequestDto request);

    PasswordResetResponseDto requestPasswordReset(PasswordResetRequestDto request);

    // 다른 탭(이메일 링크)에서 인증이 확인됐는지 폴링(2026-08-04 신규) — find-password-sent.html이 주기 호출.
    PasswordResetPollResponseDto pollPasswordReset(String pollKey);

    // 이메일 링크가 열렸을 때(=find-password-reset.html 로드 시) 호출 — 실제 토큰은 소비하지 않고
    // "링크가 클릭됐다"는 사실만 남겨 폴링 중인 원본 탭이 감지할 수 있게 한다.
    PasswordResetLinkOpenedResponseDto confirmPasswordResetLinkOpened(String token);

    PasswordResetConfirmResponseDto confirmPasswordReset(PasswordResetConfirmRequestDto request);

    PhoneResponseDto sendFindEmailPhoneCode(SendFindEmailPhoneCodeRequestDto request, String clientIp);

    PhoneResponseDto verifyFindEmailPhoneCode(VerifyFindEmailPhoneCodeRequestDto request);

    RevealEmailResponseDto revealEmail(RevealEmailRequestDto request);

    MyProfileResponseDto getMyProfile(String authorizationHeader);

    MailResponseDto sendProfileEmailCode(String authorizationHeader, SendCodeRequestDto request);

    MailResponseDto verifyProfileEmailCode(String authorizationHeader, VerifyCodeRequestDto request);

    PhoneResponseDto sendProfilePhoneCode(String authorizationHeader, SendProfilePhoneCodeRequestDto request, String clientIp);

    PhoneResponseDto verifyProfilePhoneCode(String authorizationHeader, VerifyProfilePhoneCodeRequestDto request);

    UpdateProfileResponseDto updateProfile(String authorizationHeader, UpdateProfileRequestDto request);

    VerifyPasswordResponseDto verifyPassword(String authorizationHeader, VerifyPasswordRequestDto request);

    WithdrawResponseDto withdraw(String authorizationHeader, WithdrawRequestDto request);

    ProfileImageResponseDto uploadProfileImage(String authorizationHeader, MultipartFile profileImage);

    ProfileImageResponseDto deleteProfileImage(String authorizationHeader);

    // 알림 설정(2026-08-06 추가) — 맞춤 맛집 추천/오픈채팅 메시지/이벤트·광고(마케팅) 알림 수신 여부.
    NotificationSettingsResponseDto getNotificationSettings(String authorizationHeader);

    NotificationSettingsResponseDto updateNotificationSettings(String authorizationHeader,
            UpdateNotificationSettingsRequestDto request);
}
