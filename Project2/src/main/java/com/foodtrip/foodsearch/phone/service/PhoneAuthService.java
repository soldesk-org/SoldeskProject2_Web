package com.foodtrip.foodsearch.phone.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.common.sms.PpurioSmsService;
import com.foodtrip.foodsearch.mail.entity.EmailVerification;
import com.foodtrip.foodsearch.mail.repository.EmailVerificationRepository;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.phone.entity.PhoneVerification;
import com.foodtrip.foodsearch.phone.repository.PhoneVerificationRepository;

/**
 * 전화번호 SMS 인증(뿌리오 연동) - 이메일 인증(EmailAuthService)과 동일한 패턴.
 * 회원가입(purpose=SIGNUP), 이메일 찾기 전체공개(purpose=FIND_EMAIL) 양쪽에서 공용으로 사용한다.
 */
@Service
public class PhoneAuthService {

    private static final int CODE_LENGTH = 6;
    private static final long EXPIRE_MINUTES = 5;

    private final PhoneVerificationRepository phoneVerificationRepository;
    private final PpurioSmsService ppurioSmsService;
    private final MemberRepository memberRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PhoneSmsRateLimitService phoneSmsRateLimitService;
    private final SecureRandom secureRandom = new SecureRandom();

    public PhoneAuthService(PhoneVerificationRepository phoneVerificationRepository,
                             PpurioSmsService ppurioSmsService,
                             MemberRepository memberRepository,
                             EmailVerificationRepository emailVerificationRepository,
                             PhoneSmsRateLimitService phoneSmsRateLimitService) {
        this.phoneVerificationRepository = phoneVerificationRepository;
        this.ppurioSmsService = ppurioSmsService;
        this.memberRepository = memberRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.phoneSmsRateLimitService = phoneSmsRateLimitService;
    }

    /**
     * 회원가입 흐름 전용 진입점(001-02 5-2-1장): email로 member를 찾고, 이메일 인증이
     * 완료된 상태인지 확인한 뒤에만 SMS 인증번호를 발송한다.
     */
    @Transactional
    public void sendSignupVerificationCode(String email, String phone, String clientIp) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_FOUND));

        boolean emailVerified = emailVerificationRepository
                .findTopByMemberIdAndPurposeOrderByCreatedAtDesc(member.getMemberId(), EmailVerification.PURPOSE_SIGNUP)
                .map(v -> Boolean.TRUE.equals(v.getVerified()))
                .orElse(false);
        if (!emailVerified) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        sendVerificationCode(member.getMemberId(), phone, PhoneVerification.PURPOSE_SIGNUP, clientIp);
    }

    /**
     * 회원가입 흐름 전용 진입점(001-02 5-2-2장).
     */
    @Transactional
    public void verifySignupCode(String email, String phone, String code) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.EMAIL_NOT_FOUND));

        verifyCode(member.getMemberId(), phone, code, PhoneVerification.PURPOSE_SIGNUP);
    }

    @Transactional
    public void sendVerificationCode(Long memberId, String phone, String purpose, String clientIp) {
        // SMS 발송 비용이 실제로 청구되므로, DB에 저장하거나 실제로 발송하기 전에 먼저
        // IP 기준 일일 한도를 확인한다(21.전화번호-인증-속도제한, 2026-07-30 신규).
        phoneSmsRateLimitService.checkAndRecord(clientIp);

        String code = generateCode();
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(EXPIRE_MINUTES);
        phoneVerificationRepository.save(
                PhoneVerification.create(memberId, phone, code, purpose, expiredAt)
        );

        ppurioSmsService.sendSms(phone, buildMessage(code));
    }

    @Transactional
    public void verifyCode(Long memberId, String phone, String code, String purpose) {
        PhoneVerification verification = phoneVerificationRepository
                .findTopByMemberIdAndPurposeOrderByCreatedAtDesc(memberId, purpose)
                .orElseThrow(() -> new CustomException(ErrorCode.PHONE_NOT_FOUND));

        // 발송 이후 전화번호를 바꿔 재요청한 경우, 발송 이력이 없는 것과 동일하게 처리(다시 발송부터 진행하도록)
        if (!verification.matchesPhone(phone)) {
            throw new CustomException(ErrorCode.PHONE_NOT_FOUND);
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
     * 최신 인증 이력이 인증 완료 상태이고, 그 전화번호가 일치하는지 확인한다.
     * (회원가입 최종 단계에서 EMAIL_NOT_VERIFIED 체크와 대칭되는 PHONE_NOT_VERIFIED 체크에 사용)
     */
    public boolean isVerified(Long memberId, String phone, String purpose) {
        return phoneVerificationRepository.findTopByMemberIdAndPurposeOrderByCreatedAtDesc(memberId, purpose)
                .map(v -> Boolean.TRUE.equals(v.getVerified()) && v.matchesPhone(phone))
                .orElse(false);
    }

    /**
     * 전화번호 일치 여부와 무관하게, 인증 완료 후 일정 시간 이내인지만 확인한다.
     * (이메일 찾기 전체공개처럼 인증 시점의 전화번호를 별도로 다시 넘기지 않는 흐름에서 사용)
     */
    public boolean isRecentlyVerified(Long memberId, String purpose, long withinMinutes) {
        return phoneVerificationRepository.findTopByMemberIdAndPurposeOrderByCreatedAtDesc(memberId, purpose)
                .map(v -> Boolean.TRUE.equals(v.getVerified())
                        && v.getVerifiedAt() != null
                        && v.getVerifiedAt().isAfter(LocalDateTime.now().minusMinutes(withinMinutes)))
                .orElse(false);
    }

    private String generateCode() {
        int number = secureRandom.nextInt(1_000_000);
        return String.format("%0" + CODE_LENGTH + "d", number);
    }

    // 2026-07-20 실사용자 라이브 테스트 확인 후, 가독성을 위해 줄바꿈 포맷으로 변경.
    private String buildMessage(String code) {
        return "[Eattyway]\n본인확인 인증번호는 [" + code + "]입니다.\n5분 이내에 입력해주세요.";
    }
}
