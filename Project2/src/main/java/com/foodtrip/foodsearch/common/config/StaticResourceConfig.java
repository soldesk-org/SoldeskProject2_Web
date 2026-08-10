package com.foodtrip.foodsearch.common.config;

import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 프로필 사진(005/006 참고)/음식점 사진(07 사업자 등록, 2026-07-20 추가)/영수증 이미지(08 영수증OCR,
 * 2026-07-21 추가)를 로컬 디스크에 저장하고, 각자의 base-url 경로로 그대로 서빙한다. 클라우드 스토리지를
 * 새로 도입하지 않기 위한 최소한의 정적 파일 서빙 설정.
 */
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

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
                .addResourceLocations("file:" + profileImagePath + "/");

        Path restaurantImagePath = Paths.get(restaurantImageUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/restaurant-images/**")
                .addResourceLocations("file:" + restaurantImagePath + "/");

        Path receiptImagePath = Paths.get(receiptImageUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/receipt-images/**")
                .addResourceLocations("file:" + receiptImagePath + "/");

        Path reviewImagePath = Paths.get(reviewImageUploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/review-images/**")
                .addResourceLocations("file:" + reviewImagePath + "/");
    }
}
