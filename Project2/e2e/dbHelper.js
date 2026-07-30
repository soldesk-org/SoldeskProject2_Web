const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

function parseJdbcUrl(url) {
  // jdbc:mariadb://host:port/dbname
  const match = url.match(/jdbc:mariadb:\/\/([^:/]+):(\d+)\/([^?]+)/);
  if (!match) throw new Error('Cannot parse DB_URL: ' + url);
  return { host: match[1], port: Number(match[2]), database: match[3] };
}

function getConnectionConfig() {
  const { host, port, database } = parseJdbcUrl(process.env.DB_URL);
  return {
    host,
    port,
    database,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  };
}

async function getConnection() {
  return mysql.createConnection(getConnectionConfig());
}

async function insertPendingMember(email, nickname) {
  const conn = await getConnection();
  try {
    const [result] = await conn.execute(
      `INSERT INTO members (email, nickname, status, role, created_at, updated_at)
       VALUES (?, ?, 'ACTIVE', 'USER', NOW(), NOW())`,
      [email, nickname || `PENDING_${Date.now()}`]
    );
    return result.insertId;
  } finally {
    await conn.end();
  }
}

async function insertEmailVerification(memberId, email, code, expiredAt, verified = false, purpose = 'SIGNUP') {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO email_verifications (member_id, email, verification_code, purpose, is_verified, expired_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [memberId, email, code, purpose, verified ? 1 : 0, expiredAt]
    );
  } finally {
    await conn.end();
  }
}

// 실제 SMS 발송(뿌리오) 없이, 회원가입 최종 단계의 PHONE_NOT_VERIFIED 게이트를 통과시키기 위해
// phone_verifications row를 직접 시딩한다. email_verifications를 DB로 직접 시딩하는 것과 같은 패턴.
async function insertPhoneVerification(memberId, phone, purpose, verified = true) {
  const conn = await getConnection();
  try {
    const future = new Date(Date.now() + 5 * 60 * 1000);
    await conn.execute(
      `INSERT INTO phone_verifications (member_id, phone, verification_code, purpose, is_verified, expired_at, verified_at, created_at)
       VALUES (?, ?, '000000', ?, ?, ?, ?, NOW())`,
      [memberId, phone, purpose, verified ? 1 : 0, future, verified ? new Date() : null]
    );
  } finally {
    await conn.end();
  }
}

async function deleteMemberByEmail(email) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute('SELECT member_id FROM members WHERE email = ?', [email]);
    for (const row of rows) {
      const memberId = row.member_id;
      await conn.execute('DELETE FROM member_credentials WHERE member_id = ?', [memberId]);
      await conn.execute('DELETE FROM email_verifications WHERE member_id = ?', [memberId]);
      await conn.execute('DELETE FROM phone_verifications WHERE member_id = ?', [memberId]);
      await conn.execute('DELETE FROM social_accounts WHERE member_id = ?', [memberId]);
      await conn.execute('DELETE FROM members WHERE member_id = ?', [memberId]);
    }
  } finally {
    await conn.end();
  }
}

// 소셜로그인 테스트(001-05(소셜로그인))용: 실제 OAuth 동의화면을 자동화할 수 없어(001-03 3장),
// "이미 연동된 소셜 계정" 상태를 DB에 직접 시딩해 재로그인/연동해제 등 콜백 이후 로직만 검증한다.
async function insertSocialAccount(memberId, provider, providerUserId, accessToken = null) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `INSERT INTO social_accounts (member_id, provider, provider_user_id, access_token, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [memberId, provider, providerUserId, accessToken]
    );
  } finally {
    await conn.end();
  }
}

async function setMemberStatus(email, status) {
  const conn = await getConnection();
  try {
    await conn.execute('UPDATE members SET status = ? WHERE email = ?', [status, email]);
  } finally {
    await conn.end();
  }
}

async function getMemberByEmail(email) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM members WHERE email = ?', [email]);
    return rows[0];
  } finally {
    await conn.end();
  }
}

async function getCredentialByEmail(email) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT mc.* FROM member_credentials mc JOIN members m ON mc.member_id = m.member_id WHERE m.email = ?`,
      [email]
    );
    return rows[0];
  } finally {
    await conn.end();
  }
}

module.exports = {
  getConnection,
  insertPendingMember,
  insertEmailVerification,
  insertPhoneVerification,
  insertSocialAccount,
  deleteMemberByEmail,
  setMemberStatus,
  getCredentialByEmail,
  getMemberByEmail,
};
