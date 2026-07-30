package com.foodtrip.foodsearch.member.service;

import java.time.LocalDateTime;
import java.util.Optional;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.foodtrip.foodsearch.business.client.BusinessVerificationClient;
import com.foodtrip.foodsearch.business.client.BusinessVerificationResult;
import com.foodtrip.foodsearch.business.entity.BusinessProfile;
import com.foodtrip.foodsearch.business.repository.BusinessProfileRepository;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.common.security.PhoneCryptoService;
import com.foodtrip.foodsearch.common.storage.ProfileImageStorageService;
import com.foodtrip.foodsearch.mail.dto.MailResponseDto;
import com.foodtrip.foodsearch.mail.dto.SendCodeRequestDto;
import com.foodtrip.foodsearch.mail.dto.VerifyCodeRequestDto;
import com.foodtrip.foodsearch.mail.entity.EmailVerification;
import com.foodtrip.foodsearch.mail.repository.EmailVerificationRepository;
import com.foodtrip.foodsearch.mail.service.EmailAuthService;
import com.foodtrip.foodsearch.mail.service.MailService;
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
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.entity.MemberCredential;
import com.foodtrip.foodsearch.member.repository.MemberCredentialRepository;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.member.util.EmailMasker;
import com.foodtrip.foodsearch.phone.dto.PhoneResponseDto;
import com.foodtrip.foodsearch.phone.entity.PhoneVerification;
import com.foodtrip.foodsearch.phone.service.PhoneAuthService;
import com.foodtrip.foodsearch.restaurant.service.RestaurantClaimService;
import com.foodtrip.foodsearch.social.repository.SocialAccountRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

@Service
public class MemberServiceImpl implements MemberService {

    private static final String STATUS_SUSPENDED = "SUSPENDED";
    private static final String STATUS_WITHDRAWN = "WITHDRAWN";
    private static final long REVEAL_VALID_MINUTES = 10;

    private final MemberRepository memberRepository;
    private final MemberCredentialRepository memberCredentialRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final LoginAttemptService loginAttemptService;
    private final RefreshTokenService refreshTokenService;
    private final AccessTokenSessionService accessTokenSessionService;
    private final PhoneCryptoService phoneCryptoService;
    private final PasswordResetTokenService passwordResetTokenService;
    private final MailService mailService;
    private final PhoneAuthService phoneAuthService;
    private final FindEmailVerificationSessionService findEmailVerificationSessionService;
    private final BusinessVerificationClient businessVerificationClient;
    private final BusinessProfileRepository businessProfileRepository;
    private final EmailAuthService emailAuthService;
    private final SocialAccountRepository socialAccountRepository;
    private final ProfileImageStorageService profileImageStorageService;
    private final RestaurantClaimService restaurantClaimService;

    @Value("${password-reset.frontend-url}")
    private String passwordResetFrontendUrl;

    @Value("${profile-image.default-url:}")
    private String defaultProfileImageUrl;

    public MemberServiceImpl(MemberRepository memberRepository,
                              MemberCredentialRepository memberCredentialRepository,
                              EmailVerificationRepository emailVerificationRepository,
                              PasswordEncoder passwordEncoder,
                              JwtProvider jwtProvider,
                              LoginAttemptService loginAttemptService,
                              RefreshTokenService refreshTokenService,
                              AccessTokenSessionService accessTokenSessionService,
                              PhoneCryptoService phoneCryptoService,
                              PasswordResetTokenService passwordResetTokenService,
                              MailService mailService,
                              PhoneAuthService phoneAuthService,
                              FindEmailVerificationSessionService findEmailVerificationSessionService,
                              BusinessVerificationClient businessVerificationClient,
                              BusinessProfileRepository businessProfileRepository,
                              EmailAuthService emailAuthService,
                              SocialAccountRepository socialAccountRepository,
                              ProfileImageStorageService profileImageStorageService,
                              RestaurantClaimService restaurantClaimService) {
        this.memberRepository = memberRepository;
        this.memberCredentialRepository = memberCredentialRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.loginAttemptService = loginAttemptService;
        this.refreshTokenService = refreshTokenService;
        this.passwordResetTokenService = passwordResetTokenService;
        this.mailService = mailService;
        this.findEmailVerificationSessionService = findEmailVerificationSessionService;
        this.accessTokenSessionService = accessTokenSessionService;
        this.phoneCryptoService = phoneCryptoService;
        this.phoneAuthService = phoneAuthService;
        this.businessVerificationClient = businessVerificationClient;
        this.businessProfileRepository = businessProfileRepository;
        this.emailAuthService = emailAuthService;
        this.socialAccountRepository = socialAccountRepository;
        this.profileImageStorageService = profileImageStorageService;
        this.restaurantClaimService = restaurantClaimService;
    }

    @Override
    @Transactional
    public SignUpResponseDto signUp(SignUpRequestDto request) {
        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new CustomException(ErrorCode.PASSWORD_CONFIRM_MISMATCH, "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_FOUND));

        EmailVerification verification = emailVerificationRepository
                .findTopByMemberIdAndPurposeOrderByCreatedAtDesc(member.getMemberId(), EmailVerification.PURPOSE_SIGNUP)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_VERIFIED));

        if (!Boolean.TRUE.equals(verification.getVerified())) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        if (!phoneAuthService.isVerified(member.getMemberId(), request.getPhone(), PhoneVerification.PURPOSE_SIGNUP)) {
            throw new CustomException(ErrorCode.PHONE_NOT_VERIFIED);
        }

        if (memberCredentialRepository.existsByMemberId(member.getMemberId())) {
            throw new CustomException(ErrorCode.ALREADY_SIGNED_UP);
        }

        if (memberRepository.existsByNickname(request.getNickname())) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }

        String phoneHash = phoneCryptoService.hash(request.getPhone());
        if (memberRepository.existsByPhoneHash(phoneHash)) {
            throw new CustomException(ErrorCode.DUPLICATE_PHONE);
        }

        member.completeSignUp(request.getNickname(), request.getPhone(), phoneHash);

        // 위의 existsByNickname/existsByPhoneHash 사전 체크만으로는 동시 요청 시 레이스 컨디션을 막을 수 없으므로,
        // 즉시 flush하여 DB의 UNIQUE 제약(nickname, phone_hash) 위반을 이 시점에 잡아낸다.
        try {
            memberRepository.saveAndFlush(member);
        } catch (DataIntegrityViolationException e) {
            // 여기서 다시 memberRepository로 조회하면(existsByNickname 등) 방금 flush 실패로 무효화된
            // 영속성 컨텍스트가 재사용되어 동일한 예외가 한 번 더 발생한다. 그래서 재조회 대신
            // DB가 알려준 제약조건 이름으로 어느 컬럼이 중복인지 바로 판별한다.
            String constraintName = extractConstraintName(e);
            if ("uk_members_nickname".equals(constraintName)) {
                throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
            }
            if ("uk_members_phone_hash".equals(constraintName)) {
                throw new CustomException(ErrorCode.DUPLICATE_PHONE);
            }
            throw e;
        }

        String passwordHash = passwordEncoder.encode(request.getPassword());
        MemberCredential credential = MemberCredential.create(member.getMemberId(), passwordHash);

        // existsByMemberId 사전 체크도 마찬가지로 동시 요청 레이스 컨디션을 완전히 막지 못한다.
        // member_credentials.member_id에 걸린 DB UNIQUE 제약(uq_member_credentials_member)에서
        // 최종적으로 걸러지도록 saveAndFlush + 예외 변환을 동일하게 적용한다.
        try {
            memberCredentialRepository.saveAndFlush(credential);
        } catch (DataIntegrityViolationException e) {
            String constraintName = extractConstraintName(e);
            if ("uq_member_credentials_member".equals(constraintName)) {
                throw new CustomException(ErrorCode.ALREADY_SIGNED_UP);
            }
            throw e;
        }

        return new SignUpResponseDto(true, "회원가입이 완료되었습니다.", member.getMemberId());
    }

    @Override
    @Transactional
    public SignUpResponseDto signUpBusiness(BusinessSignUpRequestDto request, MultipartFile businessLicenseFile) {
        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new CustomException(ErrorCode.PASSWORD_CONFIRM_MISMATCH, "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }
        if (businessLicenseFile == null || businessLicenseFile.isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "사업자등록증명원 파일은 필수입니다.");
        }

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_FOUND));

        EmailVerification verification = emailVerificationRepository
                .findTopByMemberIdAndPurposeOrderByCreatedAtDesc(member.getMemberId(), EmailVerification.PURPOSE_SIGNUP)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_VERIFIED));

        if (!Boolean.TRUE.equals(verification.getVerified())) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        if (!phoneAuthService.isVerified(member.getMemberId(), request.getPhone(), PhoneVerification.PURPOSE_SIGNUP)) {
            throw new CustomException(ErrorCode.PHONE_NOT_VERIFIED);
        }

        if (memberCredentialRepository.existsByMemberId(member.getMemberId())) {
            throw new CustomException(ErrorCode.ALREADY_SIGNED_UP);
        }

        if (memberRepository.existsByNickname(request.getNickname())) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }

        String phoneHash = phoneCryptoService.hash(request.getPhone());
        if (memberRepository.existsByPhoneHash(phoneHash)) {
            throw new CustomException(ErrorCode.DUPLICATE_PHONE);
        }

        // 일반 회원가입과 동일한 이메일/전화번호 인증, 닉네임/전화번호 중복 검사를 전부 통과한 뒤에만
        // (비용이 드는) 사업자등록증명원 OCR+원본확인+진위확인을 호출한다.
        BusinessVerificationResult verified = businessVerificationClient.verify(businessLicenseFile);

        if (businessProfileRepository.existsByBusinessRegistrationNumber(verified.businessNumber())) {
            throw new CustomException(ErrorCode.DUPLICATE_BUSINESS_NUMBER);
        }

        member.completeSignUp(request.getNickname(), request.getPhone(), phoneHash);
        member.markAsBusiness();

        try {
            memberRepository.saveAndFlush(member);
        } catch (DataIntegrityViolationException e) {
            String constraintName = extractConstraintName(e);
            if ("uk_members_nickname".equals(constraintName)) {
                throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
            }
            if ("uk_members_phone_hash".equals(constraintName)) {
                throw new CustomException(ErrorCode.DUPLICATE_PHONE);
            }
            throw e;
        }

        String passwordHash = passwordEncoder.encode(request.getPassword());
        MemberCredential credential = MemberCredential.create(member.getMemberId(), passwordHash);
        try {
            memberCredentialRepository.saveAndFlush(credential);
        } catch (DataIntegrityViolationException e) {
            String constraintName = extractConstraintName(e);
            if ("uq_member_credentials_member".equals(constraintName)) {
                throw new CustomException(ErrorCode.ALREADY_SIGNED_UP);
            }
            throw e;
        }

        BusinessProfile businessProfile = BusinessProfile.createVerified(
                member.getMemberId(), verified.companyName(), verified.businessNumber(), verified.representativeName(),
                verified.address());
        try {
            businessProfileRepository.saveAndFlush(businessProfile);
        } catch (DataIntegrityViolationException e) {
            String constraintName = extractConstraintName(e);
            if ("uq_business_profiles_reg_no".equals(constraintName)) {
                throw new CustomException(ErrorCode.DUPLICATE_BUSINESS_NUMBER);
            }
            throw e;
        }

        // 사업장 주소 자동귀속(2026-07-20 요구사항 추가) — OCR이 못 읽었거나 매칭 실패해도 회원가입
        // 자체는 그대로 성공시킨다(귀속은 "되면 좋은" 부가 기능이지 가입의 필수 조건이 아님).
        restaurantClaimService.tryAutoClaimByAddress(
                member.getMemberId(), businessProfile.getBusinessProfileId(), verified.address());

        return new SignUpResponseDto(true, "사업자 회원가입이 완료되었습니다.", member.getMemberId());
    }

    private String extractConstraintName(DataIntegrityViolationException e) {
        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraintViolationException) {
                return constraintViolationException.getConstraintName();
            }
        }
        return null;
    }

    @Override
    @Transactional
    public LoginResponseDto login(LoginRequestDto request) {
        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

        MemberCredential credential = memberCredentialRepository.findByMemberId(member.getMemberId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));

        if (loginAttemptService.isLocked(member.getMemberId())) {
            throw new CustomException(ErrorCode.ACCOUNT_LOCKED);
        }

        if (!passwordEncoder.matches(request.getPassword(), credential.getPasswordHash())) {
            boolean lockedNow = loginAttemptService.recordFailureAndCheckLocked(member.getMemberId());
            throw new CustomException(lockedNow ? ErrorCode.ACCOUNT_LOCKED : ErrorCode.INVALID_CREDENTIALS);
        }

        // 계정 상태는 비밀번호가 맞은 이후에만 확인한다 (틀린 비밀번호로 계정 상태를 알아낼 수 없도록).
        if (STATUS_SUSPENDED.equals(member.getStatus())) {
            throw new CustomException(ErrorCode.ACCOUNT_SUSPENDED);
        }
        if (STATUS_WITHDRAWN.equals(member.getStatus())) {
            throw new CustomException(ErrorCode.ACCOUNT_WITHDRAWN);
        }

        loginAttemptService.resetFailCount(member.getMemberId());
        member.updateLastLoginAt(LocalDateTime.now());

        JwtProvider.IssuedAccessToken issuedAccessToken =
                jwtProvider.generateAccessToken(member.getMemberId(), member.getEmail(), member.getRole());
        accessTokenSessionService.register(issuedAccessToken.jti(), member.getMemberId(), jwtProvider.getExpirationMillis());
        boolean rememberMe = Boolean.TRUE.equals(request.getRememberMe());
        String refreshToken = refreshTokenService.issue(member.getMemberId(), rememberMe);

        return new LoginResponseDto(true, "로그인에 성공하였습니다.", member.getMemberId(), issuedAccessToken.token(), refreshToken);
    }

    @Override
    public RefreshResponseDto refresh(RefreshRequestDto request) {
        if (!refreshTokenService.matches(request.getMemberId(), request.getRefreshToken())) {
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        // 회전 전에 현재 저장된 토큰의 tier(로그인 상태 유지 여부)를 읽어, 재발급 후에도 그대로 유지한다
        // (클라이언트가 재발급 요청마다 rememberMe를 다시 보낼 필요 없음 — 001-02(로그인) 참고).
        boolean rememberMe = refreshTokenService.isRememberMe(request.getMemberId());

        Member member = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REFRESH_TOKEN));

        JwtProvider.IssuedAccessToken issuedAccessToken =
                jwtProvider.generateAccessToken(member.getMemberId(), member.getEmail(), member.getRole());
        accessTokenSessionService.register(issuedAccessToken.jti(), member.getMemberId(), jwtProvider.getExpirationMillis());
        // 재발급 시마다 refresh token도 새로 교체(회전)하여, 탈취된 이전 토큰이 재사용되지 않도록 한다.
        String newRefreshToken = refreshTokenService.issue(member.getMemberId(), rememberMe);

        return new RefreshResponseDto(true, "토큰이 재발급되었습니다.", issuedAccessToken.token(), newRefreshToken);
    }

    @Override
    public LogoutResponseDto logout(LogoutRequestDto request) {
        Claims claims;
        try {
            claims = jwtProvider.parseClaims(request.getAccessToken());
        } catch (JwtException e) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }

        Long memberId = Long.valueOf(claims.getSubject());
        String jti = claims.getId();

        if (!refreshTokenService.exists(memberId)) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }

        refreshTokenService.revoke(memberId);
        accessTokenSessionService.revoke(jti);

        return new LogoutResponseDto(true, "로그아웃되었습니다.");
    }

    @Override
    public FindEmailResponseDto findEmail(FindEmailRequestDto request) {
        String phoneHash = phoneCryptoService.hash(request.getPhone());

        // 닉네임만 맞음/전화번호만 맞음/둘 다 틀림/탈퇴 회원을 모두 동일하게 MEMBER_NOT_FOUND로 처리하여
        // 부분 일치 여부로 회원 존재 여부가 노출되지 않도록 한다.
        Member member = memberRepository.findByNicknameAndPhoneHash(request.getNickname(), phoneHash)
                .filter(m -> !STATUS_WITHDRAWN.equals(m.getStatus()))
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        String maskedEmail = EmailMasker.mask(member.getEmail());
        // memberId를 그대로 노출하지 않고, SMS 인증(전체공개) 단계에서만 쓸 단기 조회 세션 토큰을 발급한다.
        String verificationToken = findEmailVerificationSessionService.issue(member.getMemberId());
        return new FindEmailResponseDto(true, "일치하는 회원 정보를 찾았습니다.", maskedEmail, verificationToken);
    }

    @Override
    @Transactional
    public PasswordResetResponseDto requestPasswordReset(PasswordResetRequestDto request) {
        Optional<Member> memberOpt = memberRepository.findByEmail(request.getEmail());
        if (memberOpt.isPresent()) {
            Member member = memberOpt.get();
            // member_credentials까지 있어야(=회원가입을 끝까지 완료한 회원) 재설정 메일을 보낸다.
            if (memberCredentialRepository.existsByMemberId(member.getMemberId())) {
                String rawToken = passwordResetTokenService.issue(member.getMemberId());
                String resetUrl = passwordResetFrontendUrl + "?token=" + rawToken;
                try {
                    mailService.sendPasswordResetMail(member.getEmail(), resetUrl);
                } catch (CustomException e) {
                    // 메일 발송 실패를 그대로 흘려보내면 "이메일이 존재할 때만 500"이 되어 버려
                    // 계정 존재 여부가 HTTP 상태코드로 노출된다. 아래에서 항상 동일한 응답을 반환하도록
                    // 여기서 흡수한다 (로그로는 원인 확인 가능, 사용자 응답은 통일).
                }
            }
        }
        // 이메일 존재 여부와 무관하게 항상 동일한 응답을 반환한다 (계정 존재 여부 비노출).
        return new PasswordResetResponseDto(true, "입력하신 이메일로 비밀번호 재설정 안내를 보냈습니다.");
    }

    @Override
    @Transactional
    public PasswordResetConfirmResponseDto confirmPasswordReset(PasswordResetConfirmRequestDto request) {
        if (!request.getNewPassword().equals(request.getNewPasswordConfirm())) {
            throw new CustomException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }

        // consume()이 조회와 동시에 삭제까지 원자적으로 수행하여 같은 토큰의 동시 재사용을 막는다.
        Long memberId = passwordResetTokenService.consume(request.getToken());
        if (memberId == null) {
            throw new CustomException(ErrorCode.INVALID_RESET_TOKEN);
        }

        MemberCredential credential = memberCredentialRepository.findByMemberId(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_RESET_TOKEN));

        credential.updatePassword(passwordEncoder.encode(request.getNewPassword()));

        return new PasswordResetConfirmResponseDto(true, "비밀번호가 재설정되었습니다.");
    }

    @Override
    public PhoneResponseDto sendFindEmailPhoneCode(SendFindEmailPhoneCodeRequestDto request, String clientIp) {
        Long memberId = resolveFindEmailSession(request.getVerificationToken());
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_VERIFICATION_TOKEN));

        // 세션이 가리키는 회원의 전화번호가 맞는지 다시 한 번 확인해, 다른 회원 번호로 SMS 인증을
        // 시도하는 것을 막는다(001-02(이메일찾기) 12-2-1장).
        String phoneHash = phoneCryptoService.hash(request.getPhone());
        if (!phoneHash.equals(member.getPhoneHash())) {
            throw new CustomException(ErrorCode.PHONE_NOT_FOUND);
        }

        phoneAuthService.sendVerificationCode(memberId, request.getPhone(), PhoneVerification.PURPOSE_FIND_EMAIL, clientIp);
        return new PhoneResponseDto(true, "인증번호가 발송되었습니다.");
    }

    @Override
    public PhoneResponseDto verifyFindEmailPhoneCode(VerifyFindEmailPhoneCodeRequestDto request) {
        Long memberId = resolveFindEmailSession(request.getVerificationToken());
        phoneAuthService.verifyCode(memberId, request.getPhone(), request.getCode(), PhoneVerification.PURPOSE_FIND_EMAIL);
        return new PhoneResponseDto(true, "전화번호 인증이 완료되었습니다.");
    }

    @Override
    public RevealEmailResponseDto revealEmail(RevealEmailRequestDto request) {
        Long memberId = resolveFindEmailSession(request.getVerificationToken());

        if (!phoneAuthService.isRecentlyVerified(memberId, PhoneVerification.PURPOSE_FIND_EMAIL, REVEAL_VALID_MINUTES)) {
            throw new CustomException(ErrorCode.PHONE_NOT_VERIFIED);
        }

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_VERIFICATION_TOKEN));

        return new RevealEmailResponseDto(true, "이메일을 확인했습니다.", member.getEmail());
    }

    private Long resolveFindEmailSession(String verificationToken) {
        Long memberId = findEmailVerificationSessionService.resolve(verificationToken);
        if (memberId == null) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_TOKEN);
        }
        return memberId;
    }

    @Override
    public MyProfileResponseDto getMyProfile(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_LOGGED_IN));
        return new MyProfileResponseDto(true, member.getEmail(), member.getNickname(), resolveProfileImageUrl(member),
                member.getPhone(), member.getFoodBti(), socialAccountRepository.existsByMemberId(memberId));
    }

    @Override
    @Transactional
    public MailResponseDto sendProfileEmailCode(String authorizationHeader, SendCodeRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        emailAuthService.sendProfileUpdateCode(memberId, request.getEmail());
        return new MailResponseDto(true, "인증번호가 발송되었습니다.");
    }

    @Override
    @Transactional
    public MailResponseDto verifyProfileEmailCode(String authorizationHeader, VerifyCodeRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        emailAuthService.verifyProfileUpdateCode(memberId, request.getEmail(), request.getCode());
        return new MailResponseDto(true, "이메일 인증이 완료되었습니다.");
    }

    @Override
    public PhoneResponseDto sendProfilePhoneCode(String authorizationHeader, SendProfilePhoneCodeRequestDto request, String clientIp) {
        Long memberId = resolveMemberId(authorizationHeader);
        phoneAuthService.sendVerificationCode(memberId, request.getPhone(), PhoneVerification.PURPOSE_PROFILE_UPDATE, clientIp);
        return new PhoneResponseDto(true, "인증번호가 발송되었습니다.");
    }

    @Override
    public PhoneResponseDto verifyProfilePhoneCode(String authorizationHeader, VerifyProfilePhoneCodeRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        phoneAuthService.verifyCode(memberId, request.getPhone(), request.getCode(), PhoneVerification.PURPOSE_PROFILE_UPDATE);
        return new PhoneResponseDto(true, "전화번호 인증이 완료되었습니다.");
    }

    @Override
    @Transactional
    public UpdateProfileResponseDto updateProfile(String authorizationHeader, UpdateProfileRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);

        boolean changingPassword = request.getPassword() != null && !request.getPassword().isBlank();
        if (changingPassword) {
            // 소셜로그인 계정은 비밀번호 자체가 없어 변경도 허용하지 않는다
            // (001-02(소셜로그인) 2-5장 — 005(회원정보수정) 1-1장에서 미뤄뒀던 가드를 여기서 추가함).
            if (socialAccountRepository.existsByMemberId(memberId)) {
                throw new CustomException(ErrorCode.SOCIAL_ACCOUNT_PASSWORD_CHANGE_NOT_ALLOWED);
            }
            if (!request.getPassword().equals(request.getPasswordConfirm())) {
                throw new CustomException(ErrorCode.PASSWORD_CONFIRM_MISMATCH, "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
            }
        }

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_LOGGED_IN));

        if (!member.getNickname().equals(request.getNickname())) {
            if (memberRepository.existsByNicknameAndMemberIdNot(request.getNickname(), memberId)) {
                throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
            }
            member.updateNickname(request.getNickname());
        }

        String newEmail = request.getEmail();
        if (newEmail != null && !newEmail.isBlank() && !member.getEmail().equals(newEmail)) {
            if (!emailAuthService.isProfileEmailVerified(memberId, newEmail)) {
                throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED);
            }
            if (memberRepository.existsByEmailAndMemberIdNot(newEmail, memberId)) {
                throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
            }
            member.updateEmail(newEmail);
        }

        String newPhone = request.getPhone();
        if (newPhone != null && !newPhone.isBlank()) {
            if (!phoneAuthService.isVerified(memberId, newPhone, PhoneVerification.PURPOSE_PROFILE_UPDATE)) {
                throw new CustomException(ErrorCode.PHONE_NOT_VERIFIED);
            }
            String newPhoneHash = phoneCryptoService.hash(newPhone);
            if (memberRepository.existsByPhoneHashAndMemberIdNot(newPhoneHash, memberId)) {
                throw new CustomException(ErrorCode.DUPLICATE_PHONE);
            }
            member.updatePhone(newPhone, newPhoneHash);
        }

        try {
            memberRepository.saveAndFlush(member);
        } catch (DataIntegrityViolationException e) {
            String constraintName = extractConstraintName(e);
            if ("uk_members_nickname".equals(constraintName)) {
                throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
            }
            if ("uk_members_phone_hash".equals(constraintName)) {
                throw new CustomException(ErrorCode.DUPLICATE_PHONE);
            }
            throw e;
        }

        if (changingPassword) {
            MemberCredential credential = memberCredentialRepository.findByMemberId(memberId)
                    .orElseThrow(() -> new CustomException(ErrorCode.NOT_LOGGED_IN));
            credential.updatePassword(passwordEncoder.encode(request.getPassword()));
        }

        return new UpdateProfileResponseDto(true, "회원정보가 수정되었습니다.");
    }

    // 마이페이지(11) "프로필 수정 진입 시 비밀번호 재확인" 게이트(2026-07-22 추가) — withdraw()의 재인증과
    // 같은 패턴(credential.password_hash와 비교)이지만, 아무것도 바꾸지 않고 일치 여부만 돌려준다.
    // 소셜 계정은 credential 자체가 없어 항상 INVALID_CREDENTIALS가 나는데, 이건 의도된 동작이다 —
    // 프론트가 애초에 소셜 계정에는 이 게이트를 띄우지 않아야 한다(GET /me의 social 필드로 미리 판단).
    @Override
    public VerifyPasswordResponseDto verifyPassword(String authorizationHeader, VerifyPasswordRequestDto request) {
        Long memberId = resolveMemberId(authorizationHeader);
        MemberCredential credential = memberCredentialRepository.findByMemberId(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));
        if (!passwordEncoder.matches(request.getPassword(), credential.getPasswordHash())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }
        return new VerifyPasswordResponseDto(true, "비밀번호가 확인되었습니다.");
    }

    @Override
    @Transactional
    public ProfileImageResponseDto uploadProfileImage(String authorizationHeader, MultipartFile profileImage) {
        Long memberId = resolveMemberId(authorizationHeader);
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_LOGGED_IN));

        String oldUrl = member.getProfileImageUrl();
        String newUrl = profileImageStorageService.store(profileImage);
        member.updateProfileImage(newUrl);
        // 기존에 우리가 저장해둔 파일이었다면(소셜 플랫폼이 준 외부 URL이 아니라면) 교체 후 정리한다.
        profileImageStorageService.delete(oldUrl);

        return new ProfileImageResponseDto(true, "프로필 사진이 등록되었습니다.", newUrl);
    }

    @Override
    @Transactional
    public ProfileImageResponseDto deleteProfileImage(String authorizationHeader) {
        Long memberId = resolveMemberId(authorizationHeader);
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_LOGGED_IN));

        String oldUrl = member.getProfileImageUrl();
        member.updateProfileImage(null);
        profileImageStorageService.delete(oldUrl);

        return new ProfileImageResponseDto(true, "프로필 사진이 삭제되었습니다.", resolveProfileImageUrl(member));
    }

    // 회원이 직접 등록한 사진이 없으면 기본 프로필 URL로 대체한다(001-02(회원정보수정) 2-6장).
    // default-url이 아직 미설정(빈 값)이면 그대로 null을 반환한다 — 실제 기본 이미지 자산은 별도 확정 예정.
    private String resolveProfileImageUrl(Member member) {
        if (member.getProfileImageUrl() != null) {
            return member.getProfileImageUrl();
        }
        return (defaultProfileImageUrl == null || defaultProfileImageUrl.isBlank()) ? null : defaultProfileImageUrl;
    }

    private Long resolveMemberId(String authorizationHeader) {
        return Long.valueOf(resolveAuthenticatedClaims(authorizationHeader).getSubject());
    }

    private Claims resolveAuthenticatedClaims(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        String accessToken = authorizationHeader.substring("Bearer ".length());
        Claims claims;
        try {
            claims = jwtProvider.parseClaims(accessToken);
        } catch (JwtException e) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        if (!accessTokenSessionService.isActive(claims.getId())) {
            throw new CustomException(ErrorCode.NOT_LOGGED_IN);
        }
        return claims;
    }

    @Override
    @Transactional
    public WithdrawResponseDto withdraw(String authorizationHeader, WithdrawRequestDto request) {
        Claims claims = resolveAuthenticatedClaims(authorizationHeader);
        Long memberId = Long.valueOf(claims.getSubject());

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_LOGGED_IN));

        if (STATUS_WITHDRAWN.equals(member.getStatus())) {
            throw new CustomException(ErrorCode.ACCOUNT_WITHDRAWN);
        }

        MemberCredential credential = memberCredentialRepository.findByMemberId(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_CREDENTIALS));
        if (!passwordEncoder.matches(request.getPassword(), credential.getPasswordHash())) {
            throw new CustomException(ErrorCode.INVALID_CREDENTIALS);
        }

        member.withdraw();

        refreshTokenService.revoke(memberId);
        accessTokenSessionService.revoke(claims.getId());

        return new WithdrawResponseDto(true, "회원탈퇴가 완료되었습니다.");
    }
}
