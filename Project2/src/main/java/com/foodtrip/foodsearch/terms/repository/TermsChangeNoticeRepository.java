package com.foodtrip.foodsearch.terms.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.terms.entity.TermsChangeNotice;

public interface TermsChangeNoticeRepository extends JpaRepository<TermsChangeNotice, Long> {

    List<TermsChangeNotice> findAllByOrderByPostedAtDesc();
}
