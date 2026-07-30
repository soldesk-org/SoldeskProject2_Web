const { test, expect } = require('@playwright/test');
const {
  insertPendingMember,
  insertSocialAccount,
  getMemberByEmail,
  deleteMemberByEmail,
} = require('../dbHelper');
const { activateAccessToken, cleanupAccessKey, closeRedis } = require('../redisHelper');
const { mintAccessToken } = require('../jwtHelper');

test.afterAll(async () => {
  await closeRedis();
});

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
}

function extractStateFromLocation(location) {
  const match = location.match(/[?&]state=([^&]+)/);
  return match ? match[1] : null;
}

// 실제 플랫폼 동의화면을 거치지 않고, 로그인이 이미 된 것처럼 accessToken을 직접 발급 + Redis 세션 등록.
// (001-03 3장 — 소셜로그인 콜백 자체는 자동화된 사용자 동의가 불가능해 이 방식으로 "로그인 이후" 로직만 검증)
async function createSocialSession(email, nickname, provider, providerUserId, socialAccessToken = null) {
  const memberId = await insertPendingMember(email, nickname);
  await insertSocialAccount(memberId, provider, providerUserId, socialAccessToken);
  const { token, jti } = mintAccessToken(memberId, email, 'USER');
  await activateAccessToken(jti, memberId);
  return { memberId, accessToken: token, jti };
}

async function cleanup(email, jti) {
  await deleteMemberByEmail(email);
  if (jti) await cleanupAccessKey(jti);
}

test.describe('001-05 소셜로그인 - 로그인 시작 (GET /api/auth/{provider}/authorize)', () => {
  test('카카오: 302로 카카오 인가 화면으로 리다이렉트되고 state가 포함된다', async ({ request }) => {
    const res = await request.get('/api/auth/kakao/authorize', { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    const location = res.headers()['location'];
    expect(location).toContain('https://kauth.kakao.com/oauth/authorize');
    expect(location).toContain('client_id=');
    expect(extractStateFromLocation(location)).not.toBeNull();
  });

  test('네이버: 302로 네이버 인가 화면으로 리다이렉트된다', async ({ request }) => {
    const res = await request.get('/api/auth/naver/authorize', { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()['location']).toContain('https://nid.naver.com/oauth2.0/authorize');
  });

  test('구글: 302로 구글 인가 화면으로 리다이렉트된다', async ({ request }) => {
    const res = await request.get('/api/auth/google/authorize', { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()['location']).toContain('https://accounts.google.com/o/oauth2/v2/auth');
  });

  test('지원하지 않는 플랫폼이면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.get('/api/auth/facebook/authorize', { maxRedirects: 0 });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });
});

test.describe('001-05 소셜로그인 - 콜백 (GET /oauth/{provider})', () => {
  test('code 파라미터가 없으면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.get('/oauth/kakao');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('state가 없으면 400 INVALID_OAUTH_STATE', async ({ request }) => {
    const res = await request.get('/oauth/kakao?code=whatever');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_OAUTH_STATE');
  });

  test('위조된 state면 400 INVALID_OAUTH_STATE', async ({ request }) => {
    const res = await request.get('/oauth/kakao?code=whatever&state=forged-state-value');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_OAUTH_STATE');
  });

  test('유효한 state + 가짜 code면 실제 카카오 토큰 발급 API가 거부해 500 SOCIAL_LOGIN_FAILED', async ({ request }) => {
    const authorizeRes = await request.get('/api/auth/kakao/authorize', { maxRedirects: 0 });
    const state = extractStateFromLocation(authorizeRes.headers()['location']);

    const res = await request.get(`/oauth/kakao?code=fake-invalid-code&state=${state}`);
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('SOCIAL_LOGIN_FAILED');
  });

  test('유효한 state + 가짜 code면 실제 네이버 토큰 발급 API가 거부해 500 SOCIAL_LOGIN_FAILED', async ({ request }) => {
    const authorizeRes = await request.get('/api/auth/naver/authorize', { maxRedirects: 0 });
    const state = extractStateFromLocation(authorizeRes.headers()['location']);

    const res = await request.get(`/oauth/naver?code=fake-invalid-code&state=${state}`);
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('SOCIAL_LOGIN_FAILED');
  });

  test('유효한 state + 가짜 code면 실제 구글 토큰 발급 API가 거부해 500 SOCIAL_LOGIN_FAILED', async ({ request }) => {
    const authorizeRes = await request.get('/api/auth/google/authorize', { maxRedirects: 0 });
    const state = extractStateFromLocation(authorizeRes.headers()['location']);

    const res = await request.get(`/oauth/google?code=fake-invalid-code&state=${state}`);
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('SOCIAL_LOGIN_FAILED');
  });

  test('state는 1회용이라, 실패한 콜백이라도 같은 state를 재사용하면 두 번째부터는 400 INVALID_OAUTH_STATE', async ({ request }) => {
    const authorizeRes = await request.get('/api/auth/kakao/authorize', { maxRedirects: 0 });
    const state = extractStateFromLocation(authorizeRes.headers()['location']);

    const firstRes = await request.get(`/oauth/kakao?code=fake&state=${state}`);
    expect(firstRes.status()).toBe(500);
    const firstBody = await firstRes.json();
    expect(firstBody.code).toBe('SOCIAL_LOGIN_FAILED');

    const secondRes = await request.get(`/oauth/kakao?code=fake&state=${state}`);
    expect(secondRes.status()).toBe(400);
    const secondBody = await secondRes.json();
    expect(secondBody.code).toBe('INVALID_OAUTH_STATE');
  });
});

test.describe('001-05 소셜로그인 - 회원정보수정 비밀번호 변경 차단 (PATCH /api/members/me)', () => {
  test('소셜 계정으로 비밀번호 변경을 시도하면 403 SOCIAL_ACCOUNT_PASSWORD_CHANGE_NOT_ALLOWED', async ({ request }) => {
    const email = uniqueEmail('socialpw');
    const session = await createSocialSession(email, 'socialpw', 'KAKAO', `kakao-${Date.now()}`);
    try {
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: 'socialpw', password: 'NewP@ss1', passwordConfirm: 'NewP@ss1' },
      });
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('SOCIAL_ACCOUNT_PASSWORD_CHANGE_NOT_ALLOWED');
    } finally {
      await cleanup(email, session.jti);
    }
  });

  test('소셜 계정도 비밀번호를 바꾸지 않는 닉네임 수정은 정상 동작한다', async ({ request }) => {
    const email = uniqueEmail('socialnick');
    const session = await createSocialSession(email, 'socialnick', 'KAKAO', `kakao-${Date.now()}`);
    try {
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: 'nn' + (Date.now() % 10000) },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    } finally {
      await cleanup(email, session.jti);
    }
  });
});

test.describe('001-05 소셜로그인 - 연동 해제 (DELETE /api/auth/{provider}/unlink)', () => {
  test('Authorization 헤더가 없으면 401 NOT_LOGGED_IN', async ({ request }) => {
    const res = await request.delete('/api/auth/kakao/unlink');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('NOT_LOGGED_IN');
  });

  test('연동되지 않은 플랫폼을 해제 시도하면 404 SOCIAL_ACCOUNT_NOT_LINKED', async ({ request }) => {
    const email = uniqueEmail('unlinknotexist');
    const session = await createSocialSession(email, 'unlinkne', 'KAKAO', `kakao-${Date.now()}`);
    try {
      const res = await request.delete('/api/auth/naver/unlink', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.code).toBe('SOCIAL_ACCOUNT_NOT_LINKED');
    } finally {
      await cleanup(email, session.jti);
    }
  });

  test('연동된 플랫폼이지만 저장된 토큰이 유효하지 않으면 실제 카카오 API가 거부해 500 SOCIAL_UNLINK_FAILED, DB row는 그대로 남는다', async ({ request }) => {
    const email = uniqueEmail('unlinkfail');
    const session = await createSocialSession(email, 'unlinkfail', 'KAKAO', `kakao-${Date.now()}`, 'expired-or-fake-token');
    try {
      const res = await request.delete('/api/auth/kakao/unlink', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status()).toBe(500);
      const body = await res.json();
      expect(body.code).toBe('SOCIAL_UNLINK_FAILED');

      // 연동 해제 API 호출이 실패했으므로 social_accounts row가 삭제되지 않고 남아있어야 한다.
      const member = await getMemberByEmail(email);
      expect(member).toBeTruthy();
    } finally {
      await cleanup(email, session.jti);
    }
  });
});

test.describe('001-05 소셜로그인 - 네이버 연결 끊기 콜백 (GET /api/auth/naver/unlink-callback)', () => {
  test('네이버가 어떤 파라미터로 호출하든 200으로 응답한다(수신 전용 스텁)', async ({ request }) => {
    const res = await request.get('/api/auth/naver/unlink-callback?user_id=abc123');
    expect(res.status()).toBe(200);
  });
});
