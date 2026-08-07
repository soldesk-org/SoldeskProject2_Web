package com.foodtrip.foodsearch.admin.service;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.foodtrip.foodsearch.admin.dto.AdminActionResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminDashboardResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminMemberResponseDto;
import com.foodtrip.foodsearch.admin.dto.AdminReviewResponseDto;
import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;
import com.foodtrip.foodsearch.member.entity.Member;
import com.foodtrip.foodsearch.member.repository.MemberRepository;
import com.foodtrip.foodsearch.member.service.RefreshTokenService;
import com.foodtrip.foodsearch.notification.entity.Notification;
import com.foodtrip.foodsearch.notification.service.NotificationService;
import com.foodtrip.foodsearch.report.service.AdminReportService;
import com.foodtrip.foodsearch.restaurant.repository.RestaurantRepository;
import com.foodtrip.foodsearch.review.entity.Review;
import com.foodtrip.foodsearch.review.repository.ReviewRepository;
import com.foodtrip.foodsearch.review.service.ReviewKeywordDao;
import org.springframework.util.StringUtils;

// 14(관리자-권한) — 이 서비스는 컨트롤러 계층에서 이미 Spring Security(SecurityConfig의
// /api/admin/** hasRole("ADMIN"))가 접근을 막아주기 때문에, 다른 도메인 서비스들과 달리 Authorization
// 헤더를 직접 파싱하는 resolveMemberId() 패턴이 없다 — 이 Service에 도달했다는 것 자체가 이미 ADMIN
// 권한으로 인증된 요청이라는 뜻이다(이게 이번에 Spring Security를 실제로 도입한 이유).
@Service
public class AdminServiceImpl implements AdminService {

    private static final int LIST_LIMIT = 200;

    private final MemberRepository memberRepository;
    private final ReviewRepository reviewRepository;
    private final RestaurantRepository restaurantRepository;
    private final RefreshTokenService refreshTokenService;
    private final AdminReportService adminReportService;
    private final ReviewKeywordDao reviewKeywordDao;
    private final NotificationService notificationService;

    public AdminServiceImpl(MemberRepository memberRepository, ReviewRepository reviewRepository,
                             RestaurantRepository restaurantRepository, RefreshTokenService refreshTokenService,
                             AdminReportService adminReportService, ReviewKeywordDao reviewKeywordDao,
                             NotificationService notificationService) {
        this.memberRepository = memberRepository;
        this.reviewRepository = reviewRepository;
        this.restaurantRepository = restaurantRepository;
        this.refreshTokenService = refreshTokenService;
        this.adminReportService = adminReportService;
        this.reviewKeywordDao = reviewKeywordDao;
        this.notificationService = notificationService;
    }

    @Override
    public List<AdminMemberResponseDto> listMembers(String role) {
        var page = StringUtils.hasText(role)
                ? memberRepository.findAllByRoleOrderByCreatedAtDesc(role, PageRequest.of(0, LIST_LIMIT))
                : memberRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, LIST_LIMIT));
        return page.map(m -> new AdminMemberResponseDto(m.getMemberId(), m.getEmail(), m.getNickname(),
                        m.getStatus(), m.getRole(), m.getCreatedAt()))
                .getContent();
    }

    // 14(관리자-권한) 2차 — "전체 회원 수/일반 회원/사업자 회원", "작성된 리뷰 수/신고된 리뷰 수" 통계.
    // 음식점 통계가 없는 이유는 AdminDashboardResponseDto 클래스 설명 참고.
    @Override
    public AdminDashboardResponseDto getDashboard() {
        long memberGeneral = memberRepository.countByRole("USER");
        long memberBusiness = memberRepository.countByRole("BUSINESS");
        long memberAdmin = memberRepository.countByRole("ADMIN");
        long reviewTotal = reviewRepository.countByStatusAndDeletedAtIsNull(Review.STATUS_NORMAL);
        long reviewReported = adminReportService.countPendingReportedReviews();

        return new AdminDashboardResponseDto(memberGeneral + memberBusiness + memberAdmin, memberGeneral,
                memberBusiness, memberAdmin, reviewTotal, reviewReported);
    }

    @Override
    @Transactional
    public AdminActionResponseDto suspendMember(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        if (!"ACTIVE".equals(member.getStatus())) {
            throw new CustomException(ErrorCode.MEMBER_STATUS_INVALID);
        }
        member.suspend();
        // 재발급(refresh token)은 즉시 막는다 - 현재 이미 발급된 accessToken은 자연 만료(기본 60분)까지
        // 유효할 수 있다는 한계가 있음(001-02 2-2장 참고, 05(회원정보수정)에서도 이미 인지된 동일한 종류의 한계).
        refreshTokenService.revoke(memberId);
        return new AdminActionResponseDto(true, "회원을 정지했습니다.");
    }

    @Override
    @Transactional
    public AdminActionResponseDto unsuspendMember(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        if (!"SUSPENDED".equals(member.getStatus())) {
            throw new CustomException(ErrorCode.MEMBER_STATUS_INVALID);
        }
        member.reactivate();
        return new AdminActionResponseDto(true, "회원 정지를 해제했습니다.");
    }

    @Override
    public List<AdminReviewResponseDto> listReviews() {
        List<Review> reviews = reviewRepository
                .findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(Review.STATUS_NORMAL,
                        PageRequest.of(0, LIST_LIMIT))
                .getContent();

        List<Long> memberIds = reviews.stream().map(Review::getMemberId).distinct().toList();
        var nicknameByMemberId = memberRepository.findAllById(memberIds).stream()
                .collect(java.util.stream.Collectors.toMap(Member::getMemberId, Member::getNickname));

        List<Long> reviewIds = reviews.stream().map(Review::getReviewId).toList();
        var keywordsByReviewId = reviewKeywordDao.findKeywordsByReviewIds(reviewIds);

        return reviews.stream()
                .map(r -> new AdminReviewResponseDto(r.getReviewId(), r.getMemberId(),
                        nicknameByMemberId.get(r.getMemberId()), r.getRestaurantId(), r.getRestaurantNameSnapshot(),
                        r.getRating(), r.getContent(), r.getCreatedAt(),
                        keywordsByReviewId.getOrDefault(r.getReviewId(), List.of())))
                .toList();
    }

    @Override
    @Transactional
    public AdminActionResponseDto deleteReview(Long reviewId) {
        Review review = reviewRepository.findByReviewIdAndDeletedAtIsNull(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        review.delete();
        refreshRatingCache(review.getRestaurantId());
        return new AdminActionResponseDto(true, "리뷰를 삭제했습니다.");
    }

    @Override
    @Transactional
    public AdminActionResponseDto broadcastNotification(String title, String body) {
        List<Long> activeMemberIds = memberRepository.findMemberIdsByStatus("ACTIVE");
        for (Long memberId : activeMemberIds) {
            notificationService.create(memberId, Notification.TYPE_NOTICE, title, body, null);
        }
        return new AdminActionResponseDto(true, activeMemberIds.size() + "명에게 공지를 발송했습니다.");
    }

    // 리뷰 삭제(10.리뷰) 때와 동일한 평점 캐시 재계산 — 관리자가 리뷰를 지워도 그 음식점의 avgRating/
    // reviewCount가 갱신되지 않으면 삭제된 리뷰 점수가 계속 평균에 남아있게 된다.
    private void refreshRatingCache(String restaurantId) {
        restaurantRepository.findByRestaurantIdAndDeletedAtIsNull(restaurantId).ifPresent(restaurant -> {
            var avgRating = reviewRepository.findAverageRating(restaurantId);
            long count = reviewRepository.countByRestaurantIdAndStatusAndDeletedAtIsNull(restaurantId,
                    Review.STATUS_NORMAL);
            restaurant.updateRatingCache(avgRating, (int) count);
        });
    }
}
