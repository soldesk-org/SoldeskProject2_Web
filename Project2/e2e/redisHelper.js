const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const Redis = require('ioredis');
const crypto = require('crypto');

let client;

function getClient() {
  if (!client) {
    client = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: false,
    });
  }
  return client;
}

function loginFailKey(memberId) {
  return `login:fail:${memberId}`;
}

function loginLockKey(memberId) {
  return `login:lock:${memberId}`;
}

function refreshKey(memberId) {
  return `refresh:${memberId}`;
}

function accessKey(jti) {
  return `access:${jti}`;
}

// PasswordResetTokenService와 동일한 방식(SHA-256 hex)으로 키를 만든다.
function passwordResetKey(rawToken) {
  const hash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
  return `pwreset:${hash}`;
}

// 실제 메일 발송 없이 "발급된 것처럼" 토큰을 직접 심어서 confirm 엔드포인트를 테스트하기 위한 헬퍼.
async function seedPasswordResetToken(rawToken, memberId, ttlSeconds = 3600) {
  await getClient().set(passwordResetKey(rawToken), String(memberId), 'EX', ttlSeconds);
}

async function getPasswordResetTokenMemberId(rawToken) {
  return getClient().get(passwordResetKey(rawToken));
}

async function cleanupPasswordResetToken(rawToken) {
  await getClient().del(passwordResetKey(rawToken));
}

async function getLoginFailCount(memberId) {
  const value = await getClient().get(loginFailKey(memberId));
  return value === null ? 0 : Number(value);
}

async function isLoginLocked(memberId) {
  const exists = await getClient().exists(loginLockKey(memberId));
  return exists === 1;
}

// RefreshTokenService(2026-07-19 로그인 상태 유지 추가)가 Redis에 "{token}:{tier}" 형식으로 저장하므로,
// 순수 토큰 값만 비교하고 싶은 기존 테스트를 위해 tier suffix를 떼고 반환한다.
async function getRefreshToken(memberId) {
  const stored = await getClient().get(refreshKey(memberId));
  if (stored === null) return null;
  const idx = stored.lastIndexOf(':');
  return idx >= 0 ? stored.substring(0, idx) : stored;
}

// 로그인 상태 유지(rememberMe) 테스트용: 저장된 tier(LONG/SHORT)와 남은 TTL(초)을 함께 반환한다.
async function getRefreshTokenTier(memberId) {
  const client = getClient();
  const stored = await client.get(refreshKey(memberId));
  if (stored === null) return null;
  const idx = stored.lastIndexOf(':');
  const tier = idx >= 0 ? stored.substring(idx + 1) : null;
  const ttlSeconds = await client.ttl(refreshKey(memberId));
  return { tier, ttlSeconds };
}

async function isAccessTokenActive(jti) {
  const exists = await getClient().exists(accessKey(jti));
  return exists === 1;
}

// jwtHelper.mintAccessToken()으로 직접 발급한 토큰을 "로그인된 것"처럼 만들기 위해
// AccessTokenSessionService.register()가 하는 것과 동일하게 access:{jti} 키를 심어준다.
async function activateAccessToken(jti, memberId, ttlSeconds = 3600) {
  await getClient().set(accessKey(jti), String(memberId), 'EX', ttlSeconds);
}

async function cleanupMemberKeys(memberId) {
  await getClient().del(loginFailKey(memberId), loginLockKey(memberId), refreshKey(memberId));
}

async function cleanupAccessKey(jti) {
  await getClient().del(accessKey(jti));
}

async function closeRedis() {
  if (client) {
    await client.quit();
    client = undefined;
  }
}

module.exports = {
  getLoginFailCount,
  isLoginLocked,
  getRefreshToken,
  getRefreshTokenTier,
  isAccessTokenActive,
  activateAccessToken,
  cleanupMemberKeys,
  cleanupAccessKey,
  seedPasswordResetToken,
  getPasswordResetTokenMemberId,
  cleanupPasswordResetToken,
  closeRedis,
};
