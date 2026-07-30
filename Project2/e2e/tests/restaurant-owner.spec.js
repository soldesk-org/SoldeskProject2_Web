const path = require('path');
const { test, expect, request: pwRequest } = require('@playwright/test');
const {
  insertRestaurant,
  insertBusinessProfile,
  insertRestaurantManager,
  deleteRestaurant,
  deleteBusinessProfile,
} = require('../restaurantDbHelper');
const { insertPendingMember, deleteMemberByEmail } = require('../dbHelper');
const { mintAccessToken } = require('../jwtHelper');
const { activateAccessToken, cleanupAccessKey, closeRedis } = require('../redisHelper');

// 이미지 업로드는 multipart라 playwright.config.ts의 전역 Content-Type: application/json 헤더가
// boundary 자동 설정을 막는다 — profile-image.spec.js와 동일하게 별도 컨텍스트를 쓴다.
let api;

test.beforeAll(async () => {
  api = await pwRequest.newContext({
    baseURL: process.env.API_BASE_URL || 'http://localhost:8081',
    extraHTTPHeaders: {},
  });
});

test.afterAll(async () => {
  await api.dispose();
  await closeRedis();
});

function uniqueName(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

const IMAGE_PATH = path.resolve(__dirname, '..', 'fixtures', 'test-profile.png');

// 실제 사업자등록증명원 OCR(Gemini/Hometax/국세청 진위확인)을 거치지 않고, "이미 그 음식점에 귀속된
// 사업자 회원"을 DB에 직접 만들어서 쓰기 API 권한 로직만 검증한다(001-03 참고 — business-signup처럼
// 외부 서비스 의존적인 부분은 자동화 테스트 범위 밖).
function randomNickname() {
  return 'ro' + Math.random().toString(36).slice(2, 10);
}

async function createOwnerSession(restaurantId) {
  const email = `${uniqueName('rowner')}@example.com`;
  const memberId = await insertPendingMember(email, randomNickname());
  const businessProfileId = await insertBusinessProfile(memberId, {});
  await insertRestaurantManager(restaurantId, businessProfileId, memberId);
  const { token, jti } = mintAccessToken(memberId, email);
  await activateAccessToken(jti, memberId);
  return { email, memberId, businessProfileId, accessToken: token, jti };
}

async function cleanupOwnerSession(session) {
  await deleteMemberByEmail(session.email);
  await deleteBusinessProfile(session.businessProfileId);
  await cleanupAccessKey(session.jti);
}

test.describe('001-03 사업자 등록 - 전화번호 (PATCH /api/restaurants/{id}/phone)', () => {
  test('귀속된 사업자 회원은 전화번호를 수정할 수 있다', async ({ request }) => {
    const name = uniqueName('전화수정테스트');
    let restaurantId, session;
    try {
      restaurantId = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      session = await createOwnerSession(restaurantId);

      const res = await request.patch(`/api/restaurants/${restaurantId}/phone`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { phone: '02-1234-5678' },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.phone).toBe('02-1234-5678');
    } finally {
      if (session) await cleanupOwnerSession(session);
      if (restaurantId) await deleteRestaurant(restaurantId);
    }
  });

  test('로그인 없이 시도하면 401 NOT_LOGGED_IN', async ({ request }) => {
    const name = uniqueName('전화비로그인테스트');
    let restaurantId;
    try {
      restaurantId = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      const res = await request.patch(`/api/restaurants/${restaurantId}/phone`, {
        data: { phone: '02-1234-5678' },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('NOT_LOGGED_IN');
    } finally {
      if (restaurantId) await deleteRestaurant(restaurantId);
    }
  });

  test('이 음식점의 관리자가 아니면 403 RESTAURANT_ACCESS_DENIED', async ({ request }) => {
    const name = uniqueName('전화권한없음테스트');
    const otherName = uniqueName('전화다른음식점');
    let restaurantId, otherRestaurantId, session;
    try {
      restaurantId = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      otherRestaurantId = await insertRestaurant({ name: otherName, latitude: 37.3, longitude: 127.3 });
      // otherRestaurantId의 관리자로 세션을 만들고, restaurantId(다른 음식점)를 수정 시도
      session = await createOwnerSession(otherRestaurantId);

      const res = await request.patch(`/api/restaurants/${restaurantId}/phone`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { phone: '02-0000-0000' },
      });
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('RESTAURANT_ACCESS_DENIED');
    } finally {
      if (session) await cleanupOwnerSession(session);
      if (restaurantId) await deleteRestaurant(restaurantId);
      if (otherRestaurantId) await deleteRestaurant(otherRestaurantId);
    }
  });

  test('없는 restaurantId면 404 RESTAURANT_NOT_FOUND (존재 확인이 권한 확인보다 먼저)', async ({ request }) => {
    // restaurant_managers.restaurant_id는 실제 restaurants FK라 없는 음식점으로는 관리자 행 자체를
    // 만들 수 없음 — 그래서 "진짜 있는 음식점의 관리자" 세션으로 "없는 음식점"을 수정 시도해서
    // resolveOwnedRestaurant()가 존재 확인을 권한 확인보다 먼저 하는지 확인한다.
    const name = uniqueName('전화404테스트');
    let restaurantId, session;
    try {
      restaurantId = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      session = await createOwnerSession(restaurantId);

      const res = await request.patch(`/api/restaurants/999999999/phone`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { phone: '02-0000-0000' },
      });
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.code).toBe('RESTAURANT_NOT_FOUND');
    } finally {
      if (session) await cleanupOwnerSession(session);
      if (restaurantId) await deleteRestaurant(restaurantId);
    }
  });
});

test.describe('001-03 사업자 등록 - 영업시간 (PUT /api/restaurants/{id}/business-hours)', () => {
  test('요일 전체를 한 번에 교체한다', async ({ request }) => {
    const name = uniqueName('영업시간테스트');
    let restaurantId, session;
    try {
      restaurantId = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      session = await createOwnerSession(restaurantId);

      const res = await request.put(`/api/restaurants/${restaurantId}/business-hours`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: {
          businessHours: [
            { dayOfWeek: 1, openTime: '10:00:00', closeTime: '21:00:00', isClosed: false },
            { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
          ],
        },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.businessHours.length).toBe(2);
      const monday = body.businessHours.find(h => h.dayOfWeek === 1);
      expect(monday.openTime).toBe('10:00:00');

      // 다시 3개짜리로 교체 요청하면 이전 2개는 사라지고 3개만 남아야 함(통째로 교체)
      const res2 = await request.put(`/api/restaurants/${restaurantId}/business-hours`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: {
          businessHours: [
            { dayOfWeek: 2, openTime: '09:00:00', closeTime: '18:00:00', isClosed: false },
            { dayOfWeek: 3, openTime: '09:00:00', closeTime: '18:00:00', isClosed: false },
            { dayOfWeek: 4, openTime: '09:00:00', closeTime: '18:00:00', isClosed: false },
          ],
        },
      });
      const body2 = await res2.json();
      expect(body2.businessHours.length).toBe(3);
      expect(body2.businessHours.some(h => h.dayOfWeek === 1)).toBe(false);
    } finally {
      if (session) await cleanupOwnerSession(session);
      if (restaurantId) await deleteRestaurant(restaurantId);
    }
  });
});

test.describe('001-03 사업자 등록 - 메뉴 (POST/PATCH/DELETE /api/restaurants/{id}/menus)', () => {
  test('메뉴를 등록/수정/삭제할 수 있다', async ({ request }) => {
    const name = uniqueName('메뉴등록테스트');
    let restaurantId, session;
    try {
      restaurantId = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      session = await createOwnerSession(restaurantId);

      const createRes = await request.post(`/api/restaurants/${restaurantId}/menus`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { menuName: '등록메뉴', price: 10000, description: '설명', isSignature: true },
      });
      expect(createRes.status()).toBe(200);
      const createBody = await createRes.json();
      expect(createBody.menus.length).toBe(1);
      const menuId = createBody.menus[0].menuId;
      expect(createBody.menus[0].menuName).toBe('등록메뉴');

      const updateRes = await request.patch(`/api/restaurants/${restaurantId}/menus/${menuId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { menuName: '수정메뉴', price: 8000, description: '수정설명', isSignature: false, isAvailable: true },
      });
      expect(updateRes.status()).toBe(200);
      const updateBody = await updateRes.json();
      expect(updateBody.menus[0].menuName).toBe('수정메뉴');
      expect(updateBody.menus[0].price).toBe(8000);

      const deleteRes = await request.delete(`/api/restaurants/${restaurantId}/menus/${menuId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.menus).toEqual([]);
    } finally {
      if (session) await cleanupOwnerSession(session);
      if (restaurantId) await deleteRestaurant(restaurantId);
    }
  });

  test('다른 음식점의 menuId로 수정을 시도하면 404 MENU_NOT_FOUND', async ({ request }) => {
    const name = uniqueName('메뉴교차테스트');
    const otherName = uniqueName('메뉴교차다른가게');
    let restaurantId, otherRestaurantId, session, otherSession;
    try {
      restaurantId = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      otherRestaurantId = await insertRestaurant({ name: otherName, latitude: 37.3, longitude: 127.3 });
      session = await createOwnerSession(restaurantId);
      otherSession = await createOwnerSession(otherRestaurantId);

      const createRes = await request.post(`/api/restaurants/${otherRestaurantId}/menus`, {
        headers: { Authorization: `Bearer ${otherSession.accessToken}` },
        data: { menuName: '다른가게메뉴', price: 5000, isSignature: false },
      });
      const otherMenuId = (await createRes.json()).menus[0].menuId;

      // restaurantId(내 가게) 관리자 권한으로, otherRestaurantId 소속 menuId를 수정 시도
      const res = await request.patch(`/api/restaurants/${restaurantId}/menus/${otherMenuId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { menuName: '탈취시도', price: 1, isSignature: false, isAvailable: true },
      });
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.code).toBe('MENU_NOT_FOUND');
    } finally {
      if (session) await cleanupOwnerSession(session);
      if (otherSession) await cleanupOwnerSession(otherSession);
      if (restaurantId) await deleteRestaurant(restaurantId);
      if (otherRestaurantId) await deleteRestaurant(otherRestaurantId);
    }
  });
});

test.describe('001-03 사업자 등록 - 음식점 사진 (POST/DELETE /api/restaurants/{id}/image)', () => {
  test('사진을 업로드하고 삭제할 수 있다(기본 이미지로 되돌아감)', async ({ request }) => {
    const name = uniqueName('사진등록테스트');
    let restaurantId, session;
    try {
      restaurantId = await insertRestaurant({ name, latitude: 37.2, longitude: 127.2 });
      session = await createOwnerSession(restaurantId);

      const uploadRes = await api.post(`/api/restaurants/${restaurantId}/image`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        multipart: { image: { name: 'test.png', mimeType: 'image/png', buffer: require('fs').readFileSync(IMAGE_PATH) } },
      });
      expect(uploadRes.status()).toBe(200);
      const uploadBody = await uploadRes.json();
      expect(uploadBody.imageUrl).toContain('/restaurant-images/');

      const staticRes = await api.get(uploadBody.imageUrl);
      expect(staticRes.status()).toBe(200);

      const deleteRes = await request.delete(`/api/restaurants/${restaurantId}/image`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.imageUrl).toBeNull();
    } finally {
      if (session) await cleanupOwnerSession(session);
      if (restaurantId) await deleteRestaurant(restaurantId);
    }
  });
});
