
------------------------------------------------------------------------
# DB 테이블 설계 요약
------------------------------------------------------------------------
> **2026-07-22 전면 갱신**: 이 문서는 그동안 실제 코드보다 뒤처져 있었다(예: `restaurants.restaurant_id`가
> 여전히 `BIGINT`로 적혀 있었지만 07의 카카오 전환 이후 실제로는 `VARCHAR(100)`). 이번에 운영 DB
> (`soldesk_project`, `information_schema`)를 직접 조회해서 **현재 실제로 존재하는 테이블/컬럼 그대로**
> 다시 정리했다 — 설계 의도가 아니라 지금 이 순간의 사실 기준.
>
> **(같은 날 후속 갱신)** 이 문서를 처음 정리한 직후, 같은 날 안에 (1) `restaurant_category_mappings`/
> `restaurant_nearby_places`/`recommendation_results` 3개 테이블의 `restaurant_id` 타입을 BIGINT →
> VARCHAR(100)로 수정하고 `restaurants`와의 FK를 복원했고(3-3/3-10/6-2장 갱신), (2) 리뷰 태그 저장용으로
> `review_keywords` 테이블을 처음 실사용하기 시작했다(5-5장 신규) — 최초 작성 시점엔 반영되지 못했던
> 변경이라 여기 후속으로 반영한다.

전체 32개 테이블 / 6개 도메인으로 구성 (5-5 `review_keywords` 2026-07-22 추가 반영)
ENGINE=InnoDB, CHARSET=utf8mb4 계열 공통 적용

------------------------------------------------------------------------
## 1. 회원 도메인
------------------------------------------------------------------------
### 1-1. members (회원)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| member_id | BIGINT UNSIGNED | PK, AI | 회원 고유번호 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 |
| nickname | VARCHAR(50) | UNIQUE, NOT NULL | 닉네임 |
| profile_image_url | VARCHAR(2000) | NULL | 프로필 이미지 경로 |
| phone | VARCHAR(255) | NULL | 전화번호(AES-256-GCM 암호화 저장) |
| phone_hash | VARCHAR(64) | UNIQUE, NULL | 전화번호 HMAC-SHA256 해시(중복 확인용) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE / SUSPENDED / WITHDRAWN |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'USER' | USER / BUSINESS / ADMIN |
| food_bti | VARCHAR(20) | NULL | 음식 취향 유형(2026-07-22 추가, 현재 값 채우는 기능 없음 — 항상 NULL) |
| last_login_at | DATETIME | NULL | 마지막 로그인 시각 |
| withdrawn_at | DATETIME | NULL | 탈퇴 처리 시각 |
| created_at / updated_at | DATETIME | NOT NULL | 생성/수정일시 |
| deleted_at | DATETIME | NULL | 논리 삭제 |

### 1-2. member_credentials (일반 로그인 인증정보, 회원 1:1)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| member_credential_id | BIGINT UNSIGNED | PK, AI | 고유번호 |
| member_id | BIGINT UNSIGNED | UNIQUE, FK→members | 회원 번호 |
| password_hash | VARCHAR(255) | NOT NULL | 해시(BCrypt) |
| password_updated_at | DATETIME | NULL | |
| login_fail_count | INT UNSIGNED | NOT NULL, DEFAULT 0 | (현재는 Redis `LoginAttemptService`가 실제 로직 담당, 이 컬럼은 갱신 안 됨) |
| locked_until | DATETIME | NULL | (위와 동일 이유로 갱신 안 됨) |
| created_at / updated_at | DATETIME | NOT NULL | |

### 1-3. social_accounts (소셜 로그인 계정)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| social_account_id | BIGINT UNSIGNED | PK, AI | 고유번호 |
| member_id | BIGINT UNSIGNED | FK→members | 회원 번호 |
| provider | VARCHAR(20) | NOT NULL | KAKAO / NAVER / GOOGLE |
| provider_user_id | VARCHAR(255) | NOT NULL | 소셜사 발급 고유 ID |
| access_token / refresh_token | VARCHAR(1000) | NULL | 플랫폼 토큰 |
| token_expired_at | DATETIME | NULL | |
| created_at / updated_at | DATETIME | NOT NULL | |
- UNIQUE(provider, provider_user_id)

### 1-4. email_verifications (이메일 인증)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| email_verification_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | FK→members | |
| email | VARCHAR(255) | NOT NULL | |
| verification_code | VARCHAR(20) | NOT NULL | |
| purpose | VARCHAR(20) | NOT NULL, DEFAULT 'SIGNUP' | SIGNUP / PROFILE_UPDATE 등 |
| is_verified | TINYINT(1) | NOT NULL, DEFAULT 0 | |
| expired_at | DATETIME | NOT NULL | |
| verified_at | DATETIME | NULL | |
| created_at | DATETIME | NOT NULL | |

### 1-5. phone_verifications (전화번호 인증)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| phone_verification_id | BIGINT | PK, AI | |
| member_id | BIGINT | NOT NULL | |
| phone | VARCHAR(20) | NOT NULL | |
| verification_code | VARCHAR(20) | NOT NULL | |
| purpose | VARCHAR(20) | NOT NULL | SIGNUP / PROFILE_UPDATE 등 |
| is_verified | BIT(1) | NOT NULL | |
| expired_at | DATETIME(6) | NOT NULL | |
| verified_at | DATETIME(6) | NULL | |
| created_at | DATETIME(6) | NOT NULL | |

### 1-6. password_reset_tokens (비밀번호 재설정 토큰)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| password_reset_token_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | FK→members | |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | 토큰 원문 대신 해시 저장 |
| is_used | TINYINT(1) | NOT NULL, DEFAULT 0 | |
| expired_at | DATETIME | NOT NULL | |
| used_at | DATETIME | NULL | |
| created_at | DATETIME | NOT NULL | |

### 1-7. refresh_tokens (JWT 리프레시 토큰)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| refresh_token_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | FK→members | |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL | |
| device_info | VARCHAR(255) | NULL | |
| is_revoked | TINYINT(1) | NOT NULL, DEFAULT 0 | |
| expired_at | DATETIME | NOT NULL | |
| created_at / revoked_at | DATETIME | | |

### 1-8. tags (태그, 공용)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| tag_id | BIGINT UNSIGNED | PK, AI | |
| tag_name | VARCHAR(50) | UNIQUE, NOT NULL | |
| tag_type | VARCHAR(20) | NOT NULL | GENERAL / MOOD / MENU_TYPE / PREFERENCE 등 |
| created_at | DATETIME | NOT NULL | |

### 1-9. member_preferences (회원 선호 조건, 회원 1:1)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| member_preference_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | UNIQUE, FK→members | |
| preferred_min_price / preferred_max_price | INT UNSIGNED | NULL | |
| preferred_distance_km | DECIMAL(4,1) | NULL | |
| notification_enabled | TINYINT(1) | NOT NULL, DEFAULT 1 | |
| created_at / updated_at | DATETIME | NOT NULL | |

### 1-10. member_preference_tags (회원 선호 태그 매핑)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| member_preference_tag_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | FK→members | |
| tag_id | BIGINT UNSIGNED | FK→tags | |
| created_at | DATETIME | NOT NULL | |
- UNIQUE(member_id, tag_id)

------------------------------------------------------------------------
## 2. 사업자 도메인
------------------------------------------------------------------------
### 2-1. business_profiles (사업자 프로필)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| business_profile_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | FK→members | |
| business_name | VARCHAR(200) | NOT NULL | |
| business_registration_number | VARCHAR(20) | UNIQUE, NOT NULL | 사업자등록번호 |
| representative_name | VARCHAR(50) | NOT NULL | |
| business_address | VARCHAR(300) | NULL | |
| verification_status | VARCHAR(20) | NOT NULL, DEFAULT 'UNVERIFIED' | UNVERIFIED / PENDING / VERIFIED / REJECTED |
| created_at / updated_at | DATETIME | NOT NULL | |

### 2-2. business_verifications (사업자 인증 심사 이력)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| business_verification_id | BIGINT UNSIGNED | PK, AI | |
| business_profile_id | BIGINT UNSIGNED | FK→business_profiles | |
| document_url | VARCHAR(500) | NOT NULL | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | |
| reviewed_by | BIGINT UNSIGNED | FK→members, NULL | 심사한 관리자 |
| reviewed_at | DATETIME | NULL | |
| reject_reason | VARCHAR(500) | NULL | |
| created_at / updated_at | DATETIME | NOT NULL | |

------------------------------------------------------------------------
## 3. 음식점 도메인
------------------------------------------------------------------------
### 3-1. restaurants (음식점 "부가정보" — 카카오 데이터 미포함)
> **2026-07-21 아키텍처 전환**: 카카오 로컬 API 운영정책상 검색 결과(상호명/주소/좌표)를 저장할 수 없어,
> 이 테이블은 더 이상 음식점 기본정보를 담지 않는다. PK가 **카카오 장소 id 문자열**로 바뀌었고, 우리
> 서비스가 직접 만든 부가정보만 저장한다. 상세 배경은 `docs/07.음식점-메뉴-검색/001-07` 참고.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| restaurant_id | VARCHAR(100) | PK | **카카오 로컬 API의 장소 id** (자동 증가 아님) |
| description | VARCHAR(500) | NULL | 사업자가 직접 입력한 소개글 |
| phone | VARCHAR(20) | NULL | 사업자가 직접 등록한 전화번호(카카오 제공 전화번호 아님) |
| image_url | VARCHAR(500) | NULL | 사업자가 등록한 사진 |
| management_status | VARCHAR(20) | NOT NULL | 사업자 소유권 상태(UNCLAIMED 등) |
| business_status | VARCHAR(20) | NOT NULL | OPEN / CLOSED 등 |
| avg_rating | DECIMAL(3,2) | NOT NULL | 리뷰 평점 캐시 |
| review_count | INT | NOT NULL | 리뷰 수 캐시 |
| created_at / updated_at | DATETIME(6) | NOT NULL | |
| deleted_at | DATETIME(6) | NULL | |

### 3-2. restaurant_categories (카테고리)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| category_id | BIGINT UNSIGNED | PK, AI | |
| category_name | VARCHAR(50) | UNIQUE, NOT NULL | |
| category_code | VARCHAR(30) | UNIQUE, NULL | |
| parent_category_id | BIGINT UNSIGNED | FK→restaurant_categories(자기참조), NULL | |
| display_order | INT | NOT NULL, DEFAULT 0 | |
| created_at / updated_at | DATETIME | NOT NULL | |

### 3-3. restaurant_category_mappings (음식점-카테고리 매핑)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| restaurant_category_mapping_id | BIGINT UNSIGNED | PK, AI | |
| restaurant_id | VARCHAR(100) | FK→restaurants | **(2026-07-22 수정)** 기존 BIGINT에서 변경, `restaurants`와 FK 복원 |
| category_id | BIGINT UNSIGNED | FK→restaurant_categories | |
| created_at | DATETIME | NOT NULL | |
- UNIQUE(restaurant_id, category_id)
- **(2026-07-22)** 카카오 전환 이후 `restaurant_id`가 여전히 옛 `BIGINT` 타입이라 `restaurants`(VARCHAR)와
  FK가 끊어져 있던 상태였음. 옛 BIGINT id로 남아있던 기존 146개 행을 삭제하고 `VARCHAR(100)`으로 타입을
  변경한 뒤 FK를 재연결함. 이 컬럼을 참조하던 사용되지 않는 `RestaurantCategoryMapping` 엔티티(JPA)도
  옛 `Long` 타입을 그대로 갖고 있어 재기동마다 스키마를 되돌리려다 실패하는 에러를 내고 있었음 — 아무
  코드도 참조하지 않는 죽은 엔티티임을 확인하고 엔티티+repository 자체를 삭제해 해결(10.리뷰 001-03 6-2장
  참고).

### 3-4. restaurant_business_hours (영업시간)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| restaurant_business_hour_id | BIGINT | PK, AI | |
| restaurant_id | VARCHAR(255) | NOT NULL | |
| day_of_week | INT | NOT NULL | |
| open_time / close_time | TIME | NULL | |
| is_closed | BIT(1) | NOT NULL | |
| created_at / updated_at | DATETIME(6) | NOT NULL | |

### 3-5. restaurant_managers (음식점 관리자 연결)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| restaurant_manager_id | BIGINT | PK, AI | |
| restaurant_id | VARCHAR(255) | NOT NULL | |
| member_id | BIGINT | NOT NULL | |
| business_profile_id | BIGINT | NOT NULL | |
| manager_role | VARCHAR(20) | NOT NULL | |
| manager_status | VARCHAR(20) | NOT NULL | ACTIVE 등 |
| created_at / updated_at | DATETIME(6) | NOT NULL | |
- UNIQUE(restaurant_id, member_id)

### 3-6. menus (메뉴)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| menu_id | BIGINT | PK, AI | |
| restaurant_id | VARCHAR(255) | NOT NULL | |
| menu_name | VARCHAR(200) | NOT NULL | |
| price | INT | NOT NULL | |
| description | VARCHAR(500) | NULL | |
| image_url | VARCHAR(500) | NULL | |
| is_signature | BIT(1) | NOT NULL | 대표메뉴 여부 |
| is_available | BIT(1) | NOT NULL | 판매중 여부 |
| is_owner_verified | BIT(1) | NOT NULL | |
| created_at / updated_at | DATETIME(6) | NOT NULL | |
| deleted_at | DATETIME(6) | NULL | |

### 3-7. menu_keywords (메뉴/카테고리 분류 키워드 마스터 — 2026-07-22 문서 최초 반영)
음식점 카테고리 자동 분류(07)에 쓰이는 키워드 사전. 팀이 전달한 `web_menu_keyword_db.xlsx`로 시딩됨.
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| keyword_id | BIGINT | PK, AI | |
| keyword_ko | VARCHAR(100) | NOT NULL | |
| normalized_keyword_ko | VARCHAR(100) | NOT NULL | |
| keyword_type | VARCHAR(30) | NOT NULL | |
| keyword_group_code | VARCHAR(50) | NOT NULL | |
| keyword_group_name_ko | VARCHAR(50) | NOT NULL | |
| category_code | VARCHAR(30) | NULL | |
| match_scope | VARCHAR(40) | NOT NULL | |
| search_weight | INT | NOT NULL | |
| is_active | BIT(1) | NOT NULL | |

### 3-8. restaurant_tags (음식점-태그 매핑)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| restaurant_tag_id | BIGINT UNSIGNED | PK, AI | |
| restaurant_id | VARCHAR(255) | NOT NULL | |
| tag_id | BIGINT UNSIGNED | FK→tags | |
| created_at | DATETIME | NOT NULL | |
- UNIQUE(restaurant_id, tag_id)

### 3-9. nearby_places (주변 장소, 외부 API 원본)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| nearby_place_id | BIGINT UNSIGNED | PK, AI | |
| source_provider | VARCHAR(30) | NOT NULL | |
| external_place_id | VARCHAR(100) | NOT NULL | |
| place_name | VARCHAR(200) | NOT NULL | |
| place_type | VARCHAR(50) | NULL | |
| address | VARCHAR(300) | NULL | |
| latitude / longitude | DECIMAL(10,7) | NOT NULL | |
| place_url | VARCHAR(500) | NULL | |
| created_at / updated_at | DATETIME | NOT NULL | |
- UNIQUE(source_provider, external_place_id)

### 3-10. restaurant_nearby_places (음식점-주변장소 연결)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| restaurant_id | VARCHAR(100) | PK(복합), FK→restaurants | **(2026-07-22 수정)** 기존 BIGINT에서 변경, FK 복원 |
| nearby_place_id | BIGINT UNSIGNED | PK(복합), FK→nearby_places | |
| distance_m | INT UNSIGNED | NULL | |
| walking_time_minutes | INT UNSIGNED | NULL | |
| created_at / updated_at | DATETIME | NOT NULL | |
- 3-3장과 같은 이유/같은 작업으로 타입 수정 + FK 복원(2026-07-22). 이 테이블 자체는 여전히 엔티티/코드가
  없어 미사용 상태 — 스키마만 카카오 전환 이후 상태와 다시 호환되도록 정리했을 뿐, 실사용을 시작한 것은
  아님.

------------------------------------------------------------------------
## 4. 영수증 / OCR 도메인
------------------------------------------------------------------------
### 4-1. receipts (영수증)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| receipt_id | BIGINT | PK, AI | |
| member_id | BIGINT | NOT NULL | |
| restaurant_id | VARCHAR(255) | NULL | 방문 인증 성공 시에만 채워짐 |
| image_path | VARCHAR(500) | NOT NULL | |
| ocr_status | VARCHAR(20) | NOT NULL | PENDING / SUCCESS / FAILED |
| parsed_store_name | VARCHAR(200) | NULL | |
| parsed_payment_date | DATETIME(6) | NULL | |
| parsed_total_amount | INT | NULL | |
| transaction_id | VARCHAR(50) | UNIQUE, NULL | 승인번호(중복 방지 핵심 키) |
| ocr_raw_text | TEXT | NULL | |
| retry_count | INT | NOT NULL | |
| created_at / updated_at | DATETIME(6) | NOT NULL | |
| deleted_at | DATETIME(6) | NULL | |

### 4-2. receipt_items (영수증 메뉴 항목)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| receipt_item_id | BIGINT | PK, AI | |
| receipt_id | BIGINT | NOT NULL | |
| item_name | VARCHAR(200) | NOT NULL | |
| quantity | INT | NOT NULL | |
| unit_price / total_price | INT | NULL | |
| created_at / updated_at | DATETIME(6) | NOT NULL | |

### 4-3. ocr_processing_logs (OCR 처리 기록)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| ocr_processing_log_id | BIGINT | PK, AI | |
| receipt_id | BIGINT | NOT NULL | |
| provider | VARCHAR(30) | NOT NULL | |
| status | VARCHAR(20) | NOT NULL | |
| attempt_no | INT | NOT NULL | |
| processing_time_ms | INT | NULL | |
| error_message | VARCHAR(500) | NULL | |
| created_at | DATETIME(6) | NOT NULL | |

------------------------------------------------------------------------
## 5. 리뷰 / 즐겨찾기 / 기록 도메인
------------------------------------------------------------------------
### 5-1. reviews (리뷰)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| review_id | BIGINT | PK, AI | |
| member_id | BIGINT | NOT NULL | |
| restaurant_id | VARCHAR(255) | NOT NULL | |
| receipt_id | BIGINT | NULL | 영수증 인증 리뷰 연결 |
| rating | INT | NOT NULL | 1~5 |
| content | VARCHAR(1000) | NULL | 순수 자유 텍스트 — **(2026-07-22 변경)** 예전엔 `#키워드` 칩이 합성되어 들어갔으나, 태그가 5-5장 `review_keywords`로 분리되면서 폐지됨 |
| visit_date | DATE | NULL | |
| receipt_verified | BIT(1) | NOT NULL | |
| status | VARCHAR(20) | NOT NULL | NORMAL / DELETED |
| restaurant_name_snapshot | VARCHAR(200) | NULL | 마이페이지 목록 표시용(2026-07-22 추가) |
| address_snapshot / road_address_snapshot | VARCHAR(255) | NULL | 〃 |
| latitude_snapshot / longitude_snapshot | DECIMAL(10,7) | NULL | 〃 |
| created_at / updated_at | DATETIME(6) | NOT NULL | |
| deleted_at | DATETIME(6) | NULL | 소프트 삭제(2026-07-22 리뷰 삭제 기능 추가) |

### 5-2. favorites (즐겨찾기)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| favorite_id | BIGINT | PK, AI | |
| member_id | BIGINT | NOT NULL | |
| restaurant_id | VARCHAR(255) | NOT NULL | |
| restaurant_name_snapshot | VARCHAR(200) | NULL | 마이페이지 목록 표시용(2026-07-22 추가) |
| address_snapshot / road_address_snapshot | VARCHAR(255) | NULL | 〃 |
| latitude_snapshot / longitude_snapshot | DECIMAL(10,7) | NULL | 〃 |
| created_at / updated_at | DATETIME(6) | NOT NULL | |
- (member_id, restaurant_id) UNIQUE 제약이 현재 DB에는 없음 — 애플리케이션 레벨(`existsBy` 확인 후 저장)로만 중복 방지

### 5-3. search_histories (검색 기록, 2026-07-22 최초 실사용)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| search_history_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | FK→members | |
| keyword | VARCHAR(200) | NULL | 실제로 채워지는 값 |
| category_id | BIGINT UNSIGNED | FK→restaurant_categories, NULL | 설계는 있으나 현재 코드가 채우지 않음 |
| min_price / max_price | INT UNSIGNED | NULL | 〃 |
| search_latitude / search_longitude | DECIMAL(10,7) | NULL | 〃 |
| result_count | INT UNSIGNED | NOT NULL, DEFAULT 0 | 〃 |
| created_at / updated_at | DATETIME | NOT NULL | |

### 5-4. navigation_histories (길찾기 이용 기록)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| navigation_history_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | FK→members, NULL | 비회원이면 NULL |
| restaurant_id | BIGINT UNSIGNED | NOT NULL | 구버전 타입(BIGINT) |
| navigation_provider | VARCHAR(30) | NOT NULL | KAKAO_NAVI / NAVER_MAP / TMAP 등 |
| start_latitude / start_longitude | DECIMAL(10,7) | NULL | |
| clicked_at | DATETIME | NOT NULL | |
| created_at / updated_at | DATETIME | NOT NULL | |

### 5-5. review_keywords (리뷰 태그, 2026-07-22 최초 실사용)
다른 팀원이 AI 추천 기능용으로 미리 만들어둔 테이블. 10.리뷰의 태그 전면 개편 작업 때 스키마가 정확히
필요한 형태와 일치해서 새 테이블을 만들지 않고 그대로 재사용했다(`docs/10.리뷰/001-02` 2-4장).
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| review_keyword_id | BIGINT UNSIGNED | PK, AI | |
| review_id | BIGINT UNSIGNED | FK→reviews | |
| keyword | VARCHAR(50) | NOT NULL | 긍정/부정 고정 20개 목록 중 하나(`ReviewKeywordCatalog`가 허용 목록의 유일한 출처) |
| sentiment | ENUM('POSITIVE','NEGATIVE') | NOT NULL | |
| score | DECIMAL | NULL | AI 추천 기능(팀원 소유)이 쓰는 값으로 추정 — 리뷰 태그 저장 기능은 이 컬럼을 채우지 않음 |
| created_at | DATETIME | NOT NULL | |
- **JPA 엔티티로 매핑하지 않음**: `sentiment`가 실제 MySQL ENUM이라 `@Entity`로 매핑하면 `ddl-auto=update`가
  재기동마다 스키마를 임의로 바꾸려 들 위험이 있고, 다른 팀원이 이 테이블을 계속 발전시키고 있어 그 위험을
  감수할 수 없었다 — `ReviewKeywordDao`(`JdbcTemplate` 직접 사용)로만 접근한다. 이 프로젝트에서 JPA를 쓰지
  않는 유일한 테이블.
- 같은 팀원이 만든 `place_keyword_scores`/`user_food_actions` 테이블도 존재하지만(AI 추천 기능용으로
  추정), 이 프로젝트(우리 기능)에서는 아직 사용하지 않음 — 표에서 생략.

------------------------------------------------------------------------
## 6. 추천 도메인
------------------------------------------------------------------------
### 6-1. recommendation_histories (추천 요청 기록)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| recommendation_history_id | BIGINT UNSIGNED | PK, AI | |
| member_id | BIGINT UNSIGNED | FK→members | |
| recommendation_type | VARCHAR(30) | NOT NULL, DEFAULT 'KEYWORD' | |
| query_text | VARCHAR(500) | NULL | |
| extracted_keywords | VARCHAR(500) | NULL | |
| current_latitude / current_longitude | DECIMAL(10,7) | NULL | |
| max_budget | INT UNSIGNED | NULL | |
| created_at / updated_at | DATETIME | NOT NULL | |

### 6-2. recommendation_results (추천 결과)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|---|---|---|---|
| recommendation_result_id | BIGINT UNSIGNED | PK, AI | |
| recommendation_history_id | BIGINT UNSIGNED | FK→recommendation_histories | |
| restaurant_id | VARCHAR(100) | FK→restaurants, NOT NULL | **(2026-07-22 수정)** 기존 BIGINT에서 변경, FK 복원(3-3장과 같은 작업) |
| rank_no | INT UNSIGNED | NOT NULL | |
| similarity_score | DECIMAL(6,4) | NULL | |
| final_score | DECIMAL(6,4) | NOT NULL | |
| recommendation_reason | VARCHAR(500) | NULL | |
| created_at / updated_at | DATETIME | NOT NULL | |

------------------------------------------------------------------------
## 7. 참고
------------------------------------------------------------------------
- 이 문서는 2026-07-22 시점 운영 DB(`soldesk_project`)를 `information_schema`로 직접 조회해서 작성한
  스냅샷이며, 같은 날 안에 있었던 후속 변경(`restaurant_id` 타입 수정 3건, `review_keywords` 실사용 시작)도
  함께 반영해뒀습니다. 이후 스키마가 바뀌면(주로 `ddl-auto=update`가 컬럼을 자동 추가하는 방식, 또는 이런
  raw SQL 수정) 이 문서도 다시 갱신이 필요합니다.
- 각 기능별 상세 설계/구현 배경은 `docs/` 아래 해당 기능 폴더(01~11) 문서를 참고하세요 — 이 문서는 "지금
  테이블이 어떻게 생겼는지"만 다루고, "왜 이렇게 됐는지"는 다루지 않습니다.
