const { test, expect } = require('@playwright/test');
const {
  insertPendingMember,
  insertEmailVerification,
  insertPhoneVerification,
  deleteMemberByEmail,
} = require('../dbHelper');
const {
  getRefreshToken,
  isAccessTokenActive,
  cleanupMemberKeys,
  cleanupAccessKey,
  closeRedis,
} = require('../redisHelper');

test.afterAll(async () => {
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

function randomPhone() {
  const n1 = String(Math.floor(1000 + Math.random() * 9000));
  const n2 = String(Math.floor(1000 + Math.random() * 9000));
  return `010-${n1}-${n2}`;
}

function randomNickname(prefix) {
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${suffix}`.slice(0, 10);
}

async function signUpAndLogin(request, email) {
  const nickname = randomNickname('lo');
  const phone = randomPhone();
  const memberId = await insertPendingMember(email, nickname + '_p');
  const future = new Date(Date.now() + 5 * 60 * 1000);
  await insertEmailVerification(memberId, email, '000000', future, true);
  // 회원가입에 전화번호 SMS 인증 게이트가 추가되어(PHONE_NOT_VERIFIED), 실제 SMS 발송 없이 인증 완료 상태를 직접 시딩한다.
  await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

  const signUpRes = await request.post('/api/members/signup', {
    data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
  });
  expect(signUpRes.status()).toBe(200);

  const loginRes = await request.post('/api/members/login', {
    data: { email, password: VALID_PASSWORD },
  });
  expect(loginRes.status()).toBe(200);
  const loginBody = await loginRes.json();
  const jti = decodeJwtPayload(loginBody.accessToken).jti;

  return { memberId: loginBody.memberId, accessToken: loginBody.accessToken, jti };
}

test.describe('001-03 로그아웃 (POST /api/members/logout)', () => {
  test('정상 로그아웃 시 access/refresh token이 Redis에서 모두 삭제된다', async ({ request }) => {
    const email = uniqueEmail('logoutok');
    let memberId, jti;
    try {
      const session = await signUpAndLogin(request, email);
      memberId = session.memberId;
      jti = session.jti;

      // 로그아웃 전: 두 키 다 살아있어야 함
      expect(await isAccessTokenActive(jti)).toBe(true);
      expect(await getRefreshToken(memberId)).not.toBeNull();

      const res = await request.post('/api/members/logout', {
        data: { accessToken: session.accessToken },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('로그아웃되었습니다.');

      // 로그아웃 후: 두 키 다 삭제되어 있어야 함
      expect(await isAccessTokenActive(jti)).toBe(false);
      expect(await getRefreshToken(memberId)).toBeNull();
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
      if (jti) await cleanupAccessKey(jti);
    }
  });

  test('이미 로그아웃한 accessToken을 다시 사용하면 401 NOT_LOGGED_IN', async ({ request }) => {
    const email = uniqueEmail('logouttwice');
    let memberId, jti;
    try {
      const session = await signUpAndLogin(request, email);
      memberId = session.memberId;
      jti = session.jti;

      const firstRes = await request.post('/api/members/logout', {
        data: { accessToken: session.accessToken },
      });
      expect(firstRes.status()).toBe(200);

      const secondRes = await request.post('/api/members/logout', {
        data: { accessToken: session.accessToken },
      });
      expect(secondRes.status()).toBe(401);
      const body = await secondRes.json();
      expect(body.code).toBe('NOT_LOGGED_IN');
      expect(body.message).toBe('로그인 상태가 아닙니다.');
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
      if (jti) await cleanupAccessKey(jti);
    }
  });

  test('형식이 이상한(위조/손상된) accessToken이면 401 NOT_LOGGED_IN', async ({ request }) => {
    const res = await request.post('/api/members/logout', {
      data: { accessToken: 'this-is-not-a-valid-jwt' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('NOT_LOGGED_IN');
  });

  test('서명이 조작된 accessToken이면 401 NOT_LOGGED_IN', async ({ request }) => {
    const email = uniqueEmail('logouttamper');
    let memberId, jti;
    try {
      const session = await signUpAndLogin(request, email);
      memberId = session.memberId;
      jti = session.jti;

      // 서명(마지막 세그먼트)을 임의로 변조
      const parts = session.accessToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}abcd`;

      const res = await request.post('/api/members/logout', {
        data: { accessToken: tamperedToken },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('NOT_LOGGED_IN');

      // 원래 토큰은 아직 살아있어야 함 (변조된 토큰 시도가 원래 세션에 영향 주면 안 됨)
      expect(await isAccessTokenActive(jti)).toBe(true);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
      if (jti) await cleanupAccessKey(jti);
    }
  });

  test('accessToken 미입력이면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.post('/api/members/logout', {
      data: { accessToken: '' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });
});
