const { test, expect } = require('@playwright/test');
const {
  insertPendingMember,
  insertEmailVerification,
  insertPhoneVerification,
  deleteMemberByEmail,
  setMemberStatus,
  getMemberByEmail,
} = require('../dbHelper');
const {
  getLoginFailCount,
  isLoginLocked,
  getRefreshToken,
  getRefreshTokenTier,
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
const WRONG_PASSWORD = 'Wr0ng!Pass';

function randomPhone() {
  const n1 = String(Math.floor(1000 + Math.random() * 9000));
  const n2 = String(Math.floor(1000 + Math.random() * 9000));
  return `010-${n1}-${n2}`;
}

function randomNickname(prefix) {
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${suffix}`.slice(0, 10);
}

// 로그인 테스트는 Argon2 해시를 JS에서 직접 만들지 않고,
// 실제 회원가입 API를 통해 정상 가입된 계정을 만든 뒤 그 계정으로 로그인을 검증한다.
async function signUpVerifiedMember(email, password) {
  const nickname = randomNickname('login');
  const phone = randomPhone();
  const memberId = await insertPendingMember(email, nickname + '_p');
  const future = new Date(Date.now() + 5 * 60 * 1000);
  await insertEmailVerification(memberId, email, '000000', future, true);
  // 회원가입에 전화번호 SMS 인증 게이트가 추가되어(PHONE_NOT_VERIFIED), 실제 SMS 발송 없이 인증 완료 상태를 직접 시딩한다.
  await insertPhoneVerification(memberId, phone, 'SIGNUP', true);
  return { memberId, nickname, phone };
}

test.describe('001-02 로그인 (POST /api/members/login)', () => {
  test('입력값 형식이 올바르지 않으면 400 INVALID_INPUT (이메일 형식 오류)', async ({ request }) => {
    const res = await request.post('/api/members/login', {
      data: { email: 'not-an-email', password: VALID_PASSWORD },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('비밀번호가 비어있으면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.post('/api/members/login', {
      data: { email: uniqueEmail('blankpw'), password: '' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('존재하지 않는 이메일로 로그인 시 401 INVALID_CREDENTIALS', async ({ request }) => {
    const res = await request.post('/api/members/login', {
      data: { email: uniqueEmail('nouser'), password: VALID_PASSWORD },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('INVALID_CREDENTIALS');
    expect(body.message).toBe('아이디 또는 비밀번호가 일치하지 않습니다.');
  });

  test('회원가입(비밀번호 등록)이 완료되지 않은 회원은 401 INVALID_CREDENTIALS', async ({ request }) => {
    const email = uniqueEmail('nocredential');
    // members row만 존재하고 member_credentials가 없는 상태(인증만 완료, 최종 가입 미완료)를 재현
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '111111', future, true);
    try {
      const res = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_CREDENTIALS');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('비밀번호가 일치하지 않으면 401 INVALID_CREDENTIALS', async ({ request }) => {
    const email = uniqueEmail('wrongpw');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);
      memberId = (await signUpRes.json()).memberId;

      const res = await request.post('/api/members/login', {
        data: { email, password: WRONG_PASSWORD },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_CREDENTIALS');
      expect(body.message).toBe('아이디 또는 비밀번호가 일치하지 않습니다.');
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('이메일/비밀번호가 일치하면 200 성공', async ({ request }) => {
    const email = uniqueEmail('loginok');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);
      const signUpBody = await signUpRes.json();
      memberId = signUpBody.memberId;

      const res = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('로그인에 성공하였습니다.');
      expect(body.memberId).toBe(signUpBody.memberId);
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken.split('.').length).toBe(3); // JWT는 header.payload.signature 3파트
      expect(typeof body.refreshToken).toBe('string');

      // 로그인 성공 시 실패 카운트/잠금이 Redis에 남아있지 않아야 한다
      expect(await getLoginFailCount(memberId)).toBe(0);
      expect(await isLoginLocked(memberId)).toBe(false);

      // 발급된 refresh token이 Redis에 그대로 저장되어 있어야 한다
      expect(await getRefreshToken(memberId)).toBe(body.refreshToken);

      // members.last_login_at이 로그인 성공 시각으로 갱신되어야 한다
      const member = await getMemberByEmail(email);
      expect(member.last_login_at).not.toBeNull();

      // accessToken의 클레임 내용도 실제 로그인한 계정과 일치해야 한다
      const payload = decodeJwtPayload(body.accessToken);
      expect(payload.sub).toBe(String(memberId));
      expect(payload.email).toBe(email);
      expect(payload.role).toBe('USER');
      expect(typeof payload.exp).toBe('number');
      expect(payload.exp).toBeGreaterThan(payload.iat);

      await cleanupAccessKey(payload.jti);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('비밀번호를 5회 연속 틀리면 계정이 잠기고, 이후에는 비밀번호가 맞아도 423 ACCOUNT_LOCKED', async ({ request }) => {
    const email = uniqueEmail('lockout');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);
      memberId = (await signUpRes.json()).memberId;

      let lastRes;
      for (let i = 0; i < 5; i++) {
        lastRes = await request.post('/api/members/login', {
          data: { email, password: WRONG_PASSWORD },
        });
      }
      // 5번째 실패에서 바로 잠김 처리
      expect(lastRes.status()).toBe(423);
      const lastBody = await lastRes.json();
      expect(lastBody.code).toBe('ACCOUNT_LOCKED');

      expect(await getLoginFailCount(memberId)).toBe(5);
      expect(await isLoginLocked(memberId)).toBe(true);

      // 잠긴 상태에서는 올바른 비밀번호를 입력해도 로그인 불가
      const res = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(res.status()).toBe(423);
      const body = await res.json();
      expect(body.code).toBe('ACCOUNT_LOCKED');
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('동시에 여러 번 틀린 비밀번호로 로그인해도 실패 카운트가 유실되지 않고 정확히 잠긴다 (레이스 컨디션)', async ({ request }) => {
    const email = uniqueEmail('lockoutrace');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);
      memberId = (await signUpRes.json()).memberId;

      // 잠금 임계치(5회)보다 많은 8개의 잘못된 비밀번호 로그인을 동시에 발사한다.
      // 카운트 증가가 원자적이지 않으면(lost update) 8번 다 틀려도 5회 미만으로 집계되어 잠기지 않을 수 있다.
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          request.post('/api/members/login', { data: { email, password: WRONG_PASSWORD } })
        )
      );
      const statuses = results.map((r) => r.status());
      expect(statuses.filter((s) => s === 423).length).toBeGreaterThan(0);

      expect(await getLoginFailCount(memberId)).toBe(8);
      expect(await isLoginLocked(memberId)).toBe(true);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('정지(SUSPENDED)된 계정은 비밀번호가 맞아도 403 ACCOUNT_SUSPENDED', async ({ request }) => {
    const email = uniqueEmail('suspended');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);
      await setMemberStatus(email, 'SUSPENDED');

      const res = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('ACCOUNT_SUSPENDED');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('탈퇴(WITHDRAWN)된 계정은 비밀번호가 맞아도 403 ACCOUNT_WITHDRAWN', async ({ request }) => {
    const email = uniqueEmail('withdrawn');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);
      await setMemberStatus(email, 'WITHDRAWN');

      const res = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('ACCOUNT_WITHDRAWN');
    } finally {
      await deleteMemberByEmail(email);
    }
  });
});

test.describe('001-05 refresh token (POST /api/members/refresh)', () => {
  test('발급받은 refresh token으로 재요청하면 새 access/refresh token을 받는다 (회전)', async ({ request }) => {
    const email = uniqueEmail('refreshok');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      memberId = (await signUpRes.json()).memberId;

      const loginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      const loginBody = await loginRes.json();

      const refreshRes = await request.post('/api/members/refresh', {
        data: { memberId, refreshToken: loginBody.refreshToken },
      });
      expect(refreshRes.status()).toBe(200);
      const refreshBody = await refreshRes.json();
      expect(refreshBody.success).toBe(true);
      expect(typeof refreshBody.accessToken).toBe('string');
      expect(typeof refreshBody.refreshToken).toBe('string');
      // 새 토큰은 이전 토큰과 달라야 한다 (access token은 발급 시각이 달라 값이 갈릴 가능성이 높고, refresh token은 항상 회전됨)
      expect(refreshBody.refreshToken).not.toBe(loginBody.refreshToken);

      // Redis에 저장된 값도 새 refresh token으로 교체되어 있어야 한다
      expect(await getRefreshToken(memberId)).toBe(refreshBody.refreshToken);

      // 회전되어 무효화된 이전 refresh token으로 다시 요청하면 실패해야 한다
      const reuseRes = await request.post('/api/members/refresh', {
        data: { memberId, refreshToken: loginBody.refreshToken },
      });
      expect(reuseRes.status()).toBe(401);
      const reuseBody = await reuseRes.json();
      expect(reuseBody.code).toBe('INVALID_REFRESH_TOKEN');

      await cleanupAccessKey(decodeJwtPayload(loginBody.accessToken).jti);
      await cleanupAccessKey(decodeJwtPayload(refreshBody.accessToken).jti);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('존재하지 않거나 틀린 refresh token이면 401 INVALID_REFRESH_TOKEN', async ({ request }) => {
    const email = uniqueEmail('refreshbad');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      memberId = (await signUpRes.json()).memberId;

      // 로그인한 적이 없어 Redis에 refresh token 자체가 없는 상태
      const res = await request.post('/api/members/refresh', {
        data: { memberId, refreshToken: 'not-a-real-token' },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_REFRESH_TOKEN');
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('다른 회원의 memberId로 refresh token을 재사용하면 401 INVALID_REFRESH_TOKEN', async ({ request }) => {
    const emailA = uniqueEmail('refreshxa');
    const emailB = uniqueEmail('refreshxb');
    const a = await signUpVerifiedMember(emailA, VALID_PASSWORD);
    const b = await signUpVerifiedMember(emailB, VALID_PASSWORD);
    let memberIdA, memberIdB;
    try {
      const signUpResA = await request.post('/api/members/signup', {
        data: { email: emailA, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: a.nickname, phone: a.phone },
      });
      memberIdA = (await signUpResA.json()).memberId;
      const signUpResB = await request.post('/api/members/signup', {
        data: { email: emailB, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: b.nickname, phone: b.phone },
      });
      memberIdB = (await signUpResB.json()).memberId;

      const loginResA = await request.post('/api/members/login', {
        data: { email: emailA, password: VALID_PASSWORD },
      });
      const loginBodyA = await loginResA.json();

      // A의 refresh token을 B의 memberId와 함께 보냄 -> 실패해야 함
      const res = await request.post('/api/members/refresh', {
        data: { memberId: memberIdB, refreshToken: loginBodyA.refreshToken },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_REFRESH_TOKEN');

      await cleanupAccessKey(decodeJwtPayload(loginBodyA.accessToken).jti);
    } finally {
      await deleteMemberByEmail(emailA);
      await deleteMemberByEmail(emailB);
      if (memberIdA) await cleanupMemberKeys(memberIdA);
      if (memberIdB) await cleanupMemberKeys(memberIdB);
    }
  });
});

test.describe('001-06 로그인 상태 유지 (rememberMe, 2026-07-19 요구사항 추가)', () => {
  test('rememberMe를 생략하면 짧은 세션(기본 24시간)으로 refresh token이 발급된다', async ({ request }) => {
    const email = uniqueEmail('rememberomit');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      memberId = (await signUpRes.json()).memberId;

      const loginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(loginRes.status()).toBe(200);
      const loginBody = await loginRes.json();

      const { tier, ttlSeconds } = await getRefreshTokenTier(memberId);
      expect(tier).toBe('SHORT');
      // 기본값 24시간(86400초) 근방인지만 확인(테스트 실행 시간 오차 감안, 23~24시간 범위)
      expect(ttlSeconds).toBeGreaterThan(23 * 3600);
      expect(ttlSeconds).toBeLessThanOrEqual(24 * 3600);

      await cleanupAccessKey(decodeJwtPayload(loginBody.accessToken).jti);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('rememberMe: false를 명시해도 짧은 세션으로 발급된다', async ({ request }) => {
    const email = uniqueEmail('rememberfalse');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      memberId = (await signUpRes.json()).memberId;

      const loginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD, rememberMe: false },
      });
      const loginBody = await loginRes.json();

      const { tier } = await getRefreshTokenTier(memberId);
      expect(tier).toBe('SHORT');

      await cleanupAccessKey(decodeJwtPayload(loginBody.accessToken).jti);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('rememberMe: true면 긴 세션(기본 14일)으로 refresh token이 발급된다', async ({ request }) => {
    const email = uniqueEmail('remembertrue');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      memberId = (await signUpRes.json()).memberId;

      const loginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD, rememberMe: true },
      });
      const loginBody = await loginRes.json();

      const { tier, ttlSeconds } = await getRefreshTokenTier(memberId);
      expect(tier).toBe('LONG');
      expect(ttlSeconds).toBeGreaterThan(13 * 86400);
      expect(ttlSeconds).toBeLessThanOrEqual(14 * 86400);

      await cleanupAccessKey(decodeJwtPayload(loginBody.accessToken).jti);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('rememberMe: true로 로그인 후 토큰을 재발급받아도(회전) 긴 세션 tier가 그대로 유지된다', async ({ request }) => {
    const email = uniqueEmail('remembertierkeep');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      memberId = (await signUpRes.json()).memberId;

      const loginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD, rememberMe: true },
      });
      const loginBody = await loginRes.json();

      // 재발급 요청에는 rememberMe를 다시 보내지 않는다 — 서버가 기존 tier를 기억해서 유지해야 함
      const refreshRes = await request.post('/api/members/refresh', {
        data: { memberId, refreshToken: loginBody.refreshToken },
      });
      expect(refreshRes.status()).toBe(200);
      const refreshBody = await refreshRes.json();

      const { tier, ttlSeconds } = await getRefreshTokenTier(memberId);
      expect(tier).toBe('LONG');
      expect(ttlSeconds).toBeGreaterThan(13 * 86400);

      await cleanupAccessKey(decodeJwtPayload(loginBody.accessToken).jti);
      await cleanupAccessKey(decodeJwtPayload(refreshBody.accessToken).jti);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });

  test('rememberMe: false로 로그인 후 재발급해도 짧은 세션 tier가 그대로 유지된다', async ({ request }) => {
    const email = uniqueEmail('remembershortkeep');
    const { nickname, phone } = await signUpVerifiedMember(email, VALID_PASSWORD);
    let memberId;
    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      memberId = (await signUpRes.json()).memberId;

      const loginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD, rememberMe: false },
      });
      const loginBody = await loginRes.json();

      const refreshRes = await request.post('/api/members/refresh', {
        data: { memberId, refreshToken: loginBody.refreshToken },
      });
      const refreshBody = await refreshRes.json();

      const { tier, ttlSeconds } = await getRefreshTokenTier(memberId);
      expect(tier).toBe('SHORT');
      expect(ttlSeconds).toBeLessThanOrEqual(24 * 3600);

      await cleanupAccessKey(decodeJwtPayload(loginBody.accessToken).jti);
      await cleanupAccessKey(decodeJwtPayload(refreshBody.accessToken).jti);
    } finally {
      await deleteMemberByEmail(email);
      if (memberId) await cleanupMemberKeys(memberId);
    }
  });
});
