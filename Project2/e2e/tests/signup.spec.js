const { test, expect } = require('@playwright/test');
const {
  insertPendingMember,
  insertEmailVerification,
  insertPhoneVerification,
  deleteMemberByEmail,
  getMemberByEmail,
} = require('../dbHelper');

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
}

const VALID_PASSWORD = 'P@ssw0rd1';
const VALID_PHONE_PREFIX = '010-';

function randomPhone() {
  const n1 = String(Math.floor(1000 + Math.random() * 9000));
  const n2 = String(Math.floor(1000 + Math.random() * 9000));
  return `${VALID_PHONE_PREFIX}${n1}-${n2}`;
}

function randomNickname(prefix) {
  // 닉네임은 2~10자 제한이므로 접두사 + 4자리 난수로 구성한다.
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${suffix}`.slice(0, 10);
}

test.describe('001-02 회원가입 - 이메일 인증번호 발송 (POST /api/mail/send-code)', () => {
  test('이메일 형식이 올바르지 않으면 400 INVALID_INPUT', async ({ request }) => {
    const res = await request.post('/api/mail/send-code', { data: { email: 'not-an-email' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('이미 가입된(존재하는) 이메일이면 409 DUPLICATE_EMAIL', async ({ request }) => {
    const email = uniqueEmail('dup');
    await insertPendingMember(email);
    try {
      const res = await request.post('/api/mail/send-code', { data: { email } });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('DUPLICATE_EMAIL');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('메일 계정 미설정 환경에서는 500 MAIL_SEND_FAIL이 발생하고 트랜잭션이 롤백된다', async ({ request }) => {
    const email = uniqueEmail('mailfail');
    const res = await request.post('/api/mail/send-code', { data: { email } });
    // 이 테스트 환경에는 MAIL_USERNAME/MAIL_APP_PASSWORD가 설정되어 있지 않아 발송이 실패한다.
    expect(res.status()).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('MAIL_SEND_FAIL');

    // 롤백 검증: 재요청해도 DUPLICATE_EMAIL이 아니라 동일하게 재시도 가능해야 한다.
    const res2 = await request.post('/api/mail/send-code', { data: { email } });
    expect(res2.status()).toBe(500);
  });
});

test.describe('001-02 회원가입 - 이메일 인증번호 확인 (POST /api/mail/verify-code)', () => {
  test('발송 이력이 없는 이메일이면 400 EMAIL_NOT_FOUND', async ({ request }) => {
    const res = await request.post('/api/mail/verify-code', {
      data: { email: uniqueEmail('nofound'), code: '123456' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_NOT_FOUND');
  });

  test('인증번호가 만료되었으면 400 EXPIRED_CODE', async ({ request }) => {
    const email = uniqueEmail('expired');
    const memberId = await insertPendingMember(email);
    const past = new Date(Date.now() - 60 * 1000); // 1분 전 만료
    await insertEmailVerification(memberId, email, '111111', past, false);
    try {
      const res = await request.post('/api/mail/verify-code', { data: { email, code: '111111' } });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('EXPIRED_CODE');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('인증번호가 일치하지 않으면 400 INVALID_CODE', async ({ request }) => {
    const email = uniqueEmail('invalidcode');
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '222222', future, false);
    try {
      const res = await request.post('/api/mail/verify-code', { data: { email, code: '999999' } });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('INVALID_CODE');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('올바른 인증번호면 200 성공', async ({ request }) => {
    const email = uniqueEmail('verifyok');
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '333333', future, false);
    try {
      const res = await request.post('/api/mail/verify-code', { data: { email, code: '333333' } });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    } finally {
      await deleteMemberByEmail(email);
    }
  });
});

test.describe('001-02 회원가입 - 회원가입 (POST /api/members/signup)', () => {
  test('입력값 형식이 올바르지 않으면 400 INVALID_INPUT (비밀번호 규칙 위반)', async ({ request }) => {
    const email = uniqueEmail('badpw');
    const res = await request.post('/api/members/signup', {
      data: { email, password: 'short', passwordConfirm: 'short', nickname: '테스터', phone: randomPhone() },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('비밀번호와 비밀번호 확인이 다르면 400 PASSWORD_CONFIRM_MISMATCH', async ({ request }) => {
    const res = await request.post('/api/members/signup', {
      data: {
        email: uniqueEmail('pwmismatch'),
        password: VALID_PASSWORD,
        passwordConfirm: 'Different1!',
        nickname: '테스터',
        phone: randomPhone(),
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('PASSWORD_CONFIRM_MISMATCH');
  });

  test('인증 이력이 없는 이메일로 가입 요청 시 400 EMAIL_NOT_FOUND', async ({ request }) => {
    const res = await request.post('/api/members/signup', {
      data: {
        email: uniqueEmail('signupnofound'),
        password: VALID_PASSWORD,
        passwordConfirm: VALID_PASSWORD,
        nickname: '테스터',
        phone: randomPhone(),
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_NOT_FOUND');
  });

  test('이메일 인증 미완료 상태로 가입 요청 시 400 EMAIL_NOT_VERIFIED', async ({ request }) => {
    const email = uniqueEmail('notverified');
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '444444', future, false); // 인증 미완료
    try {
      const res = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: '테스터', phone: randomPhone() },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('EMAIL_NOT_VERIFIED');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('전화번호 인증 미완료 상태로 가입 요청 시 400 PHONE_NOT_VERIFIED', async ({ request }) => {
    const email = uniqueEmail('phonenotverified');
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '444445', future, true); // 이메일 인증은 완료, 전화번호 인증은 없음
    try {
      const res = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: randomNickname('pnv'), phone: randomPhone() },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('PHONE_NOT_VERIFIED');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('닉네임 중복 시 409 DUPLICATE_NICKNAME', async ({ request }) => {
    const dupNickname = randomNickname('nk');
    const existingEmail = uniqueEmail('nickowner');
    await insertPendingMember(existingEmail, dupNickname);

    const email = uniqueEmail('nickdup');
    const phone = randomPhone();
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '555555', future, true); // 인증 완료 상태로 시딩
    await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

    try {
      const res = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: dupNickname, phone },
      });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('DUPLICATE_NICKNAME');
    } finally {
      await deleteMemberByEmail(email);
      await deleteMemberByEmail(existingEmail);
    }
  });

  test('전체 흐름: 인증 완료된 이메일로 회원가입 성공 (200, memberId 반환)', async ({ request }) => {
    const email = uniqueEmail('signupok');
    const nickname = randomNickname('ok');
    const phone = randomPhone();
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '666666', future, true); // 인증 완료 상태로 시딩
    await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

    try {
      const res = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.memberId).toBe(memberId);

      // 재가입 시도 -> ALREADY_SIGNED_UP (같은 phone을 재사용 — 인증된 전화번호와 다른 값을 보내면 PHONE_NOT_VERIFIED가 먼저 걸림)
      const res2 = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: randomNickname('ok2'), phone },
      });
      expect(res2.status()).toBe(409);
      const body2 = await res2.json();
      expect(body2.code).toBe('ALREADY_SIGNED_UP');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('회원가입 시 전화번호는 AES-256-GCM으로 암호화되어 저장되고 phone_hash가 생성된다 (평문 미저장)', async ({ request }) => {
    const email = uniqueEmail('phonecrypto');
    const nickname = randomNickname('pc');
    const phone = randomPhone();
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '135791', future, true);
    await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

    try {
      const res = await request.post('/api/members/signup', {
        data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone },
      });
      expect(res.status()).toBe(200);

      const row = await getMemberByEmail(email);
      // DB에는 암호문만 저장되어야 하며, 입력한 평문 전화번호 문자열이 그대로 포함되어서는 안 된다.
      expect(row.phone).not.toBe(phone);
      expect(row.phone).not.toContain(phone);
      expect(row.phone_hash).toMatch(/^[0-9a-f]{64}$/);

      // 조회(로그인 등)로 엔티티가 다시 로드될 때 컨버터가 정상적으로 복호화하는지는 로그인 성공 여부로 간접 확인한다.
      const loginRes = await request.post('/api/members/login', {
        data: { email, password: VALID_PASSWORD },
      });
      expect(loginRes.status()).toBe(200);
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('동시에 같은 닉네임으로 가입 요청 시 한 쪽만 성공하고 다른 쪽은 409 DUPLICATE_NICKNAME (500 아님)', async ({ request }) => {
    const nickname = randomNickname('race');
    const emailA = uniqueEmail('nickracea');
    const emailB = uniqueEmail('nickraceb');
    const phoneA = randomPhone();
    const phoneB = randomPhone();
    const memberIdA = await insertPendingMember(emailA);
    const memberIdB = await insertPendingMember(emailB);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberIdA, emailA, '777771', future, true);
    await insertEmailVerification(memberIdB, emailB, '777772', future, true);
    await insertPhoneVerification(memberIdA, phoneA, 'SIGNUP', true);
    await insertPhoneVerification(memberIdB, phoneB, 'SIGNUP', true);

    try {
      // 두 요청 모두 동일한 닉네임으로, 애플리케이션 사전 중복체크(existsByNickname)를 둘 다 통과하도록 동시에 발사한다.
      const [resA, resB] = await Promise.all([
        request.post('/api/members/signup', {
          data: { email: emailA, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone: phoneA },
        }),
        request.post('/api/members/signup', {
          data: { email: emailB, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname, phone: phoneB },
        }),
      ]);

      const statuses = [resA.status(), resB.status()].sort();
      expect(statuses).toEqual([200, 409]);

      const failed = resA.status() === 409 ? resA : resB;
      const failedBody = await failed.json();
      expect(failedBody.code).toBe('DUPLICATE_NICKNAME');
    } finally {
      await deleteMemberByEmail(emailA);
      await deleteMemberByEmail(emailB);
    }
  });

  test('동시에 같은 전화번호로 가입 요청 시 한 쪽만 성공하고 다른 쪽은 409 DUPLICATE_PHONE (500 아님)', async ({ request }) => {
    const phone = randomPhone();
    const emailA = uniqueEmail('phoneracea');
    const emailB = uniqueEmail('phoneraceb');
    const memberIdA = await insertPendingMember(emailA);
    const memberIdB = await insertPendingMember(emailB);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberIdA, emailA, '888881', future, true);
    await insertEmailVerification(memberIdB, emailB, '888882', future, true);
    // 같은 전화번호로 두 회원(A/B) 모두 각자 인증을 완료한 상태를 시딩 (phone_verifications는 회원별 row라 공존 가능)
    await insertPhoneVerification(memberIdA, phone, 'SIGNUP', true);
    await insertPhoneVerification(memberIdB, phone, 'SIGNUP', true);

    try {
      const [resA, resB] = await Promise.all([
        request.post('/api/members/signup', {
          data: { email: emailA, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: randomNickname('pra'), phone },
        }),
        request.post('/api/members/signup', {
          data: { email: emailB, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: randomNickname('prb'), phone },
        }),
      ]);

      const statuses = [resA.status(), resB.status()].sort();
      expect(statuses).toEqual([200, 409]);

      const failed = resA.status() === 409 ? resA : resB;
      const failedBody = await failed.json();
      expect(failedBody.code).toBe('DUPLICATE_PHONE');
    } finally {
      await deleteMemberByEmail(emailA);
      await deleteMemberByEmail(emailB);
    }
  });

  test('같은 이메일로 최종 가입을 동시에 요청하면 한 쪽만 성공하고 다른 쪽은 409 ALREADY_SIGNED_UP (500 아님)', async ({ request }) => {
    const email = uniqueEmail('dupsignup');
    const phone = randomPhone();
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '999991', future, true);
    // 같은 회원(member_id)이 같은 phone으로 동시에 최종가입을 요청하는 시나리오라 인증 시딩도 하나만 있으면 된다.
    await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

    try {
      const [resA, resB] = await Promise.all([
        request.post('/api/members/signup', {
          data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: randomNickname('dua'), phone },
        }),
        request.post('/api/members/signup', {
          data: { email, password: VALID_PASSWORD, passwordConfirm: VALID_PASSWORD, nickname: randomNickname('dub'), phone },
        }),
      ]);

      const statuses = [resA.status(), resB.status()].sort();
      expect(statuses).toEqual([200, 409]);

      const failed = resA.status() === 409 ? resA : resB;
      const failedBody = await failed.json();
      expect(failedBody.code).toBe('ALREADY_SIGNED_UP');
    } finally {
      await deleteMemberByEmail(email);
    }
  });
});
