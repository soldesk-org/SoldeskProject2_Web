package com.foodtrip.foodsearch.member.util;

/**
 * 이메일 찾기 응답에서 이메일을 "ab***@gm****.com" 형태로 고정 마스킹한다.
 * 원본 길이에 비례하지 않는 고정 마스킹(로컬파트 ***, 도메인명 ****)이라
 * 마스킹 강도로부터 원본 길이가 추론되지 않는다.
 */
public final class EmailMasker {

    private static final String LOCAL_MASK = "***";
    private static final String DOMAIN_MASK = "****";

    private EmailMasker() {
    }

    public static String mask(String email) {
        int atIndex = email.indexOf('@');
        String local = email.substring(0, atIndex);
        String domain = email.substring(atIndex + 1);

        int lastDot = domain.lastIndexOf('.');
        String domainName = lastDot >= 0 ? domain.substring(0, lastDot) : domain;
        String tld = lastDot >= 0 ? domain.substring(lastDot) : "";

        return maskPart(local, LOCAL_MASK) + "@" + maskPart(domainName, DOMAIN_MASK) + tld;
    }

    private static String maskPart(String part, String mask) {
        int visibleLength = part.length() >= 2 ? 2 : 1;
        return part.substring(0, visibleLength) + mask;
    }
}
