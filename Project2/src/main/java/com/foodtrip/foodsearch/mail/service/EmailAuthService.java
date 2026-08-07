package com.foodtrip.foodsearch.mail.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.mail.entity.EmailVerification;
import com.foodtrip.foodsearch.mail.repository.EmailVerificationRepository;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberCredentialRepository;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.social.repository.SocialAccountRepository;

@Service
public class EmailAuthService {

    private static final int CODE_LENGTH = 6;
    private static final long EXPIRE_MINUTES = 5;

    private final MemberRepository memberRepository;
    private final MemberCredentialRepository memberCredentialRepository;
    private final SocialAccountRepository socialAccountRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public EmailAuthService(MemberRepository memberRepository,
                             MemberCredentialRepository memberCredentialRepository,
                             SocialAccountRepository socialAccountRepository,
                             EmailVerificationRepository emailVerificationRepository,
                             MailService mailService) {
        this.memberRepository = memberRepository;
        this.memberCredentialRepository = memberCredentialRepository;
        this.socialAccountRepository = socialAccountRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.mailService = mailService;
    }

    // 회원가입을 끝까지 완료하지 않고 이탈한 이메일(=member_credentials도 social_accounts도 없는 pending
    // members row, UnverifiedMemberCleanupScheduler가 24시간 뒤 정리 대상으로 보는 것과 같은 기준)은
    // "이미 가입된 이메일"로 막지 않고 그 pending row를 재사용해 인증코드를 다시 보낸다. 실제로 가입을
    // 완료한 계정(credential 또는 social 연동이 있는 경우)만 진짜 중복으로 취급한다.
    @Transactional
    public void sendVerificationCode(String email) {
        Optional<Member> existing = memberRepository.findByEmail(email);
        Member member;
        if (existing.isPresent()) {
            Member existingMember = existing.get();
            boolean signupCompleted = memberCredentialRepository.existsByMemberId(existingMember.getMemberId())
                    || socialAccountRepository.existsByMemberId(existingMember.getMemberId());
            if (signupCompleted) {
                throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
            }
            member = existingMember;
        } else {
            member = memberRepository.save(Member.createPending(email));
        }

        String code = generateCode();
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(EXPIRE_MINUTES);
        emailVerificationRepository.save(
                EmailVerification.create(member.getMemberId(), email, code, EmailVerification.PURPOSE_SIGNUP, expiredAt)
        );

        mailService.sendVerificationCode(email, code);
    }

    @Transactional
    public void verifyCode(String email, String code) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_FOUND));

        EmailVerification verification = emailVerificationRepository
                .findTopByMemberIdAndPurposeOrderByCreatedAtDesc(member.getMemberId(), EmailVerification.PURPOSE_SIGNUP)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_FOUND));

        if (verification.isExpired()) {
            throw new CustomException(ErrorCode.EXPIRED_CODE);
        }
        if (!verification.matchesCode(code)) {
            throw new CustomException(ErrorCode.INVALID_CODE);
        }

        verification.markVerified();
    }

    /**
     * 회원정보수정(001-02(회원정보수정) 2-2장) 전용 진입점: 이미 존재하는 회원(memberId)의 이메일을
     * 바꾸기 위한 인증이라 회원가입용(sendVerificationCode)과 달리 새 members row를 만들지 않는다.
     */
    @Transactional
    public void sendProfileUpdateCode(Long memberId, String newEmail) {
        if (memberRepository.existsByEmail(newEmail)) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }

        String code = generateCode();
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(EXPIRE_MINUTES);
        emailVerificationRepository.save(
                EmailVerification.create(memberId, newEmail, code, EmailVerification.PURPOSE_PROFILE_EMAIL_UPDATE, expiredAt)
        );

        mailService.sendVerificationCode(newEmail, code);
    }

    @Transactional
    public void verifyProfileUpdateCode(Long memberId, String newEmail, String code) {
        EmailVerification verification = emailVerificationRepository
                .findTopByMemberIdAndPurposeOrderByCreatedAtDesc(memberId, EmailVerification.PURPOSE_PROFILE_EMAIL_UPDATE)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_FOUND));

        if (!verification.getEmail().equals(newEmail)) {
            throw new CustomException(ErrorCode.EMAIL_NOT_FOUND);
        }
        if (verification.isExpired()) {
            throw new CustomException(ErrorCode.EXPIRED_CODE);
        }
        if (!verification.matchesCode(code)) {
            throw new CustomException(ErrorCode.INVALID_CODE);
        }

        verification.markVerified();
    }

    /**
     * 회원정보수정 최종 저장 시점에, 제출한 새 이메일이 인증 완료 상태인지 확인한다.
     */
    public boolean isProfileEmailVerified(Long memberId, String newEmail) {
        return emailVerificationRepository
                .findTopByMemberIdAndPurposeOrderByCreatedAtDesc(memberId, EmailVerification.PURPOSE_PROFILE_EMAIL_UPDATE)
                .map(v -> Boolean.TRUE.equals(v.getVerified()) && v.getEmail().equals(newEmail))
                .orElse(false);
    }

    private String generateCode() {
        int number = secureRandom.nextInt(1_000_000);
        return String.format("%0" + CODE_LENGTH + "d", number);
    }
}
