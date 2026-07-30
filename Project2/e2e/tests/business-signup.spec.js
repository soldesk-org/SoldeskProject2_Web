const { test, expect, request: pwRequest } = require('@playwright/test');
const {
  insertPendingMember,
  insertEmailVerification,
  insertPhoneVerification,
  deleteMemberByEmail,
} = require('../dbHelper');

// playwright.config.ts는 모든 요청에 Content-Type: application/json을 강제로 붙이는데(extraHTTPHeaders),
// 이 헤더가 이미 지정되어 있으면 Playwright가 multipart 요청의 boundary를 자동으로 못 붙여줘서
// 서버가 "Content-Type 'application/json' is not supported"로 거부한다. 이 파일의 테스트는 전부
// multipart/form-data 요청이라, extraHTTPHeaders 없는 별도 APIRequestContext를 직접 만들어 사용한다
// (기본 request 픽스처를 재사용하지 않음 - fixture 재정의로는 baseURL/헤더 병합 순서상 해결되지 않았음).
let api;

test.beforeAll(async () => {
  api = await pwRequest.newContext({
    baseURL: process.env.API_BASE_URL || 'http://localhost:8081',
    extraHTTPHeaders: {},
  });
});

test.afterAll(async () => {
  await api.dispose();
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

const dummyLicenseFile = {
  name: 'business-license.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('dummy pdf content for gating tests, not a real business license'),
};

function businessSignUpForm(overrides = {}) {
  return {
    email: overrides.email ?? uniqueEmail('biz'),
    password: overrides.password ?? VALID_PASSWORD,
    passwordConfirm: overrides.passwordConfirm ?? VALID_PASSWORD,
    nickname: overrides.nickname ?? randomNickname('biz'),
    phone: overrides.phone ?? randomPhone(),
    businessLicenseFile: overrides.businessLicenseFile ?? dummyLicenseFile,
  };
}

// 001-02(회원가입) 13장 설계대로, 사업자 회원가입은 실제 OCR/원본확인/진위확인을 수행하는
// Python(FastAPI, receipt-biz-verify) 서버 호출까지 도달해야 성공(200)할 수 있다.
// 이 서버는 이번 테스트 환경에 기동되어 있지 않으므로(요구사항: 실제 SMS/OCR 연동은 테스트하지 않음),
// 여기서는 그 호출 "직전까지"의 게이트(입력값/비밀번호 확인/이메일·전화번호 인증)만 검증하고,
// 마지막 케이스에서는 Python 서버 미기동 시 BUSINESS_VERIFY_SERVICE_UNAVAILABLE로 안전하게
// 처리되는지까지만 확인한다(진위확인 로직 자체는 검증 범위 밖).
test.describe('001-02 사업자 회원가입 (POST /api/members/signup/business)', () => {
  test('사업자등록증명원 파일이 없으면 400 (필수 파라미터 누락)', async () => {
    const form = businessSignUpForm();
    delete form.businessLicenseFile;
    const res = await api.post('/api/members/signup/business', { multipart: form });
    expect(res.status()).toBe(400);
  });

  test('입력값 형식이 올바르지 않으면 400 INVALID_INPUT (비밀번호 규칙 위반)', async () => {
    const res = await api.post('/api/members/signup/business', {
      multipart: businessSignUpForm({ password: 'short', passwordConfirm: 'short' }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_INPUT');
  });

  test('비밀번호와 비밀번호 확인이 다르면 400 PASSWORD_CONFIRM_MISMATCH', async () => {
    const res = await api.post('/api/members/signup/business', {
      multipart: businessSignUpForm({ passwordConfirm: 'Different1!' }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('PASSWORD_CONFIRM_MISMATCH');
  });

  test('인증 이력이 없는 이메일로 가입 요청 시 400 EMAIL_NOT_FOUND', async () => {
    const res = await api.post('/api/members/signup/business', {
      multipart: businessSignUpForm(),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('EMAIL_NOT_FOUND');
  });

  test('이메일 인증 미완료 상태로 가입 요청 시 400 EMAIL_NOT_VERIFIED', async () => {
    const email = uniqueEmail('bizemailnv');
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '444444', future, false); // 인증 미완료

    try {
      const res = await api.post('/api/members/signup/business', {
        multipart: businessSignUpForm({ email }),
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('EMAIL_NOT_VERIFIED');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('전화번호 인증 미완료 상태로 가입 요청 시 400 PHONE_NOT_VERIFIED', async () => {
    const email = uniqueEmail('bizphonenv');
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '555555', future, true); // 이메일 인증만 완료

    try {
      const res = await api.post('/api/members/signup/business', {
        multipart: businessSignUpForm({ email }),
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.code).toBe('PHONE_NOT_VERIFIED');
    } finally {
      await deleteMemberByEmail(email);
    }
  });

  test('닉네임 중복 시 409 DUPLICATE_NICKNAME (사업자 인증 서버 호출 이전에 걸러짐)', async () => {
    const dupNickname = randomNickname('bizk');
    const existingEmail = uniqueEmail('bizowner');
    await insertPendingMember(existingEmail, dupNickname);

    const email = uniqueEmail('bizdup');
    const phone = randomPhone();
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '666666', future, true);
    await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

    try {
      const res = await api.post('/api/members/signup/business', {
        multipart: businessSignUpForm({ email, nickname: dupNickname, phone }),
      });
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('DUPLICATE_NICKNAME');
    } finally {
      await deleteMemberByEmail(email);
      await deleteMemberByEmail(existingEmail);
    }
  });

  test('이메일/전화번호 인증까지 전부 통과하면 사업자 인증 서버(Python)를 호출하려 시도한다 (서버 미기동 시 500 BUSINESS_VERIFY_SERVICE_UNAVAILABLE)', async () => {
    const email = uniqueEmail('bizverify');
    const phone = randomPhone();
    const memberId = await insertPendingMember(email);
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await insertEmailVerification(memberId, email, '777777', future, true);
    await insertPhoneVerification(memberId, phone, 'SIGNUP', true);

    try {
      const res = await api.post('/api/members/signup/business', {
        multipart: businessSignUpForm({ email, phone }),
      });
      // 이 테스트 환경에는 사업자 인증 Python 서버(receipt-biz-verify)가 기동되어 있지 않으므로,
      // 내부 게이트를 전부 통과한 뒤 서버 호출 단계에서 통신 실패로 처리되는 것까지만 확인한다.
      expect(res.status()).toBe(500);
      const body = await res.json();
      expect(body.code).toBe('BUSINESS_VERIFY_SERVICE_UNAVAILABLE');
    } finally {
      await deleteMemberByEmail(email);
    }
  });
});
