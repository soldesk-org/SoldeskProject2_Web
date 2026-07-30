package com.foodtrip.foodsearch.business.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.business.entity.BusinessProfile;

public interface BusinessProfileRepository extends JpaRepository<BusinessProfile, Long> {

    boolean existsByBusinessRegistrationNumber(String businessRegistrationNumber);
}
