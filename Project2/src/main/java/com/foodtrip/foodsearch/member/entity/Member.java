package com.foodtrip.foodsearch.member.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "members")
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "nickname", nullable = false, unique = true, length = 50)
    private String nickname;

    // 구글 등 일부 플랫폼의 프로필 사진 URL이 500자를 넘는 경우가 있어(2026-07-20 실사용 중 발견,
    // "Data too long for column" 오류로 회원 생성 자체가 실패했음) 여유 있게 2000자로 늘림.
    @Column(name = "profile_image_url", length = 2000)
    private String profileImageUrl;

    // AES-256-GCM 암호문(Base64)으로 저장된다. 엔티티 코드에서는 항상 평문으로 다뤄지며,
    // 암호화/복호화는 PhoneAttributeConverter가 DB 경계에서 자동으로 처리한다.
    @Convert(converter = PhoneAttributeConverter.class)
    @Column(name = "phone", length = 255)
    private String phone;

    // 전화번호의 HMAC-SHA256 해시(hex, 결정적). phone은 암호화되어 매번 값이 달라지므로
    // 중복 확인/조회는 이 컬럼(UNIQUE)으로 한다.
    @Column(name = "phone_hash", unique = true, length = 64)
    private String phoneHash;

    // 마이페이지(11) "음BTI" 필드. 값은 12.음BTI 퀴즈(POST /api/food-bti/result, 로그인 상태) 결과로 채워짐
    // (2026-07-22 연동 — updateFoodBti() 참고). 아직 안 풀었으면 null.
    @Column(name = "food_bti", length = 20)
    private String foodBti;

    // 음BTI 축별 점수(2026-08-04 추가) — "l:s:f:n:a:t:p:i" 형식의 콜론 구분 정수 8개(각 0~3, 질문 12개를
    // 4축 3문항씩 나눠 채점). 마이페이지에서 퍼센트 막대를 다시 보여주려면 최종 유형 코드(4글자)만으로는
    // 축별 비중(예: 2:1 vs 3:0)을 복원할 수 없어서 별도로 저장한다. FoodBtiServiceImpl 참고.
    @Column(name = "food_bti_score", length = 40)
    private String foodBtiScore;

    // 알림 설정(2026-08-06 추가) — 마이페이지/회원가입 화면의 알림 체크박스가 실제로 동작하지 않던 문제.
    // 기존 회원도 화면의 기본 체크 상태(추천/채팅 켜짐, 마케팅 꺼짐)와 동일하게 시작하도록 DB 기본값을
    // 맞춘다(columnDefinition — 이미 있던 회원 행도 이 값으로 채워짐).
    @Column(name = "notify_recommend", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private boolean notifyRecommend = true;

    @Column(name = "notify_chat", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private boolean notifyChat = true;

    @Column(name = "notify_marketing", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private boolean notifyMarketing = false;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "role", nullable = false, length = 20)
    private String role;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    // 탈퇴 사유(2026-08-06 추가) — mypage.html #withdrawReasonSelect의 코드값. 선택 안 하면 null.
    @Column(name = "withdrawal_reason", length = 20)
    private String withdrawalReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    protected Member() {
    }

    public static Member createPending(String email) {
        Member member = new Member();
        member.email = email;
        member.nickname = "PENDING_" + System.nanoTime();
        member.status = "ACTIVE";
        member.role = "USER";
        return member;
    }

    // 소셜로그인 신규가입(001-02(소셜로그인) 2-3장) 전용: 이메일/전화번호 재인증 없이 플랫폼이 준 정보로
    // 바로 확정 상태(ACTIVE)의 회원을 만든다. createPending()과 달리 PENDING 닉네임 → completeSignUp()으로
    // 이어지는 2단계가 필요 없다(비밀번호가 없어 회원가입 최종 확정 단계 자체가 없는 계정이므로).
    // profileImageUrl은 플랫폼이 준 값을 그대로 저장(null이면 프로필 사진 미제공 — 6장(소셜로그인) 참고),
    // 최초 가입 시점에만 반영하고 재로그인 시 다시 덮어쓰지 않는다(닉네임과 동일한 정책).
    public static Member createSocial(String email, String nickname, String profileImageUrl) {
        Member member = new Member();
        member.email = email;
        member.nickname = nickname;
        member.profileImageUrl = profileImageUrl;
        member.status = "ACTIVE";
        member.role = "USER";
        return member;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void completeSignUp(String nickname, String phone, String phoneHash) {
        this.nickname = nickname;
        this.phone = phone;
        this.phoneHash = phoneHash;
    }

    // 일반 가입을 끝까지 완료하지 않고 이탈한 pending 회원(createPending() 참고, 닉네임이 "PENDING_"으로
    // 시작)이 같은 이메일로 소셜로그인을 하는 경우(2026-08-14 추가) — SocialLoginServiceImpl이 기존 회원을
    // 그대로 재사용하기 전에 이 메서드로 실제 닉네임/프로필 사진을 채워 가입을 완료시킨다. profileImageUrl은
    // createSocial()과 동일하게 최초 1회만 반영한다(값이 null이면 기본 이미지 유지).
    public boolean isPendingSignUp() {
        return nickname != null && nickname.startsWith("PENDING_");
    }

    public void completeSocialSignUp(String nickname, String profileImageUrl) {
        this.nickname = nickname;
        this.profileImageUrl = profileImageUrl;
    }

    // 사업자 회원가입(001-02 13장)에서 사업자등록증명원 검증까지 통과한 이후에만 호출한다.
    public void markAsBusiness() {
        this.role = "BUSINESS";
    }

    public void updateLastLoginAt(LocalDateTime loginAt) {
        this.lastLoginAt = loginAt;
    }

    // 회원정보수정(001-02(회원정보수정) 2-4장): 항목별로 따로 갱신한다 - completeSignUp()은
    // 회원가입 전용(닉네임+전화번호를 항상 함께 확정)이라 부분 수정에는 맞지 않는다.
    public void updateNickname(String nickname) {
        this.nickname = nickname;
    }

    public void updateEmail(String email) {
        this.email = email;
    }

    public void updatePhone(String phone, String phoneHash) {
        this.phone = phone;
        this.phoneHash = phoneHash;
    }

    // 회원탈퇴(001-02(회원정보수정) 2-5장, 2026-08-06 닉네임 익명화 추가): 리뷰/오픈채팅 등 다른 도메인이
    // member_id로 조인해서 nickname을 실시간으로 보여주는 구조라(스냅샷 컬럼이 없는 곳들), 탈퇴 후에도
    // 원래 닉네임이 그대로 노출되는 문제가 있었다 — 회원탈퇴 모달 안내문("리뷰는 익명 처리 후 유지됩니다")과
    // 실제 동작을 맞추기 위해 여기서 닉네임을 바꾼다. "탈퇴한 회원" + memberId로 유니크 제약을 그대로 만족.
    // email/전화번호는 손대지 않는다(이메일찾기·재가입 등 다른 흐름에 영향이 있어 이번 범위 밖).
    public void withdraw(String reason) {
        this.status = "WITHDRAWN";
        this.withdrawnAt = LocalDateTime.now();
        this.withdrawalReason = (reason == null || reason.isBlank()) ? null : reason;
        this.nickname = "탈퇴한 회원" + memberId;
    }

    // 관리자 계정 정지/해제(14.관리자-권한, 2026-07-23 추가). WITHDRAWN 상태는 대상이 아니다(탈퇴 취소는
    // 별도 정책이 없는 이번 범위 밖 — AdminServiceImpl에서 상태를 먼저 확인해 가드한다).
    public void suspend() {
        this.status = "SUSPENDED";
    }

    public void reactivate() {
        this.status = "ACTIVE";
    }

    // 프로필 사진 등록/변경/삭제(001-02(회원정보수정) 2-6장). null을 넘기면 사진 없는 상태(기본 프로필로
    // 대체 표시)로 되돌아간다.
    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    // 음BTI 계산 결과 저장(12.음BTI, 2026-07-22 연동). 48번째 줄의 옛 주석("값 설정 API는 만들지 않는다")은
    // 이 기능이 실제로 연동되면서 더 이상 유효하지 않음 — FoodBtiServiceImpl 참고.
    public void updateFoodBti(String foodBti, String foodBtiScore) {
        this.foodBti = foodBti;
        this.foodBtiScore = foodBtiScore;
    }

    public void updateNotificationSettings(boolean notifyRecommend, boolean notifyChat, boolean notifyMarketing) {
        this.notifyRecommend = notifyRecommend;
        this.notifyChat = notifyChat;
        this.notifyMarketing = notifyMarketing;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getEmail() {
        return email;
    }

    public String getNickname() {
        return nickname;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public String getPhone() {
        return phone;
    }

    public String getPhoneHash() {
        return phoneHash;
    }

    public String getFoodBti() {
        return foodBti;
    }

    public String getFoodBtiScore() {
        return foodBtiScore;
    }

    public String getStatus() {
        return status;
    }

    public String getRole() {
        return role;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public LocalDateTime getWithdrawnAt() {
        return withdrawnAt;
    }

    public String getWithdrawalReason() {
        return withdrawalReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public boolean isNotifyRecommend() {
        return notifyRecommend;
    }

    public boolean isNotifyChat() {
        return notifyChat;
    }

    public boolean isNotifyMarketing() {
        return notifyMarketing;
    }
}
