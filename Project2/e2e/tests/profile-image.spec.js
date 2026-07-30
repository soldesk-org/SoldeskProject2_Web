const fs = require('fs');
const path = require('path');
const { test, expect, request: pwRequest } = require('@playwright/test');
const {
  insertPendingMember,
  insertEmailVerification,
  insertPhoneVerification,
  deleteMemberByEmail,
  getMemberByEmail,
} = require('../dbHelper');
const { cleanupMemberKeys, cleanupAccessKey, closeRedis } = require('../redisHelper');

// playwright.config.ts가 모든 요청에 Content-Type: application/json을 강제로 붙이는데(extraHTTPHeaders),
// multipart 요청에서는 이 헤더가 boundary 자동 설정을 막아 서버가 "Content-Type이 지원되지 않음"으로
// 거부한다. business-signup.spec.js와 동일하게 extraHTTPHeaders 없는 별도 컨텍스트를 사용한다.
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

function decodeJwtPayload(token) {
  const payloadBase64Url = token.split('.')[1];
  const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
}

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
}

const VALID_PASSWORD = 'P@ssw0rd1';
const IMAGE_PATH = path.resolve(__dirname, '..', 'fixtures', 'test-profile.png');
const NOT_IMAGE_PATH = path.resolve(__dirname, '..', 'fixtures', 'not-image.txt');

function randomPhone() {
  const n1 = String(Math.floor(1000 + Math.random() * 9000));
  const n2 = String(Math.floor(1000 + Math.random() * 9000));
  return `010-${n1}-${n2}`;
}

function randomNickname(prefix) {
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${suffix}`.slice(0, 10);
}

async function signUpAndLogin(email) {
  const nickname = randomNickname('pi');
  const phone = randomPhone();
  const memberId = await insertPendingMember(email, nickname + '_p');
  const future = new Date(Date.now() + 5 * 60 * 1000);
  await insertEmailVerification(memberId, email, '000000', future, true);
  await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

  const signUpRes = await api.post('/api/members/signup', {
    data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
  });
  expect(signUpRes.status()).toBe(200);
  const signUpBody = await signUpRes.json();

  const loginRes = await api.post('/api/members/login', {
    data: { email, password: VALID_PASSWORD },
  });
  expect(loginRes.status()).toBe(200);
  const loginBody = await loginRes.json();

  return {
    memberId: signUpBody.memberId,
    accessToken: loginBody.accessToken,
    jti: decodeJwtPayload(loginBody.accessToken).jti,
  };
}

async function cleanup(email, memberId, jti) {
  await deleteMemberByEmail(email);
  if (memberId) await cleanupMemberKeys(memberId);
  if (jti) await cleanupAccessKey(jti);
}

test.describe('001-06 프로필 사진 - 내 정보 조회에 필드 포함 (GET /api/members/me)', () => {
  test('사진을 등록하지 않은 회원은 profileImageUrl이 null이다(기본 이미지 자산 미등록 상태)', async () => {
    const email = uniqueEmail('noimg');
    const session = await signUpAndLogin(email);
    try {
      const res = await api.get('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.profileImageUrl).toBeNull();
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });
});

test.describe('001-06 프로필 사진 등록/변경 (POST /api/members/me/profile-image)', () => {
  test('Authorization 헤더가 없으면 401 NOT_LOGGED_IN', async () => {
    const res = await api.post('/api/members/me/profile-image', {
      multipart: { profileImage: { name: 'test-profile.png', mimeType: 'image/png', buffer: fs.readFileSync(IMAGE_PATH) } },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('NOT_LOGGED_IN');
  });

  test('이미지 파일이 없으면 400', async () => {
    const email = uniqueEmail('imgnopart');
    const session = await signUpAndLogin(email);
    try {
      const res = await api.post('/api/members/me/profile-image', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        multipart: {},
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('이미지가 아닌 파일(txt)을 올리면 400 INVALID_PROFILE_IMAGE', async () => {
    const email = uniqueEmail('imgwrongtype');
    const session = await signUpAndLogin(email);
    try {
      const res = await api.post('/api/members/me/profile-image', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        multipart: {
          profileImage: {
            name: 'not-image.txt',
            mimeType: 'text/plain',
            buffer: fs.readFileSync(NOT_IMAGE_PATH),
          },
        },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('INVALID_PROFILE_IMAGE');
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('정상 이미지를 올리면 200 성공 + URL 반환, 그 URL로 실제 이미지를 받을 수 있고 GET /me에도 반영된다', async () => {
    const email = uniqueEmail('imgok');
    const session = await signUpAndLogin(email);
    try {
      const uploadRes = await api.post('/api/members/me/profile-image', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        multipart: {
          profileImage: {
            name: 'test-profile.png',
            mimeType: 'image/png',
            buffer: fs.readFileSync(IMAGE_PATH),
          },
        },
      });
      expect(uploadRes.status()).toBe(200);
      const uploadBody = await uploadRes.json();
      expect(uploadBody.success).toBe(true);
      expect(uploadBody.profileImageUrl).toContain('/profile-images/');

      const imageRes = await api.get(uploadBody.profileImageUrl);
      expect(imageRes.status()).toBe(200);
      expect(imageRes.headers()['content-type']).toBe('image/png');

      const meRes = await api.get('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const meBody = await meRes.json();
      expect(meBody.profileImageUrl).toBe(uploadBody.profileImageUrl);

      const member = await getMemberByEmail(email);
      expect(member.profile_image_url).toBe(uploadBody.profileImageUrl);
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('이미지를 다시 올리면 이전 파일은 서버에서 접근 불가능해진다(교체 시 정리)', async () => {
    const email = uniqueEmail('imgreplace');
    const session = await signUpAndLogin(email);
    try {
      const firstRes = await api.post('/api/members/me/profile-image', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        multipart: {
          profileImage: { name: 'a.png', mimeType: 'image/png', buffer: fs.readFileSync(IMAGE_PATH) },
        },
      });
      const firstUrl = (await firstRes.json()).profileImageUrl;

      const secondRes = await api.post('/api/members/me/profile-image', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        multipart: {
          profileImage: { name: 'b.png', mimeType: 'image/png', buffer: fs.readFileSync(IMAGE_PATH) },
        },
      });
      const secondUrl = (await secondRes.json()).profileImageUrl;
      expect(secondUrl).not.toBe(firstUrl);

      const oldImageRes = await api.get(firstUrl);
      expect(oldImageRes.status()).toBe(404);

      const newImageRes = await api.get(secondUrl);
      expect(newImageRes.status()).toBe(200);
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });
});

test.describe('001-06 프로필 사진 삭제 (DELETE /api/members/me/profile-image)', () => {
  test('Authorization 헤더가 없으면 401 NOT_LOGGED_IN', async () => {
    const res = await api.delete('/api/members/me/profile-image');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('NOT_LOGGED_IN');
  });

  test('등록된 사진을 삭제하면 200 + profileImageUrl null, 이전 URL은 더 이상 접근 불가능하다', async () => {
    const email = uniqueEmail('imgdel');
    const session = await signUpAndLogin(email);
    try {
      const uploadRes = await api.post('/api/members/me/profile-image', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        multipart: {
          profileImage: { name: 'a.png', mimeType: 'image/png', buffer: fs.readFileSync(IMAGE_PATH) },
        },
      });
      const uploadedUrl = (await uploadRes.json()).profileImageUrl;

      const deleteRes = await api.delete('/api/members/me/profile-image', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.success).toBe(true);
      expect(deleteBody.profileImageUrl).toBeNull();

      const imageRes = await api.get(uploadedUrl);
      expect(imageRes.status()).toBe(404);

      const meRes = await api.get('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect((await meRes.json()).profileImageUrl).toBeNull();
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('사진이 없는 상태에서 삭제를 호출해도 200 성공(멱등)', async () => {
    const email = uniqueEmail('imgdelnoop');
    const session = await signUpAndLogin(email);
    try {
      const res = await api.delete('/api/members/me/profile-image', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.profileImageUrl).toBeNull();
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });
});
