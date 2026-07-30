const { test, expect } = require('@playwright/test');
const {
  insertPendingMember,
  insertEmailVerification,
  insertPhoneVerification,
  deleteMemberByEmail,
  getMemberByEmail,
  setMemberStatus,
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
const NEW_PASSWORD = 'N3wP@ssw0rd';

function randomPhone() {
  const n1 = String(Math.floor(1000 + Math.random() * 9000));
  const n2 = String(Math.floor(1000 + Math.random() * 9000));
  return `010-${n1}-${n2}`;
}

function randomNickname(prefix) {
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${suffix}`.slice(0, 10);
}

// 회원가입 API를 통해 정상 가입 + 로그인된 계정을 만들고, 정리에 필요한 정보를 함께 반환한다.
async function signUpAndLogin(request, email) {
  const nickname = randomNickname('pu');
  const phone = randomPhone();
  const memberId = await insertPendingMember(email, nickname + '_p');
  const future = new Date(Date.now() + 5 * 60 * 1000);
  await insertEmailVerification(memberId, email, '000000', future, true);
  await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

  const signUpRes = await request.post('/api/members/signup', {
    data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
  });
  expect(signUpRes.status()).toBe(200);
  const signUpBody = await signUpRes.json();

  const loginRes = await request.post('/api/members/login', {
    data: { email, password: VALID_PASSWORD },
  });
  expect(loginRes.status()).toBe(200);
  const loginBody = await loginRes.json();

  return {
    memberId: signUpBody.memberId,
    nickname,
    phone,
    accessToken: loginBody.accessToken,
    jti: decodeJwtPayload(loginBody.accessToken).jti,
  };
}

async function cleanup(email, memberId, jti) {
  await deleteMemberByEmail(email);
  if (memberId) await cleanupMemberKeys(memberId);
  if (jti) await cleanupAccessKey(jti);
}

test.describe('001-05 회원정보수정 (GET /api/members/me)', () => {
  test('Authorization 헤더가 없으면 401 NOT_LOGGED_IN', async ({ request }) => {
    const res = await request.get('/api/members/me');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('NOT_LOGGED_IN');
  });

  test('유효하지 않은 토큰이면 401 NOT_LOGGED_IN', async ({ request }) => {
    const res = await request.get('/api/members/me', {
      headers: { Authorization: 'Bearer invalid.token.value' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('NOT_LOGGED_IN');
  });

  test('로그인 상태면 email/nickname만 자동으로 채워 반환한다 (비밀번호/전화번호 제외)', async ({ request }) => {
    const email = uniqueEmail('meok');
    const session = await signUpAndLogin(request, email);
    try {
      const res = await request.get('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.email).toBe(email);
      expect(body.nickname).toBe(session.nickname);
      expect(body.password).toBeUndefined();
      expect(body.phone).toBeUndefined();
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });
});

test.describe('001-05 회원정보수정 (PATCH /api/members/me) - 닉네임만 변경', () => {
  test('닉네임만 바꾸면 200 성공하고 DB에 반영된다', async ({ request }) => {
    const email = uniqueEmail('nickok');
    const session = await signUpAndLogin(request, email);
    try {
      const newNickname = randomNickname('new');
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: newNickname },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const member = await getMemberByEmail(email);
      expect(member.nickname).toBe(newNickname);
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('본인의 기존 닉네임을 그대로 재제출해도 DUPLICATE_NICKNAME이 발생하지 않는다', async ({ request }) => {
    const email = uniqueEmail('nickself');
    const session = await signUpAndLogin(request, email);
    try {
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: session.nickname },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('다른 회원이 사용 중인 닉네임으로 바꾸면 409 DUPLICATE_NICKNAME', async ({ request }) => {
    const emailA = uniqueEmail('nickdupa');
    const emailB = uniqueEmail('nickdupb');
    const a = await signUpAndLogin(request, emailA);
    const b = await signUpAndLogin(request, emailB);
    try {
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${a.accessToken}` },
        data: { nickname: b.nickname },
      });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('DUPLICATE_NICKNAME');
    } finally {
      await cleanup(emailA, a.memberId, a.jti);
      await cleanup(emailB, b.memberId, b.jti);
    }
  });
});

test.describe('001-05 회원정보수정 - 이메일 변경 (인증 플로우)', () => {
  test('인증 없이 이메일만 바꿔서 저장하면 400 EMAIL_NOT_VERIFIED', async ({ request }) => {
    const email = uniqueEmail('emailnover');
    const session = await signUpAndLogin(request, email);
    try {
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: session.nickname, email: uniqueEmail('newemail') },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('EMAIL_NOT_VERIFIED');
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('send-code는 메일 계정 미설정 환경에서 500 MAIL_SEND_FAIL이지만, 인증 레코드를 직접 시딩해 verify-code -> 저장 흐름은 검증할 수 있다', async ({ request }) => {
    const email = uniqueEmail('emailok');
    const session = await signUpAndLogin(request, email);
    const newEmail = uniqueEmail('emailnew');
    try {
      // signup.spec.js의 확인대로 이 테스트 환경에는 MAIL_USERNAME/MAIL_APP_PASSWORD가 없어
      // 실제 발송은 항상 실패한다(500 MAIL_SEND_FAIL). send-code 엔드포인트가 프로필 이메일 변경
      // 흐름에서도 동일하게 동작하는지만 확인하고, 이후 검증 흐름은 DB에 인증 레코드를 직접 시딩해 진행한다.
      const sendRes = await request.post('/api/members/me/email/send-code', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { email: newEmail },
      });
      expect(sendRes.status()).toBe(500);
      const sendBody = await sendRes.json();
      expect(sendBody.code).toBe('MAIL_SEND_FAIL');

      const future = new Date(Date.now() + 5 * 60 * 1000);
      const code = '123456';
      await insertEmailVerification(session.memberId, newEmail, code, future, false, 'PROFILE_EMAIL_UPDATE');

      const verifyRes = await request.post('/api/members/me/email/verify-code', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { email: newEmail, code },
      });
      expect(verifyRes.status()).toBe(200);
      const verifyBody = await verifyRes.json();
      expect(verifyBody.success).toBe(true);

      const updateRes = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: session.nickname, email: newEmail },
      });
      expect(updateRes.status()).toBe(200);
      const updateBody = await updateRes.json();
      expect(updateBody.success).toBe(true);

      const member = await getMemberByEmail(newEmail);
      expect(member).toBeTruthy();
      expect(member.member_id).toBe(session.memberId);
    } finally {
      await cleanup(newEmail, session.memberId, session.jti);
    }
  });

  test('이미 다른 회원이 사용 중인 이메일로 인증 요청하면 409 DUPLICATE_EMAIL', async ({ request }) => {
    const emailA = uniqueEmail('emaildupa');
    const emailB = uniqueEmail('emaildupb');
    const a = await signUpAndLogin(request, emailA);
    const b = await signUpAndLogin(request, emailB);
    try {
      const res = await request.post('/api/members/me/email/send-code', {
        headers: { Authorization: `Bearer ${a.accessToken}` },
        data: { email: emailB },
      });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('DUPLICATE_EMAIL');
    } finally {
      await cleanup(emailA, a.memberId, a.jti);
      await cleanup(emailB, b.memberId, b.jti);
    }
  });
});

test.describe('001-05 회원정보수정 - 전화번호 변경 (인증 플로우)', () => {
  test('인증 없이 전화번호만 바꿔서 저장하면 400 PHONE_NOT_VERIFIED', async ({ request }) => {
    const email = uniqueEmail('phonenover');
    const session = await signUpAndLogin(request, email);
    try {
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: session.nickname, phone: randomPhone() },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('PHONE_NOT_VERIFIED');
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('전화번호 인증(PROFILE_PHONE_UPDATE)을 완료 상태로 시딩하면 전화번호 변경이 저장된다', async ({ request }) => {
    const email = uniqueEmail('phoneok');
    const session = await signUpAndLogin(request, email);
    const newPhone = randomPhone();
    try {
      await insertPhoneVerification(session.memberId, newPhone, 'PROFILE_PHONE_UPDATE', true);

      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: session.nickname, phone: newPhone },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });
});

test.describe('001-05 회원정보수정 - 비밀번호 변경', () => {
  test('비밀번호와 비밀번호확인이 다르면 400 PASSWORD_CONFIRM_MISMATCH', async ({ request }) => {
    const email = uniqueEmail('pwmismatch');
    const session = await signUpAndLogin(request, email);
    try {
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: session.nickname, password: NEW_PASSWORD, passwordConfirm: 'Different1!' },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('PASSWORD_CONFIRM_MISMATCH');
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('비밀번호 변경 성공 후, 이전 비밀번호로는 로그인이 실패하고 새 비밀번호로는 성공한다', async ({ request }) => {
    const email = uniqueEmail('pwchange');
    const session = await signUpAndLogin(request, email);
    try {
      const res = await request.patch('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { nickname: session.nickname, password: NEW_PASSWORD, passwordConfirm: NEW_PASSWORD },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const oldLoginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(oldLoginRes.status()).toBe(401);
      const oldLoginBody = await oldLoginRes.json();
      expect(oldLoginBody.code).toBe('INVALID_CREDENTIALS');

      const newLoginRes = await request.post('/api/members/login', {
        data: { email, password: NEW_PASSWORD },
      });
      expect(newLoginRes.status()).toBe(200);
      const newLoginBody = await newLoginRes.json();
      expect(newLoginBody.success).toBe(true);
      await cleanupAccessKey(decodeJwtPayload(newLoginBody.accessToken).jti);
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });
});

test.describe('001-05 회원 탈퇴 (DELETE /api/members/me)', () => {
  test('Authorization 헤더가 없으면 401 NOT_LOGGED_IN', async ({ request }) => {
    const res = await request.delete('/api/members/me', {
      data: { password: VALID_PASSWORD },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('NOT_LOGGED_IN');
  });

  test('비밀번호가 일치하지 않으면 401 INVALID_CREDENTIALS이고 탈퇴되지 않는다', async ({ request }) => {
    const email = uniqueEmail('withdrawwrongpw');
    const session = await signUpAndLogin(request, email);
    try {
      const res = await request.delete('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { password: 'WrongPassword1!' },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.code).toBe('INVALID_CREDENTIALS');

      const member = await getMemberByEmail(email);
      expect(member.status).toBe('ACTIVE');
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });

  test('정상 탈퇴하면 200 성공하고 DB status/withdrawn_at이 갱신되며 Redis 세션이 모두 삭제된다', async ({ request }) => {
    const email = uniqueEmail('withdrawok');
    const session = await signUpAndLogin(request, email);
    try {
      const res = await request.delete('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { password: VALID_PASSWORD },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      const member = await getMemberByEmail(email);
      expect(member.status).toBe('WITHDRAWN');
      expect(member.withdrawn_at).not.toBeNull();

      expect(await getRefreshToken(session.memberId)).toBeNull();
      expect(await isAccessTokenActive(session.jti)).toBe(false);
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('탈퇴 직후 같은 accessToken으로 다른 보호된 API를 호출하면 401 NOT_LOGGED_IN (세션 무효화 확인)', async ({ request }) => {
    const email = uniqueEmail('withdrawtoken');
    const session = await signUpAndLogin(request, email);
    try {
      const withdrawRes = await request.delete('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { password: VALID_PASSWORD },
      });
      expect(withdrawRes.status()).toBe(200);

      const meRes = await request.get('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(meRes.status()).toBe(401);
      const meBody = await meRes.json();
      expect(meBody.code).toBe('NOT_LOGGED_IN');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('탈퇴한 계정은 이후 재로그인 시도 시 403 ACCOUNT_WITHDRAWN', async ({ request }) => {
    const email = uniqueEmail('withdrawrelogin');
    const session = await signUpAndLogin(request, email);
    try {
      const withdrawRes = await request.delete('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { password: VALID_PASSWORD },
      });
      expect(withdrawRes.status()).toBe(200);

      const loginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(loginRes.status()).toBe(403);
      const loginBody = await loginRes.json();
      expect(loginBody.code).toBe('ACCOUNT_WITHDRAWN');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('이미 탈퇴 처리된 계정으로(세션은 아직 유효한 상태에서) 다시 탈퇴를 시도하면 403 ACCOUNT_WITHDRAWN', async ({ request }) => {
    const email = uniqueEmail('withdrawtwice');
    const session = await signUpAndLogin(request, email);
    try {
      // 로그인 자체는 WITHDRAWN 상태를 막지만, 이미 발급된 accessToken의 Redis 세션은
      // 별도로 무효화되지 않는 한 계속 유효하다 - 그 사이에 상태만 WITHDRAWN으로 바뀐 상황을 재현.
      await setMemberStatus(email, 'WITHDRAWN');

      const res = await request.delete('/api/members/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        data: { password: VALID_PASSWORD },
      });
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.code).toBe('ACCOUNT_WITHDRAWN');
    } finally {
      await cleanup(email, session.memberId, session.jti);
    }
  });
});
