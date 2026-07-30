const { test, expect } = require('@playwright/test');
const {
  insertPendingMember,
  insertEmailVerification,
  insertPhoneVerification,
  deleteMemberByEmail,
  setMemberStatus,
} = require('../dbHelper');
const {
  seedPasswordResetToken,
  getPasswordResetTokenMemberId,
  cleanupPasswordResetToken,
  closeRedis,
} = require('../redisHelper');

test.afterAll(async () => {
  await closeRedis();
});

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
}

function randomNickname(prefix) {
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${suffix}`.slice(0, 10);
}

function randomPhone() {
  const n1 = String(Math.floor(1000 + Math.random() * 9000));
  const n2 = String(Math.floor(1000 + Math.random() * 9000));
  return `010-${n1}-${n2}`;
}

const VALID_PASSWORD = 'P@ssw0rd1';
const NEW_PASSWORD = 'N3wP@ssw0rd!';

async function signUpVerifiedMember({ email, nickname, phone }) {
  const memberId = await insertPendingMember(email);
  const future = new Date(Date.now() + 5 * 60 * 1000);
  await insertEmailVerification(memberId, email, '135791', future, true);
  // 회원가입에 전화번호 SMS 인증 게이트가 추가되어(PHONE_NOT_VERIFIED), 실제 SMS 발송 없이
  // 인증 완료 상태를 직접 시딩한다 (email_verifications를 DB로 직접 시딩하는 것과 같은 이유/패턴).
  await insertPhoneVerification(memberId, phone, 'SIGNUP', true);
  return memberId;
}

test.describe('001-02 이메일 찾기 (POST /api/members/find-email)', () => {
  test('닉네임 형식이 올바르지 않으면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.post('/api/members/find-email', {
      data: { nickname: '!!', phone: randomPhone() },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('전화번호 형식이 올바르지 않으면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.post('/api/members/find-email', {
      data: { nickname: randomNickname('fe'), phone: '01012345678' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('일치하는 회원이 없으면 400 MEMBER_NOT_FOUND', async ({ request }) => {
    const res = await request.post('/api/members/find-email', {
      data: { nickname: randomNickname('nomatch'), phone: randomPhone() },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MEMBER_NOT_FOUND');
  });

  test('닉네임은 일치하지만 전화번호가 다르면 400 MEMBER_NOT_FOUND (부분 일치 비노출)', async ({ request }) => {
    const email = uniqueEmail('femismatch');
    const nickname = randomNickname('fem');
    const phone = randomPhone();
    await signUpVerifiedMember({ email, nickname, phone });

    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);

      const res = await request.post('/api/members/find-email', {
        data: { nickname, phone: randomPhone() },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('MEMBER_NOT_FOUND');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('닉네임+전화번호가 모두 일치하면 200과 마스킹된 이메일 반환', async ({ request }) => {
    const email = uniqueEmail('femaskok');
    const nickname = randomNickname('feok');
    const phone = randomPhone();
    await signUpVerifiedMember({ email, nickname, phone });

    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);

      const res = await request.post('/api/members/find-email', {
        data: { nickname, phone },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // 마스킹된 이메일이 원본 이메일 문자열을 그대로 포함해서는 안 되고, 정해진 마스킹 형식(로컬 2자***@도메인 2자****.tld)을 따라야 한다.
      expect(body.maskedEmail).not.toBe(email);
      expect(body.maskedEmail).toMatch(/^.{1,2}\*\*\*@.{1,2}\*\*\*\*\.[a-zA-Z]+$/);
      expect(body.maskedEmail.startsWith(email.slice(0, 2))).toBe(true);
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('탈퇴(WITHDRAWN) 회원은 조회 대상에서 제외되어 400 MEMBER_NOT_FOUND', async ({ request }) => {
    const email = uniqueEmail('fewithdrawn');
    const nickname = randomNickname('fewd');
    const phone = randomPhone();
    await signUpVerifiedMember({ email, nickname, phone });

    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);

      await setMemberStatus(email, 'WITHDRAWN');

      const res = await request.post('/api/members/find-email', {
        data: { nickname, phone },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('MEMBER_NOT_FOUND');
    } finally {
      await deleteMemberByEmail(email);
    }
  });
});

test.describe('001-02 비밀번호 찾기 - 재설정 요청 (POST /api/members/password-reset/request)', () => {
  test('이메일 형식이 올바르지 않으면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.post('/api/members/password-reset/request', {
      data: { email: 'not-an-email' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('존재하지 않는 이메일이어도 200과 동일한 성공 메시지 (계정 존재 여부 비노출)', async ({ request }) => {
    const res = await request.post('/api/members/password-reset/request', {
      data: { email: uniqueEmail('prnotexist') },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('입력하신 이메일로 비밀번호 재설정 안내를 보냈습니다.');
  });

  test('가입 미완료(인증만 되고 최종가입 안 함) 이메일이어도 동일한 200 성공 응답', async ({ request }) => {
    const email = uniqueEmail('prpending');
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '246810', future, true);

    try {
      const res = await request.post('/api/members/password-reset/request', {
        data: { email },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('입력하신 이메일로 비밀번호 재설정 안내를 보냈습니다.');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('가입 완료된 이메일은 메일 발송이 실패해도(테스트용 @example.com 주소라 반송됨) 동일한 200 성공 응답', async ({ request }) => {
    const email = uniqueEmail('prok');
    const nickname = randomNickname('prok');
    const phone = randomPhone();
    await signUpVerifiedMember({ email, nickname, phone });

    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);

      const res = await request.post('/api/members/password-reset/request', {
        data: { email },
      });
      // 메일 발송이 실패해도(계정 존재 여부가 HTTP 상태코드로 노출되지 않도록) 응답은 동일해야 한다.
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('입력하신 이메일로 비밀번호 재설정 안내를 보냈습니다.');
    } finally {
      await deleteMemberByEmail(email);
    }
  });
});

test.describe('001-02 비밀번호 찾기 - 재설정 확정 (POST /api/members/password-reset/confirm)', () => {
  test('존재하지 않는(위조된) 토큰이면 400 INVALID_RESET_TOKEN', async ({ request }) => {
    const res = await request.post('/api/members/password-reset/confirm', {
      data: { token: 'not-a-real-token', newPassword: NEW_PASSWORD, newPasswordConfirm: NEW_PASSWORD },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_RESET_TOKEN');
  });

  test('새 비밀번호와 확인이 다르면 400 PASSWORD_CONFIRM_MISMATCH', async ({ request }) => {
    const res = await request.post('/api/members/password-reset/confirm', {
      data: { token: 'irrelevant-token', newPassword: NEW_PASSWORD, newPasswordConfirm: 'Different1!' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('PASSWORD_CONFIRM_MISMATCH');
  });

  test('새 비밀번호가 정책(8~20자, 영문/숫자/특수문자)에 맞지 않으면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.post('/api/members/password-reset/confirm', {
      data: { token: 'irrelevant-token', newPassword: 'short', newPasswordConfirm: 'short' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('정상 토큰으로 재설정하면 200 성공 + 새 비밀번호로 로그인 가능, 기존 비밀번호는 실패', async ({ request }) => {
    const email = uniqueEmail('prconfirm');
    const nickname = randomNickname('prc');
    const phone = randomPhone();
    await signUpVerifiedMember({ email, nickname, phone });
    const rawToken = `test-reset-token-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);
      const memberId = (await signUpRes.json()).memberId;

      // 실제 메일 발송 없이, PasswordResetTokenService가 저장하는 것과 동일한 형태로 토큰을 직접 심어
      // confirm 엔드포인트의 로직만 독립적으로 검증한다.
      await seedPasswordResetToken(rawToken, memberId);

      const confirmRes = await request.post('/api/members/password-reset/confirm', {
        data: { token: rawToken, newPassword: NEW_PASSWORD, newPasswordConfirm: NEW_PASSWORD },
      });
      expect(confirmRes.status()).toBe(200);
      const confirmBody = await confirmRes.json();
      expect(confirmBody.success).toBe(true);

      // 1회용 토큰이므로 사용 후 Redis에서 삭제되어야 한다.
      const remaining = await getPasswordResetTokenMemberId(rawToken);
      expect(remaining).toBeNull();

      // 새 비밀번호로 로그인 성공
      const loginNewRes = await request.post('/api/members/login', {
        data: { email, password: NEW_PASSWORD },
      });
      expect(loginNewRes.status()).toBe(200);

      // 기존 비밀번호로는 더 이상 로그인 불가
      const loginOldRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(loginOldRes.status()).toBe(401);
    } finally {
      await cleanupPasswordResetToken(rawToken);
      await deleteMemberByEmail(email);
    }
  });

  test('사용된 토큰을 재사용하면 두 번째 요청은 400 INVALID_RESET_TOKEN (1회용)', async ({ request }) => {
    const email = uniqueEmail('prreuse');
    const nickname = randomNickname('prre');
    const phone = randomPhone();
    await signUpVerifiedMember({ email, nickname, phone });
    const rawToken = `test-reuse-token-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    try {
      const signUpRes = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(signUpRes.status()).toBe(200);
      const memberId = (await signUpRes.json()).memberId;

      await seedPasswordResetToken(rawToken, memberId);

      const firstRes = await request.post('/api/members/password-reset/confirm', {
        data: { token: rawToken, newPassword: NEW_PASSWORD, newPasswordConfirm: NEW_PASSWORD },
      });
      expect(firstRes.status()).toBe(200);

      const secondRes = await request.post('/api/members/password-reset/confirm', {
        data: { token: rawToken, newPassword: 'AnotherP@ss2', newPasswordConfirm: 'AnotherP@ss2' },
      });
      expect(secondRes.status()).toBe(400);
      const secondBody = await secondRes.json();
      expect(secondBody.code).toBe('INVALID_RESET_TOKEN');
    } finally {
      await cleanupPasswordResetToken(rawToken);
      await deleteMemberByEmail(email);
    }
  });
});
