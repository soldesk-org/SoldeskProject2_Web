const { getConnection } = require('./dbHelper');

// 음식점(07) 기능 테스트용 시딩 헬퍼. 네이버 지역 검색 API 실 연동을 자동화 테스트에서 검증할 수 없어
// (001-03 구현-테스트 문서 참고 — 팀 계정에 검색 API 스코프가 아직 안 열려 있음), dbHelper.js와 같은
// 패턴으로 restaurants/menus 등을 DB에 직접 시딩해서 조회 로직만 검증한다.

async function insertRestaurant({
  name,
  address = '서울시 강남구 테스트로 1',
  roadAddress = '서울시 강남구 테스트로1길 1',
  latitude,
  longitude,
  phone = null,
  externalPlaceId = null,
  naverPlaceUrl = null,
  avgRating = 0,
  reviewCount = 0,
  businessStatus = 'OPEN',
  deletedAt = null,
}) {
  const conn = await getConnection();
  try {
    const [result] = await conn.execute(
      `INSERT INTO restaurants
        (name, address, road_address, latitude, longitude, phone, external_place_id, naver_place_url,
         management_status, business_status, avg_rating, review_count, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNCLAIMED', ?, ?, ?, NOW(), NOW(), ?)`,
      [name, address, roadAddress, latitude, longitude, phone, externalPlaceId, naverPlaceUrl,
        businessStatus, avgRating, reviewCount, deletedAt]
    );
    return result.insertId;
  } finally {
    await conn.end();
  }
}

async function insertCategory(categoryName) {
  const conn = await getConnection();
  try {
    const [existing] = await conn.execute('SELECT category_id FROM restaurant_categories WHERE category_name = ?', [categoryName]);
    if (existing.length > 0) return existing[0].category_id;
    const [result] = await conn.execute(
      `INSERT INTO restaurant_categories (category_name, display_order, created_at, updated_at) VALUES (?, 0, NOW(), NOW())`,
      [categoryName]
    );
    return result.insertId;
  } finally {
    await conn.end();
  }
}

async function mapCategory(restaurantId, categoryId) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO restaurant_category_mappings (restaurant_id, category_id, created_at) VALUES (?, ?, NOW())`,
      [restaurantId, categoryId]
    );
  } finally {
    await conn.end();
  }
}

async function insertMenu(restaurantId, { menuName, price, isSignature = false, isAvailable = true }) {
  const conn = await getConnection();
  try {
    const [result] = await conn.execute(
      `INSERT INTO menus (restaurant_id, menu_name, price, is_signature, is_available, is_owner_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [restaurantId, menuName, price, isSignature ? 1 : 0, isAvailable ? 1 : 0]
    );
    return result.insertId;
  } finally {
    await conn.end();
  }
}

async function insertBusinessHour(restaurantId, dayOfWeek, openTime, closeTime, isClosed = false) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO restaurant_business_hours (restaurant_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [restaurantId, dayOfWeek, openTime, closeTime, isClosed ? 1 : 0]
    );
  } finally {
    await conn.end();
  }
}

async function insertFavorite(memberId, restaurantId) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO favorites (member_id, restaurant_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`,
      [memberId, restaurantId]
    );
  } finally {
    await conn.end();
  }
}

// 사업자 등록(2026-07-20 추가) 쓰기 API 테스트용: 실제 사업자등록증명원 OCR(Gemini/Hometax/국세청)을
// 거치지 않고, "이미 귀속된 상태"를 DB에 직접 만들어서 쓰기 API 권한 로직만 검증한다
// (business-signup.spec.js가 실제 OCR 서버 없이 진행하는 것과 같은 이유·같은 패턴).
async function insertBusinessProfile(memberId, { businessName = '테스트상호', businessAddress = null } = {}) {
  const conn = await getConnection();
  try {
    const regNo = String(Date.now()).slice(-10);
    const [result] = await conn.execute(
      `INSERT INTO business_profiles
        (member_id, business_name, business_registration_number, representative_name, business_address,
         verification_status, created_at, updated_at)
       VALUES (?, ?, ?, '테스트대표', ?, 'VERIFIED', NOW(), NOW())`,
      [memberId, businessName, regNo, businessAddress]
    );
    return result.insertId;
  } finally {
    await conn.end();
  }
}

async function insertRestaurantManager(restaurantId, businessProfileId, memberId, managerStatus = 'ACTIVE') {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO restaurant_managers
        (restaurant_id, business_profile_id, member_id, manager_role, manager_status, created_at, updated_at)
       VALUES (?, ?, ?, 'OWNER', ?, NOW(), NOW())`,
      [restaurantId, businessProfileId, memberId, managerStatus]
    );
    await conn.execute(`UPDATE restaurants SET management_status = 'CLAIMED' WHERE restaurant_id = ?`, [restaurantId]);
  } finally {
    await conn.end();
  }
}

async function deleteRestaurant(restaurantId) {
  const conn = await getConnection();
  try {
    await conn.execute('DELETE FROM restaurant_managers WHERE restaurant_id = ?', [restaurantId]);
    await conn.execute('DELETE FROM favorites WHERE restaurant_id = ?', [restaurantId]);
    await conn.execute('DELETE FROM restaurant_tags WHERE restaurant_id = ?', [restaurantId]);
    await conn.execute('DELETE FROM restaurant_category_mappings WHERE restaurant_id = ?', [restaurantId]);
    await conn.execute('DELETE FROM restaurant_business_hours WHERE restaurant_id = ?', [restaurantId]);
    await conn.execute('DELETE FROM menus WHERE restaurant_id = ?', [restaurantId]);
    await conn.execute('DELETE FROM restaurants WHERE restaurant_id = ?', [restaurantId]);
  } finally {
    await conn.end();
  }
}

async function deleteBusinessProfile(businessProfileId) {
  const conn = await getConnection();
  try {
    await conn.execute('DELETE FROM business_profiles WHERE business_profile_id = ?', [businessProfileId]);
  } finally {
    await conn.end();
  }
}

async function deleteCategoryByName(categoryName) {
  const conn = await getConnection();
  try {
    await conn.execute('DELETE FROM restaurant_categories WHERE category_name = ?', [categoryName]);
  } finally {
    await conn.end();
  }
}

module.exports = {
  insertRestaurant,
  insertCategory,
  mapCategory,
  insertMenu,
  insertBusinessHour,
  insertFavorite,
  insertBusinessProfile,
  insertRestaurantManager,
  deleteRestaurant,
  deleteCategoryByName,
  deleteBusinessProfile,
};
