package com.foodtrip.foodsearch.terms.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.foodtrip.foodsearch.terms.entity.TermsDocument;

public interface TermsDocumentRepository extends JpaRepository<TermsDocument, Long> {

    // "현재 버전" = 시행일이 오늘 이하인 것 중 가장 최근에 시행된 것(같은 날짜면 나중에 등록된 것 우선).
    Optional<TermsDocument> findFirstByDocTypeAndEffectiveDateLessThanEqualOrderByEffectiveDateDescTermsDocumentIdDesc(
            String docType, LocalDate today);

    // 아직 시행일이 안 된 버전만 있는 예외적인 상황(예: 첫 버전을 미래 날짜로 등록한 경우) 대비 폴백.
    Optional<TermsDocument> findFirstByDocTypeOrderByEffectiveDateDescTermsDocumentIdDesc(String docType);

    List<TermsDocument> findAllByDocTypeOrderByEffectiveDateDescTermsDocumentIdDesc(String docType);

    boolean existsByDocType(String docType);

    Optional<TermsDocument> findByTermsDocumentIdAndDocType(Long termsDocumentId, String docType);
}
