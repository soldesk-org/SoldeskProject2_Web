const { test, expect } = require('@playwright/test');
const {
  insertRestaurant,
  insertCategory,
  mapCategory,
  insertMenu,
  insertBusinessHour,
  insertFavorite,
  deleteRestaurant,
  deleteCategoryByName,
} = require('../restaurantDbHelper');
const { insertPendingMember, deleteMemberByEmail } = require('../dbHelper');
const { mintAccessToken } = require('../jwtHelper');
const { activateAccessToken, cleanupAccessKey, closeRedis } = require('../redisHelper');

test.afterAll(async () => {
  await closeRedis();
});

function uniqueName(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

async function loginMember(email) {
  const memberId = await insertPendingMember(email, uniqueName('rt').slice(0, 10));
  const { token, jti } = mintAccessToken(memberId, email);
  await activateAccessToken(jti, memberId);
  return { memberId, accessToken: token, jti };
}

test.describe('001-03 음식점 목록/검색/주변조회 (GET /api/restaurants)', () => {
  test('목록 조회는 평점 높은 순으로 정렬되어 반환된다', async ({ request }) => {
    const nameA = uniqueName('목록낮음');
    const nameB = uniqueName('목록높음');
    let idA, idB;
    try {
      idA = await insertRestaurant({ name: nameA, latitude: 37.1, longitude: 127.1, avgRating: 3.0, reviewCount: 5 });
      idB = await insertRestaurant({ name: nameB, latitude: 37.1, longitude: 127.1, avgRating: 4.8, reviewCount: 5 });

      const res = await request.get('/api/restaurants?page=0&size=100');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const indexA = body.restaurants.findIndex(r => r.restaurantId === idA);
      const indexB = body.restaurants.findIndex(r => r.restaurantId === idB);
      expect(indexA).toBeGreaterThanOrEqual(0);
      expect(indexB).toBeGreaterThanOrEqual(0);
      expect(indexB).toBeLessThan(indexA);
      expect(body.restaurants[indexA]).not.toHaveProperty('distanceKm');
    } finally {
      if (idA) await deleteRestaurant(idA);
      if (idB) await deleteRestaurant(idB);
    }
  });

  test('검색: 음식점명 키워드로 조회된다', async ({ request }) => {
    const name = uniqueName('한식맛집');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      const res = await request.get(`/api/restaurants/search?keyword=${encodeURIComponent(name)}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.restaurants.some(r => r.restaurantId === id)).toBe(true);
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });

  test('검색: 메뉴명 키워드로도 그 음식점이 조회된다', async ({ request }) => {
    const name = uniqueName('메뉴검색음식점');
    const menuName = uniqueName('짜장면');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      await insertMenu(id, { menuName, price: 8000 });

      const res = await request.get(`/api/restaurants/search?keyword=${encodeURIComponent(menuName)}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.restaurants.some(r => r.restaurantId === id)).toBe(true);
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });

  test('검색: keyword만 받고 categoryId/minPrice/maxPrice는 무시한다(검색과 필터는 별개 API, 1-1장)', async ({ request }) => {
    const name = uniqueName('검색필터분리');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.25, longitude: 127.25 });
      // /search는 keyword 전용이라 categoryId를 같이 보내도 그냥 무시되고 keyword로만 걸러짐
      const res = await request.get(`/api/restaurants/search?keyword=${encodeURIComponent(name)}&categoryId=999999999`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.restaurants.some(r => r.restaurantId === id)).toBe(true);
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });
});

test.describe('001-03 음식점 필터 (GET /api/restaurants/filter, 2026-07-20 검색과 분리)', () => {
  test('카테고리 필터가 적용된다', async ({ request }) => {
    const nameMatch = uniqueName('카테고리매치');
    const nameOther = uniqueName('카테고리다름');
    const categoryName = uniqueName('테스트카테고리');
    let idMatch, idOther, categoryId;
    try {
      idMatch = await insertRestaurant({ name: nameMatch, latitude: 37.3, longitude: 127.3 });
      idOther = await insertRestaurant({ name: nameOther, latitude: 37.3, longitude: 127.3 });
      categoryId = await insertCategory(categoryName);
      await mapCategory(idMatch, categoryId);

      const res = await request.get(`/api/restaurants/filter?categoryId=${categoryId}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.restaurants.some(r => r.restaurantId === idMatch)).toBe(true);
      expect(body.restaurants.some(r => r.restaurantId === idOther)).toBe(false);
    } finally {
      if (idMatch) await deleteRestaurant(idMatch);
      if (idOther) await deleteRestaurant(idOther);
      if (categoryName) await deleteCategoryByName(categoryName);
    }
  });

  test('가격대 필터(minPrice~maxPrice)는 음식점의 메뉴 평균가 기준으로 적용된다(2-4장 확정)', async ({ request }) => {
    const nameMatch = uniqueName('평균가매치');
    const nameOther = uniqueName('평균가다름');
    let idMatch, idOther;
    try {
      idMatch = await insertRestaurant({ name: nameMatch, latitude: 37.4, longitude: 127.4 });
      idOther = await insertRestaurant({ name: nameOther, latitude: 37.4, longitude: 127.4 });
      // idMatch: 평균 10000원(5000+15000)/2 — 개별 메뉴 중 어느 것도 8000~12000 범위에 없지만 평균은 범위 안
      await insertMenu(idMatch, { menuName: '저가메뉴', price: 5000 });
      await insertMenu(idMatch, { menuName: '고가메뉴', price: 15000 });
      // idOther: 평균 30000원 — 범위 밖
      await insertMenu(idOther, { menuName: '메뉴B', price: 30000 });

      const res = await request.get('/api/restaurants/filter?minPrice=8000&maxPrice=12000');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.restaurants.some(r => r.restaurantId === idMatch)).toBe(true);
      expect(body.restaurants.some(r => r.restaurantId === idOther)).toBe(false);
    } finally {
      if (idMatch) await deleteRestaurant(idMatch);
      if (idOther) await deleteRestaurant(idOther);
    }
  });

  test('메뉴가 하나도 없는 음식점은 가격대 필터 결과에서 제외된다(평균을 계산할 근거가 없음)', async ({ request }) => {
    const name = uniqueName('메뉴없음가격필터');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.45, longitude: 127.45 });
      const res = await request.get('/api/restaurants/filter?minPrice=0&maxPrice=999999');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.restaurants.some(r => r.restaurantId === id)).toBe(false);
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });

  test('minPrice가 maxPrice보다 크면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.get('/api/restaurants/filter?minPrice=20000&maxPrice=5000');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });
});

test.describe('001-03 음식점 주변조회 (GET /api/restaurants/nearby)', () => {
  test('반경 안/밖 음식점이 올바르게 걸러지고 가까운 순으로 정렬된다', async ({ request }) => {
    const nameCenter = uniqueName('주변중심');
    const nameNear = uniqueName('주변근처');
    const nameFar = uniqueName('주변멀리');
    let idCenter, idNear, idFar;
    try {
      // 중심(0km), 근처(약 0.5km), 멀리(약 5.5km) — 위도 1도 ≈ 111km 근사치로 오프셋 계산.
      idCenter = await insertRestaurant({ name: nameCenter, latitude: 37.5000000, longitude: 127.0000000 });
      idNear = await insertRestaurant({ name: nameNear, latitude: 37.5045000, longitude: 127.0000000 });
      idFar = await insertRestaurant({ name: nameFar, latitude: 37.5500000, longitude: 127.0000000 });

      const res = await request.get('/api/restaurants/nearby?latitude=37.5000000&longitude=127.0000000&radiusKm=1');
      expect(res.status()).toBe(200);
      const body = await res.json();
      const ids = body.restaurants.map(r => r.restaurantId);
      expect(ids).toContain(idCenter);
      expect(ids).toContain(idNear);
      expect(ids).not.toContain(idFar);

      const indexCenter = ids.indexOf(idCenter);
      const indexNear = ids.indexOf(idNear);
      expect(indexCenter).toBeLessThan(indexNear);
      expect(body.restaurants[indexCenter].distanceKm).not.toBeUndefined();

      const wideRes = await request.get('/api/restaurants/nearby?latitude=37.5000000&longitude=127.0000000&radiusKm=10');
      const wideBody = await wideRes.json();
      expect(wideBody.restaurants.map(r => r.restaurantId)).toContain(idFar);
    } finally {
      if (idCenter) await deleteRestaurant(idCenter);
      if (idNear) await deleteRestaurant(idNear);
      if (idFar) await deleteRestaurant(idFar);
    }
  });

  test('latitude/longitude 누락 시 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.get('/api/restaurants/nearby?latitude=37.5');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('radiusKm이 최대치(20km)를 넘으면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.get('/api/restaurants/nearby?latitude=37.5&longitude=127.0&radiusKm=21');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });
});

test.describe('001-03 음식점 상세 조회 (GET /api/restaurants/{id})', () => {
  test('존재하지 않는 restaurantId면 404 RESTAURANT_NOT_FOUND', async ({ request }) => {
    const res = await request.get('/api/restaurants/999999999');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('RESTAURANT_NOT_FOUND');
  });

  test('메뉴/영업시간을 등록하지 않은 음식점은 빈 배열로 정상(200) 응답한다', async ({ request }) => {
    const name = uniqueName('빈정보음식점');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.6, longitude: 127.6 });
      const res = await request.get(`/api/restaurants/${id}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.menus).toEqual([]);
      expect(body.businessHours).toEqual([]);
      expect(body.description).toBeNull();
      // 사업자 등록 기능이 없어 image_url이 항상 null이라, restaurant.default-image-url 설정값으로
      // 대체된다(2026-07-20 추가) — 실제 자산 미정이라 현재 기본값도 비어있어 null로 내려오는 게 맞음.
      expect(body).toHaveProperty('imageUrl');
      expect(body.imageUrl).toBeNull();
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });

  test('메뉴/영업시간이 등록된 음식점은 상세에 함께 내려온다(대표메뉴 우선 정렬)', async ({ request }) => {
    const name = uniqueName('풀정보음식점');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.7, longitude: 127.7, phone: '02-1234-5678' });
      await insertMenu(id, { menuName: '일반메뉴', price: 12000, isSignature: false });
      await insertMenu(id, { menuName: '대표메뉴', price: 15000, isSignature: true });
      await insertBusinessHour(id, 1, '10:00:00', '21:00:00', false);

      const res = await request.get(`/api/restaurants/${id}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.menus.length).toBe(2);
      expect(body.menus[0].menuName).toBe('대표메뉴');
      expect(body.businessHours.length).toBe(1);
      expect(body.businessHours[0].dayOfWeek).toBe(1);
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });

  test('판매 중지(is_available=0)된 메뉴는 상세/메뉴 조회 모두에서 제외된다', async ({ request }) => {
    const name = uniqueName('판매중지테스트');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.8, longitude: 127.8 });
      await insertMenu(id, { menuName: '판매중', price: 9000, isAvailable: true });
      await insertMenu(id, { menuName: '판매중지', price: 9000, isAvailable: false });

      const res = await request.get(`/api/restaurants/${id}`);
      const body = await res.json();
      expect(body.menus.length).toBe(1);
      expect(body.menus[0].menuName).toBe('판매중');
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });
});

test.describe('001-03 메뉴 조회 (GET /api/restaurants/{id}/menus)', () => {
  test('음식점이 없으면 404 RESTAURANT_NOT_FOUND', async ({ request }) => {
    const res = await request.get('/api/restaurants/999999999/menus');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('RESTAURANT_NOT_FOUND');
  });

  test('메뉴가 없으면 200과 함께 빈 배열이 내려온다', async ({ request }) => {
    const name = uniqueName('메뉴없음');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.9, longitude: 127.9 });
      const res = await request.get(`/api/restaurants/${id}/menus`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.menus).toEqual([]);
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });
});

test.describe('001-03 favorite 필드 선택적 인증 (001-02 5-0장)', () => {
  test('비로그인(Authorization 헤더 없음)이면 favorite은 항상 false', async ({ request }) => {
    const name = uniqueName('즐겨찾기비로그인');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.11, longitude: 127.11 });
      const listRes = await request.get('/api/restaurants/search?keyword=' + encodeURIComponent(name));
      const listBody = await listRes.json();
      expect(listBody.restaurants[0].favorite).toBe(false);

      const detailRes = await request.get(`/api/restaurants/${id}`);
      const detailBody = await detailRes.json();
      expect(detailBody.favorite).toBe(false);
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });

  test('로그인했지만 즐겨찾기하지 않았으면 favorite은 false', async ({ request }) => {
    const email = `${uniqueName('rtfav')}@example.com`;
    const name = uniqueName('즐겨찾기안함');
    let id, session;
    try {
      id = await insertRestaurant({ name, latitude: 37.12, longitude: 127.12 });
      session = await loginMember(email);

      const res = await request.get(`/api/restaurants/${id}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const body = await res.json();
      expect(body.favorite).toBe(false);
    } finally {
      if (id) await deleteRestaurant(id);
      if (session) {
        await deleteMemberByEmail(email);
        await cleanupAccessKey(session.jti);
      }
    }
  });

  test('로그인 + 즐겨찾기한 음식점이면 favorite은 true (목록/상세 모두)', async ({ request }) => {
    const email = `${uniqueName('rtfav2')}@example.com`;
    const name = uniqueName('즐겨찾기함');
    let id, session;
    try {
      id = await insertRestaurant({ name, latitude: 37.13, longitude: 127.13 });
      session = await loginMember(email);
      await insertFavorite(session.memberId, id);

      const detailRes = await request.get(`/api/restaurants/${id}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const detailBody = await detailRes.json();
      expect(detailBody.favorite).toBe(true);

      const listRes = await request.get('/api/restaurants/search?keyword=' + encodeURIComponent(name), {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const listBody = await listRes.json();
      expect(listBody.restaurants[0].favorite).toBe(true);
    } finally {
      if (id) await deleteRestaurant(id);
      if (session) {
        await deleteMemberByEmail(email);
        await cleanupAccessKey(session.jti);
      }
    }
  });

  test('형식이 이상한 accessToken이어도 에러 없이 비로그인(favorite=false)으로 취급된다', async ({ request }) => {
    const name = uniqueName('토큰깨짐');
    let id;
    try {
      id = await insertRestaurant({ name, latitude: 37.14, longitude: 127.14 });
      const res = await request.get(`/api/restaurants/${id}`, {
        headers: { Authorization: 'Bearer this-is-not-a-valid-jwt' },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.favorite).toBe(false);
    } finally {
      if (id) await deleteRestaurant(id);
    }
  });
});
