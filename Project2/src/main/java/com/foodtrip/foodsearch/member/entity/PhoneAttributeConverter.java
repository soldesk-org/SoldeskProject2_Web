package com.foodtrip.foodsearch.member.entity;

import org.springframework.stereotype.Component;

import com.foodtrip.foodsearch.common.security.PhoneCryptoService;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Member.phone 필드를 DB에 쓰고 읽을 때 자동으로 AES-256-GCM 암호화/복호화한다.
 * 엔티티 코드(getPhone/completeSignUp 등)는 항상 평문을 다루고, 암호화는 이 컨버터 경계에서만 일어난다.
 * autoApply=false로 두고 Member.phone 필드에 @Convert로 명시 적용한다(다른 필드에 실수로 적용되는 것 방지).
 */
@Component
@Converter(autoApply = false)
public class PhoneAttributeConverter implements AttributeConverter<String, String> {

    private final PhoneCryptoService phoneCryptoService;

    public PhoneAttributeConverter(PhoneCryptoService phoneCryptoService) {
        this.phoneCryptoService = phoneCryptoService;
    }

    @Override
    public String convertToDatabaseColumn(String plainPhone) {
        return plainPhone == null ? null : phoneCryptoService.encrypt(plainPhone);
    }

    @Override
    public String convertToEntityAttribute(String encryptedPhone) {
        return encryptedPhone == null ? null : phoneCryptoService.decrypt(encryptedPhone);
    }
}
