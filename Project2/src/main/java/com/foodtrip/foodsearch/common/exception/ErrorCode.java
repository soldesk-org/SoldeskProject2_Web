package com.foodtrip.foodsearch.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값 형식이 올바르지 않습니다."),
    EMAIL_NOT_FOUND(HttpStatus.BAD_REQUEST, "인증번호 발송 이력이 없는 이메일입니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "이메일 인증이 완료되지 않았습니다."),
    INVALID_CODE(HttpStatus.BAD_REQUEST, "인증번호가 일치하지 않습니다."),
    EXPIRED_CODE(HttpStatus.BAD_REQUEST, "인증번호가 만료되었습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 가입된 이메일입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
    DUPLICATE_PHONE(HttpStatus.CONFLICT, "이미 사용 중인 전화번호입니다."),
    ALREADY_SIGNED_UP(HttpStatus.CONFLICT, "이미 가입이 완료된 회원입니다."),
    MAIL_SEND_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "메일 발송에 실패했습니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 일치하지 않습니다."),
    ACCOUNT_LOCKED(HttpStatus.LOCKED, "로그인 실패 횟수를 초과하여 계정이 잠겼습니다. 30분 후 다시 시도해주세요."),
    ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "이용이 정지된 계정입니다. 고객센터에 문의해주세요."),
    ACCOUNT_WITHDRAWN(HttpStatus.FORBIDDEN, "탈퇴 처리된 계정입니다."),
    // 일반/사업자 로그인 탭이 서로 다른 회원 유형의 계정으로 로그인되던 문제(2026-08-10) — 비밀번호까지
    // 확인된 이후에만 검사하므로 무차별 대입 공격에 계정 존재 여부를 추가로 노출하지 않는다.
    MEMBER_TYPE_MISMATCH(HttpStatus.FORBIDDEN, "선택한 회원 유형과 계정 종류가 일치하지 않습니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 재발급 토큰입니다. 다시 로그인해주세요."),
    NOT_LOGGED_IN(HttpStatus.UNAUTHORIZED, "로그인 상태가 아닙니다."),
    MEMBER_NOT_FOUND(HttpStatus.BAD_REQUEST, "일치하는 회원 정보를 찾을 수 없습니다."),
    INVALID_RESET_TOKEN(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 링크입니다."),
    PASSWORD_CONFIRM_MISMATCH(HttpStatus.BAD_REQUEST, "새 비밀번호가 일치하지 않습니다."),
    PHONE_NOT_FOUND(HttpStatus.BAD_REQUEST, "인증번호 발송 이력이 없는 전화번호입니다."),
    PHONE_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "전화번호 인증이 완료되지 않았습니다."),
    SMS_SEND_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "SMS 발송에 실패했습니다."),
    PHONE_SMS_DAILY_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "SMS 인증 요청 횟수를 초과했습니다. 내일 다시 시도해주세요."),
    INVALID_VERIFICATION_TOKEN(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 조회 정보입니다. 이메일 찾기를 다시 시도해주세요."),
    DUPLICATE_BUSINESS_NUMBER(HttpStatus.CONFLICT, "이미 등록된 사업자등록번호입니다."),
    BUSINESS_VERIFICATION_FAILED(HttpStatus.BAD_REQUEST, "사업자등록증명원 검증에 실패했습니다."),
    BUSINESS_VERIFY_SERVICE_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "사업자 인증 서버와 통신할 수 없습니다."),
    EMAIL_ALREADY_REGISTERED(HttpStatus.CONFLICT, "이미 가입된 계정이 있습니다. 이메일/비밀번호로 로그인해주세요."),
    SOCIAL_LOGIN_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "소셜 로그인 처리 중 오류가 발생했습니다."),
    INVALID_OAUTH_STATE(HttpStatus.BAD_REQUEST, "유효하지 않거나 만료된 요청입니다. 로그인을 다시 시도해주세요."),
    SOCIAL_ACCOUNT_PASSWORD_CHANGE_NOT_ALLOWED(HttpStatus.FORBIDDEN, "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다."),
    SOCIAL_UNLINK_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "소셜 계정 연동 해제에 실패했습니다."),
    SOCIAL_ACCOUNT_NOT_LINKED(HttpStatus.NOT_FOUND, "연동된 소셜 계정이 없습니다."),
    // 사업자 계정은 소셜 로그인으로 들어올 수 없다(2026-08-07) — 같은 이메일이면 자동으로 계정을
    // 연동해주는 정책이 있는데, 사업자 계정까지 그렇게 연결해버리면 사업자 전용 로그인 화면을
    // 우회해 소셜 계정으로 사업자 권한을 얻게 되므로 아예 막는다.
    SOCIAL_LOGIN_NOT_ALLOWED_FOR_BUSINESS(HttpStatus.FORBIDDEN,
            "사업자 계정은 소셜 로그인을 사용할 수 없습니다. 사업자 로그인으로 이용해주세요."),
    INVALID_PROFILE_IMAGE(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 형식이거나 용량이 너무 큽니다."),
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),
    RESTAURANT_NOT_FOUND(HttpStatus.NOT_FOUND, "음식점을 찾을 수 없습니다."),
    RESTAURANT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "이 음식점을 관리할 권한이 없습니다."),
    BUSINESS_RESTAURANT_NOT_CLAIMED(HttpStatus.NOT_FOUND, "아직 연결된 매장이 없습니다."),
    RESTAURANT_ADDRESS_MISMATCH(HttpStatus.BAD_REQUEST, "선택한 매장 주소가 사업자등록증명원 주소와 일치하지 않습니다."),
    RESTAURANT_ALREADY_CLAIMED(HttpStatus.CONFLICT, "이미 다른 사업자가 등록한 매장입니다."),
    BUSINESS_RESTAURANT_ALREADY_LINKED(HttpStatus.CONFLICT, "이미 연결된 매장이 있습니다."),
    MENU_NOT_FOUND(HttpStatus.NOT_FOUND, "메뉴를 찾을 수 없습니다."),
    INVALID_RESTAURANT_IMAGE(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 형식이거나 용량이 너무 큽니다."),
    RESTAURANT_IMAGE_LIMIT_EXCEEDED(HttpStatus.CONFLICT, "매장 사진은 최대 4장까지 등록할 수 있습니다."),
    RESTAURANT_IMAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."),
    KAKAO_LOCAL_SEARCH_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "카카오 로컬 API 연동 중 오류가 발생했습니다."),
    RECEIPT_EMPTY_FILE(HttpStatus.BAD_REQUEST, "빈 파일입니다."),
    RECEIPT_INVALID_IMAGE(HttpStatus.BAD_REQUEST, "이미지를 인식할 수 없습니다."),
    RECEIPT_NO_TEXT_DETECTED(HttpStatus.UNPROCESSABLE_ENTITY, "이미지에서 텍스트를 전혀 인식하지 못했습니다. 사진을 다시 촬영해주세요."),
    RECEIPT_PARSE_FAILED(HttpStatus.UNPROCESSABLE_ENTITY, "영수증 정보를 인식하지 못했습니다."),
    RECEIPT_STORE_NAME_NOT_FOUND(HttpStatus.UNPROCESSABLE_ENTITY, "상호명을 인식하지 못했습니다."),
    RECEIPT_ORDER_DATETIME_NOT_FOUND(HttpStatus.UNPROCESSABLE_ENTITY, "주문 일시를 인식하지 못했습니다."),
    RECEIPT_TRANSACTION_ID_NOT_FOUND(HttpStatus.UNPROCESSABLE_ENTITY, "승인번호/영수증번호를 인식하지 못했습니다."),
    RECEIPT_OCR_SERVICE_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "영수증 인식 서버와 통신할 수 없습니다."),
    DUPLICATE_RECEIPT(HttpStatus.CONFLICT, "이미 사용된 영수증입니다."),
    INVALID_RECEIPT_IMAGE(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 형식이거나 용량이 너무 큽니다."),
    RECEIPT_NOT_FOUND(HttpStatus.NOT_FOUND, "영수증을 찾을 수 없습니다."),
    RECEIPT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "본인이 등록한 영수증만 조회할 수 있습니다."),
    REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "리뷰를 찾을 수 없습니다."),
    REVIEW_ACCESS_DENIED(HttpStatus.FORBIDDEN, "본인이 작성한 리뷰만 수정/삭제할 수 있습니다."),
    SEARCH_HISTORY_NOT_FOUND(HttpStatus.NOT_FOUND, "검색 기록을 찾을 수 없습니다."),
    REVIEW_KEYWORD_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "허용되지 않은 리뷰 태그입니다."),
    REVIEW_CONTENT_REQUIRED(HttpStatus.BAD_REQUEST, "태그를 선택하거나 리뷰 내용을 입력해주세요."),
    REVIEW_RECEIPT_REQUIRED(HttpStatus.BAD_REQUEST, "영수증 인증 후에만 리뷰를 작성할 수 있습니다. 영수증을 먼저 등록해주세요."),
    REVIEW_RECEIPT_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "이 영수증으로는 리뷰 인증을 확인할 수 없습니다. 본인이 등록한, 이 음식점의 영수증인지 확인해주세요."),
    REVIEW_CONTENT_PROFANITY(HttpStatus.BAD_REQUEST, "리뷰 내용에 부적절한 표현이 포함되어 있습니다."),
    RECOMMENDATION_SERVICE_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "AI 추천 서버와 통신할 수 없습니다."),
    RECOMMENDATION_HISTORY_NOT_FOUND(HttpStatus.NOT_FOUND, "피드백을 남길 추천 요청 이력을 찾을 수 없습니다."),
    ADMIN_ACCESS_DENIED(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다."),
    MEMBER_STATUS_INVALID(HttpStatus.CONFLICT, "이 회원 상태에서는 처리할 수 없는 요청입니다."),
    PARKING_DATA_SERVICE_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "주차장 정보 서버와 통신할 수 없습니다."),
    PARKING_DATA_SYNC_ALREADY_RUNNING(HttpStatus.CONFLICT, "주차장 정보 동기화가 이미 진행 중입니다. 잠시 후 다시 시도해주세요."),
    DIRECTIONS_SERVICE_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "길찾기 서버와 통신할 수 없습니다."),
    SUPPORT_CHAT_SERVICE_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "AI 고객센터 챗봇과 통신할 수 없습니다. 잠시 후 다시 시도해주세요."),
    SUPPORT_CHAT_DAILY_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "오늘 문의 가능한 횟수를 초과했습니다. 내일 다시 시도해주세요."),
    REPORT_REASON_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "허용되지 않은 신고 사유입니다."),
    REVIEW_ALREADY_REPORTED(HttpStatus.CONFLICT, "이미 신고한 리뷰입니다."),
    REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "처리할 신고 내역이 없습니다."),
    CHAT_ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않거나 폭파된 채팅방입니다."),
    CHAT_ROOM_ACCESS_DENIED(HttpStatus.FORBIDDEN, "방장만 할 수 있는 작업입니다."),
    CHAT_ROOM_NOT_MEMBER(HttpStatus.FORBIDDEN, "참가 중인 채팅방이 아닙니다."),
    CHAT_MESSAGE_NOT_FOUND(HttpStatus.NOT_FOUND, "메시지를 찾을 수 없습니다."),
    CHAT_MESSAGE_CONTENT_REQUIRED(HttpStatus.BAD_REQUEST, "메시지 내용을 입력해주세요."),
    CHAT_MESSAGE_PROFANITY(HttpStatus.BAD_REQUEST, "메시지에 부적절한 표현이 포함되어 있습니다."),
    CHAT_ALREADY_REPORTED(HttpStatus.CONFLICT, "이미 신고했습니다."),
    CHAT_ROOM_FULL(HttpStatus.CONFLICT, "채팅방 인원이 가득 찼습니다."),
    GEOCODE_SERVICE_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "주소-좌표 변환 서버와 통신할 수 없습니다."),
    GEOCODE_NOT_FOUND(HttpStatus.NOT_FOUND, "입력한 주소의 좌표를 찾을 수 없습니다."),
    FOOD_BTI_RESULT_NOT_FOUND(HttpStatus.NOT_FOUND, "저장된 음BTI 결과가 없습니다."),
    SHORT_LINK_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않거나 만료된 링크입니다."),
    SHORT_LINK_INVALID_TARGET(HttpStatus.BAD_REQUEST, "단축할 수 없는 주소입니다.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
