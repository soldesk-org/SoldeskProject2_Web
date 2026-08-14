package com.foodtrip.foodsearch.common.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 프로필 사진(005/006 참고)/음식점 사진(07 사업자 등록, 2026-07-20 추가)/영수증 이미지(08 영수증OCR,
 * 2026-07-21 추가)를 로컬 디스크에 저장하고, 각자의 base-url 경로로 그대로 서빙한다. 클라우드 스토리지를
 * 새로 도입하지 않기 위한 최소한의 정적 파일 서빙 설정.
 *
 * 이미지 캐싱(2026-08-14 추가) — 네이버 지도 마커/업로드 이미지가 새로고침할 때마다 매번 서버에서
 * 다시 받아져서, 동시 접속자가 몇 명만 늘어도 서버 부하가 커지는 문제가 있었다. Cache-Control로
 * 브라우저가 로컬에 들고 있게 한다. 1시간은 업로드 이미지(사업자가 사진을 바꿀 수 있어 너무 길면
 * 안 됨)용, 마커 이미지처럼 배포 전엔 절대 안 바뀌는 정적 이미지는 훨씬 길게(7일) 잡아도 안전하다.
 * JS/CSS/HTML은 파일명에 버전 해시가 없어서(캐시 무효화 수단이 없음) 여기서 캐싱하지 않는다 —
 * 캐싱하면 배포해도 기존 방문자에게 새 코드가 한참 안 보이게 된다.
 */
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    private static final CacheControl UPLOADED_IMAGE_CACHE = CacheControl.maxAge(Duration.ofHours(1)).cachePublic();
    private static final CacheControl BUNDLED_IMAGE_CACHE = CacheControl.maxAge(Duration.ofDays(7)).cachePublic();

    private final String profileImageUploadDir;
    private final String restaurantImageUploadDir;
    private final String receiptImageUploadDir;
    private final String reviewImageUploadDir;

    public StaticResourceConfig(@Value("${profile-image.upload-dir}") String profileImageUploadDir,
                                 @Value("${restaurant-image.upload-dir}") String restaurantImageUploadDir,
                                 @Value("${receipt-image.upload-dir}") String receiptImageUploadDir,
                                 @Value("${review-image.upload-dir}") String reviewImageUploadDir) {
        this.profileImageUploadDir = profileImageUploadDir;
        this.restaurantImageUploadDir = restaurantImageUploadDir;
        this.receiptImageUploadDir = receiptImageUploadDir;
        this.reviewImageUploadDir = reviewImageUploadDir;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path profileImagePath = Paths.get(profileImageUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/profile-images/**")
                .addResourceLocations("file:" + profileImagePath + "/")
                .setCacheControl(UPLOADED_IMAGE_CACHE);

        Path restaurantImagePath = Paths.get(restaurantImageUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/restaurant-images/**")
                .addResourceLocations("file:" + restaurantImagePath + "/")
                .setCacheControl(UPLOADED_IMAGE_CACHE);

        Path receiptImagePath = Paths.get(receiptImageUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/receipt-images/**")
                .addResourceLocations("file:" + receiptImagePath + "/")
                .setCacheControl(UPLOADED_IMAGE_CACHE);

        Path reviewImagePath = Paths.get(reviewImageUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/review-images/**")
                .addResourceLocations("file:" + reviewImagePath + "/")
                .setCacheControl(UPLOADED_IMAGE_CACHE);

        // 마커/로고 등 배포에 포함된 정적 이미지(2026-08-14 추가) — 지도에 뜨는 마커 PNG들이 새로고침마다
        // 다시 받아지던 문제. static/img/** 만 별도 핸들러로 분리해서 JS/CSS는 그대로 두고 이미지만 캐싱한다.
        registry.addResourceHandler("/img/**")
                .addResourceLocations("classpath:/static/img/")
                .setCacheControl(BUNDLED_IMAGE_CACHE);

        // favicon/파비콘/프로필 기본 이미지 등도 같은 이유로 캐싱(2026-08-14 후속 추가) — 처음엔 /img/**만
        // 잡아서 favicon.ico와 assets/images/** 밑의 아이콘들은 여전히 캐싱이 안 되고 있었다.
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(BUNDLED_IMAGE_CACHE);
        registry.addResourceHandler("/assets/images/**")
                .addResourceLocations("classpath:/static/assets/images/")
                .setCacheControl(BUNDLED_IMAGE_CACHE);
    }
}
