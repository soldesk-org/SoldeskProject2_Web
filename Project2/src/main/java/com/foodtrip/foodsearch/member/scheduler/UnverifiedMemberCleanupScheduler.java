package com.foodtrip.foodsearch.member.scheduler;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.mail.repository.EmailVerificationRepository;
import com.foodtrip.foodsearch.member.repository.MemberRepository;

/**
 * 이메일 인증(또는 그 이전) 단계에서 만들어진 members row가 회원가입을 끝까지 완료하지 않고
 * 이탈한 경우, 해당 이메일이 members.email UNIQUE 제약에 그대로 남아 재가입을 막게 된다.
 * 일정 시간이 지나도 member_credentials가 생성되지 않은 row를 주기적으로 정리한다.
 */
@Component
public class UnverifiedMemberCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(UnverifiedMemberCleanupScheduler.class);

    private final MemberRepository memberRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final long unverifiedAfterHours;

    public UnverifiedMemberCleanupScheduler(MemberRepository memberRepository,
                                             EmailVerificationRepository emailVerificationRepository,
                                             @Value("${member.cleanup.unverified-after-hours:24}") long unverifiedAfterHours) {
        this.memberRepository = memberRepository;
        this.emailVerificationRepository = emailVerificationRepository;
        this.unverifiedAfterHours = unverifiedAfterHours;
    }

    @Scheduled(cron = "${member.cleanup.cron:0 0 * * * *}")
    @Transactional
    public void cleanupUnverifiedMembers() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(unverifiedAfterHours);
        List<Long> targetIds = memberRepository.findUnverifiedMemberIdsCreatedBefore(cutoff);
        if (targetIds.isEmpty()) {
            return;
        }

        emailVerificationRepository.deleteByMemberIdIn(targetIds);
        memberRepository.deleteAllByIdInBatch(targetIds);

        log.info("Cleaned up {} unverified member row(s) created before {} ({}h cutoff)",
                targetIds.size(), cutoff, unverifiedAfterHours);
    }
}
