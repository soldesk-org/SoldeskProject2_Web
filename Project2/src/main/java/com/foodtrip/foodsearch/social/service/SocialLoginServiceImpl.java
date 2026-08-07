package com.foodtrip.foodsearch.social.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.hibernate.exception.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.security.JwtProvider;
import com.foodtrip.foodsearch.common.security.PhoneCryptoService;
import com.foodtrip.foodsearch.member.dto.LoginResponseDto;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.member.service.AccessTokenSessionService;
import com.foodtrip.foodsearch.member.service.RefreshTokenService;
import com.foodtrip.foodsearch.social.client.SocialOAuthClient;
import com.foodtrip.foodsearch.social.client.SocialTokenResponse;
import com.foodtrip.foodsearch.social.client.SocialUserProfile;
import com.foodtrip.foodsearch.social.dto.UnlinkResponseDto;
import com.foodtrip.foodsearch.social.entity.SocialAccount;
import com.foodtrip.foodsearch.social.repository.SocialAccountRepository;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

@Service
public class SocialLoginServiceImpl implements SocialLoginService {

    private static final Logger log = LoggerFactory.getLogger(SocialLoginServiceImpl.class);
    private static final String STATUS_SUSPENDED = "SUSPENDED";
    private static final String STATUS_WITHDRAWN = "WITHDRAWN";
    private static final String ROLE_BUSINESS = "BUSINESS";
    private static final int MAX_NICKNAME_LENGTH = 10;

    private final Map<String, SocialOAuthClient> clientsByPath;
    private final OAuthStateService oAuthStateService;
    private final SocialAccountRepository socialAccountRepository;
    private final MemberRepository memberRepository;
    private final PhoneCryptoService phoneCryptoService;
    private final JwtProvider jwtProvider;
    private final AccessTokenSessionService accessTokenSessionService;
    private final RefreshTokenService refreshTokenService;

    public SocialLoginServiceImpl(List<SocialOAuthClient> clients,
                                   OAuthStateService oAuthStateService,
                                   SocialAccountRepository socialAccountRepository,
                                   MemberRepository memberRepository,
                                   PhoneCryptoService phoneCryptoService,
                                   JwtProvider jwtProvider,
                                   AccessTokenSessionService accessTokenSessionService,
                                   RefreshTokenService refreshTokenService) {
        this.clientsByPath = clients.stream().collect(Collectors.toMap(SocialOAuthClient::pathSegment, c -> c));
        this.oAuthStateService = oAuthStateService;
        this.socialAccountRepository = socialAccountRepository;
        this.memberRepository = memberRepository;
        this.phoneCryptoService = phoneCryptoService;
        this.jwtProvider = jwtProvider;
        this.accessTokenSessionService = accessTokenSessionService;
        this.refreshTokenService = refreshTokenService;
    }

    @Override
    public String buildAuthorizeUrl(String providerPath) {
        SocialOAuthClient client = resolveClient(providerPath);
        String state = oAuthStateService.issue(client.provider());
        return client.buildAuthorizeUrl(state);
    }

    @Override
    @Transactional
    public LoginResponseDto handleCallback(String providerPath, String code, String state) {
        SocialOAuthClient client = resolveClient(providerPath);

        if (!oAuthStateService.validate(state, client.provider())) {
            throw new CustomException(ErrorCode.INVALID_OAUTH_STATE);
        }

        SocialTokenResponse tokenResponse = client.exchangeCodeForToken(code);
        SocialUserProfile profile = client.fetchUserProfile(tokenResponse.accessToken());
        LocalDateTime tokenExpiredAt = tokenResponse.expiresInSeconds() != null
                ? LocalDateTime.now().plusSeconds(tokenResponse.expiresInSeconds())
                : null;

        Member member;
        Optional<SocialAccount> existingLink =
                socialAccountRepository.findByProviderAndProviderUserId(client.provider(), profile.providerUserId());

        if (existingLink.isPresent()) {
            SocialAccount link = existingLink.get();
            member = memberRepository.findById(link.getMemberId())
                    .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED, "연동된 회원 정보를 찾을 수 없습니다."));
            checkAccountStatus(member);
            link.updateTokens(tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenExpiredAt);
        } else {
            // 계정 연동(2026-07-22 변경) — 이미 그 이메일로 가입된 회원(일반 계정이든 다른 플랫폼의 소셜
            // 계정이든)이 있으면 예전엔 EMAIL_ALREADY_REGISTERED로 거부했지만(001-02 2-4-1장의 보수적
            // 기본값), 사용자 확인 후 "그냥 계정 연동으로 해달라"는 요청으로 정책을 바꿨다: 이 소셜 계정을
            // 그 기존 회원에 자동으로 연결하고 그 회원으로 로그인시킨다(같은 이메일=같은 사람으로 신뢰,
            // 별도 확인 절차 없음). 06 001-02/001-03 갱신 참고.
            Optional<Member> existingMemberByEmail = memberRepository.findByEmail(profile.email());
            if (existingMemberByEmail.isPresent()) {
                member = existingMemberByEmail.get();
                checkAccountStatus(member);
            } else {
                member = createSocialMember(profile);
            }
            SocialAccount newLink = SocialAccount.create(member.getMemberId(), client.provider(),
                    profile.providerUserId(), tokenResponse.accessToken(), tokenResponse.refreshToken(), tokenExpiredAt);
            socialAccountRepository.save(newLink);
        }

        member.updateLastLoginAt(LocalDateTime.now());

        JwtProvider.IssuedAccessToken issuedAccessToken =
                jwtProvider.generateAccessToken(member.getMemberId(), member.getEmail(), member.getRole());
        accessTokenSessionService.register(issuedAccessToken.jti(), member.getMemberId(), jwtProvider.getExpirationMillis());
        // 소셜로그인은 체크박스가 있는 폼이 아니라 리다이렉트 콜백이라 "로그인 상태 유지" 선택지 자체가 없음 —
        // 항상 긴 세션(rememberMe=true 취급, 001-02(로그인) 참고)으로 발급해 기존 동작(14일)을 그대로 유지한다.
        String refreshToken = refreshTokenService.issue(member.getMemberId(), true);

        return new LoginResponseDto(true, "로그인에 성공하였습니다.", member.getMemberId(), issuedAccessToken.token(), refreshToken);
    }

    @Override
    @Transactional
    public UnlinkResponseDto unlink(String authorizationHeader, String providerPath) {
        SocialOAuthClient client = resolveClient(providerPath);
        Long memberId = resolveMemberId(authorizationHeader);

        SocialAccount link = socialAccountRepository.findByMemberIdAndProvider(memberId, client.provider())
                .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_ACCOUNT_NOT_LINKED));

        client.unlink(link.getAccessToken(), link.getRefreshToken());
        socialAccountRepository.delete(link);

        return new UnlinkResponseDto(true, "연동이 해제되었습니다.");
    }

    @Override
    public void handleNaverUnlinkCallback(Map<String, String> params) {
        // 네이버가 실제로 어떤 파라미터로 회원을 식별해 알려주는지 확인되지 않아(001-02 8장),
        // 우선 수신 로그만 남기는 최소 구현으로 시작한다. 정확한 스펙이 확인되면 그 파라미터로
        // social_accounts(provider=NAVER) row를 찾아 삭제하는 로직을 채워 넣어야 한다.
        log.info("네이버 연결 끊기 콜백 수신: {}", params);
    }

    private Member createSocialMember(SocialUserProfile profile) {
        String nickname = resolveUniqueNickname(profile.nickname(), profile.email());
        Member member = Member.createSocial(profile.email(), nickname, profile.profileImageUrl());

        if (profile.phone() != null && !profile.phone().isBlank()) {
            String phoneHash = phoneCryptoService.hash(profile.phone());
            // 소셜 플랫폼이 준 전화번호가 이미 다른 회원이 쓰고 있으면(드문 경우), 로그인 자체를 실패시키지
            // 않고 전화번호 자동 채움만 건너뛴다 — 사용자는 필요하면 회원정보수정에서 인증 후 직접 등록 가능.
            if (!memberRepository.existsByPhoneHash(phoneHash)) {
                member.updatePhone(profile.phone(), phoneHash);
            }
        }

        try {
            memberRepository.saveAndFlush(member);
        } catch (DataIntegrityViolationException e) {
            // extractConstraintName()은 유니크 제약 위반(ConstraintViolationException)만 잡아낸다 — 그 외의
            // DataIntegrityViolationException(예: 컬럼 길이 초과 등)은 원인이 null로 나오므로 서버 로그에
            // 원본 예외를 남겨 실제 원인을 추적할 수 있게 한다(2026-07-20, 구글 profileImageUrl 길이초과로 실제 발견됨).
            log.error("소셜 신규가입 중 회원 저장 실패 (email={})", profile.email(), e);
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_FAILED,
                    "회원 생성 중 충돌이 발생했습니다. 다시 시도해주세요: " + extractConstraintName(e));
        }
        return member;
    }

    // 플랫폼이 준 닉네임(또는 이메일 로컬파트)을 우리 서비스 규칙(2~10자, 특수문자 불가)에 맞게 다듬고,
    // 이미 쓰이고 있으면 뒤에 숫자를 붙여 유일하게 만든다(001-02 6장/8장).
    private String resolveUniqueNickname(String candidateNickname, String email) {
        String base = normalizeNickname(candidateNickname, email);
        String nickname = base;
        int suffix = 0;
        while (memberRepository.existsByNickname(nickname)) {
            suffix++;
            String suffixText = String.valueOf(suffix);
            int maxBaseLength = Math.max(1, MAX_NICKNAME_LENGTH - suffixText.length());
            nickname = base.substring(0, Math.min(base.length(), maxBaseLength)) + suffixText;
        }
        return nickname;
    }

    private String normalizeNickname(String candidateNickname, String email) {
        String source = (candidateNickname != null && !candidateNickname.isBlank())
                ? candidateNickname
                : email.substring(0, email.indexOf('@'));
        String cleaned = source.replaceAll("[^가-힣a-zA-Z0-9]", "");
        if (cleaned.isBlank()) {
            cleaned = "user";
        }
        return cleaned.length() > MAX_NICKNAME_LENGTH ? cleaned.substring(0, MAX_NICKNAME_LENGTH) : cleaned;
    }

    private void checkAccountStatus(Member member) {
        if (STATUS_SUSPENDED.equals(member.getStatus())) {
            throw new CustomException(ErrorCode.ACCOUNT_SUSPENDED);
        }
        if (STATUS_WITHDRAWN.equals(member.getStatus())) {
            throw new CustomException(ErrorCode.ACCOUNT_WITHDRAWN);
        }
        // 사업자 계정은 소셜 로그인을 못 쓰게 막는다(2026-08-07). 이 메서드는 "이미 소셜에 연동된
        // 계정으로 재로그인"과 "같은 이메일이라 자동 연동되기 직전" 두 경로에서 모두 호출되므로,
        // 여기 한 곳만 막으면 사업자 이메일로 들어오는 모든 소셜 로그인이 차단된다.
        if (ROLE_BUSINESS.equals(member.getRole())) {
            throw new CustomException(ErrorCode.SOCIAL_LOGIN_NOT_ALLOWED_FOR_BUSINESS);
        }
    }

    private SocialOAuthClient resolveClient(String providerPath) {
        SocialOAuthClient client = providerPath != null ? clientsByPath.get(providerPath.toLowerCase()) : null;
        if (client == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "지원하지 않는 소셜 로그인 플랫폼입니다: " + providerPath);
        }
        return client;
    }

    // 회원정보수정(005) MemberServiceImpl.resolveAuthenticatedClaims()와 동일한 로직 — 패키지가 달라
    // private 헬퍼를 공유할 수 없어 그대로 복제했다(001-03 구현 노트 참고).
    private Long resolveMemberId(String authorizationHeader) {
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
        return Long.valueOf(claims.getSubject());
    }

    private String extractConstraintName(DataIntegrityViolationException e) {
        for (Throwable cause = e; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraintViolationException) {
                return constraintViolationException.getConstraintName();
            }
        }
        return null;
    }
}
