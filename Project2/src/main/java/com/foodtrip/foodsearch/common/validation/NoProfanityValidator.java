package com.foodtrip.foodsearch.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class NoProfanityValidator implements ConstraintValidator<NoProfanity, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // null/빈 값은 @NotBlank 등 다른 어노테이션이 이미 처리하므로 여기서는 통과시킨다.
        if (value == null || value.isBlank()) {
            return true;
        }
        return !NicknameProfanityFilter.containsProfanity(value);
    }
}
