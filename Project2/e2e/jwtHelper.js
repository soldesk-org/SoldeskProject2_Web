const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const crypto = require('crypto');

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// JwtProvider.generateAccessToken()과 동일한 HS256 서명 방식으로 accessToken을 직접 만든다.
// 소셜로그인은 실제 플랫폼 동의화면을 자동화할 수 없어(001-03 3장), 로그인 이후 로직(회원정보수정
// 비밀번호 변경 가드, 연동 해제 등)을 검증하려면 이미 로그인된 것처럼 유효한 토큰이 필요하다.
function mintAccessToken(memberId, email, role = 'USER') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const jti = crypto.randomUUID();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    jti,
    sub: String(memberId),
    email,
    role,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = crypto
    .createHmac('sha256', Buffer.from(process.env.JWT_SECRET, 'utf8'))
    .update(signingInput)
    .digest();
  return { token: `${signingInput}.${base64url(signature)}`, jti };
}

module.exports = { mintAccessToken };
