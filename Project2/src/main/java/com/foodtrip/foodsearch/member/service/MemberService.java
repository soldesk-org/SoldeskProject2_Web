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
import com.foodtrip.foodsearch.mail.dto.SendCodeRequestDto;
import com.foodtrip.foodsearch.mail.dto.MailResponseDto;
import com.foodtrip.foodsearch.mail.dto.VerifyCodeRequestDto;
import com.foodtrip.foodsearch.phone.dto.PhoneResponseDto;

public interface MemberService {

    SignUpResponseDto signUp(SignUpRequestDto request);

    SignUpResponseDto signUpBusiness(BusinessSignUpRequestDto request, MultipartFile businessLicenseFile);

    LoginResponseDto login(LoginRequestDto request);

    RefreshResponseDto refresh(RefreshRequestDto request);

    LogoutResponseDto logout(LogoutRequestDto request);

    FindEmailResponseDto findEmail(FindEmailRequestDto request);

    PasswordResetResponseDto requestPasswordReset(PasswordResetRequestDto request);

    PasswordResetConfirmResponseDto confirmPasswordReset(PasswordResetConfirmRequestDto request);

    PhoneResponseDto sendFindEmailPhoneCode(SendFindEmailPhoneCodeRequestDto request);

    PhoneResponseDto verifyFindEmailPhoneCode(VerifyFindEmailPhoneCodeRequestDto request);

    RevealEmailResponseDto revealEmail(RevealEmailRequestDto request);

    MyProfileResponseDto getMyProfile(String authorizationHeader);

    MailResponseDto sendProfileEmailCode(String authorizationHeader, SendCodeRequestDto request);

    MailResponseDto verifyProfileEmailCode(String authorizationHeader, VerifyCodeRequestDto request);

    PhoneResponseDto sendProfilePhoneCode(String authorizationHeader, SendProfilePhoneCodeRequestDto request);

    PhoneResponseDto verifyProfilePhoneCode(String authorizationHeader, VerifyProfilePhoneCodeRequestDto request);

    UpdateProfileResponseDto updateProfile(String authorizationHeader, UpdateProfileRequestDto request);

    VerifyPasswordResponseDto verifyPassword(String authorizationHeader, VerifyPasswordRequestDto request);

    WithdrawResponseDto withdraw(String authorizationHeader, WithdrawRequestDto request);

    ProfileImageResponseDto uploadProfileImage(String authorizationHeader, MultipartFile profileImage);

    ProfileImageResponseDto deleteProfileImage(String authorizationHeader);
}
