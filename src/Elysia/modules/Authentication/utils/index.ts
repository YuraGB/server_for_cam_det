import { createHmac } from "crypto";
import { AUTH_JWT_AUDIENCE, AUTH_JWT_ISSUER, AUTH_JWT_SECRET } from "@/constants";
import type { AuthClaims, AuthContext, AuthResult } from "@/types";
import { upsertShadowUser } from "../../ShallowUser/service";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeBase64UrlBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function signHs256(unsignedToken: string, secret: string): Uint8Array {
  return createHmac("sha256", secret).update(unsignedToken, "utf8").digest();
}

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return null;

  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

function extractQueryToken(request: Request): string | null {
  const url = new URL(request.url);
  const token = url.searchParams.get("access_token");
  return token?.trim() || null;
}

function toAuthContext(claims: AuthClaims): AuthContext {
  const roles = Array.isArray(claims.roles)
    ? claims.roles.filter((role): role is string => typeof role === "string" && role.length > 0)
    : claims.role
      ? [claims.role]
      : [];

  const permissions = Array.isArray(claims.permissions)
    ? claims.permissions.filter((permission): permission is string => typeof permission === "string" && permission.length > 0)
    : [];

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    role: typeof claims.role === "string" ? claims.role : roles[0],
    roles,
    permissions,
    claims,
  };
}

function validateClaims(claims: unknown): AuthResult {
  if (!claims || typeof claims !== "object") {
    return { ok: false, status: 401, code: "INVALID_CLAIMS", message: "JWT claims payload is invalid." };
  }

  const typedClaims = claims as Partial<AuthClaims>;
  if (typeof typedClaims.sub !== "string" || typedClaims.sub.length === 0) {
    return { ok: false, status: 401, code: "INVALID_SUBJECT", message: "JWT subject is missing." };
  }

  if (typedClaims.iss !== AUTH_JWT_ISSUER) {
    return { ok: false, status: 401, code: "INVALID_ISSUER", message: "JWT issuer is not allowed." };
  }

  const audiences = Array.isArray(typedClaims.aud) ? typedClaims.aud : [typedClaims.aud];
  if (!audiences.includes(AUTH_JWT_AUDIENCE)) {
    return { ok: false, status: 401, code: "INVALID_AUDIENCE", message: "JWT audience is not allowed." };
  }

  if (typeof typedClaims.exp !== "number") {
    return { ok: false, status: 401, code: "INVALID_EXP", message: "JWT expiration is missing." };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typedClaims.exp <= now) {
    return { ok: false, status: 401, code: "TOKEN_EXPIRED", message: "JWT token is expired." };
  }

  return { ok: true, auth: toAuthContext(typedClaims as AuthClaims) };
}

async function verifyJwt(token: string): Promise<AuthResult> {
  if (!AUTH_JWT_SECRET) {
    return { ok: false, status: 500, code: "AUTH_NOT_CONFIGURED", message: "AUTH_JWT_SECRET is not configured." };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, status: 401, code: "INVALID_TOKEN_FORMAT", message: "JWT token format is invalid." };
  }

  const encodedHeader = parts[0];
  const encodedPayload = parts[1];
  const encodedSignature = parts[2];
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return { ok: false, status: 401, code: "INVALID_TOKEN_FORMAT", message: "JWT token format is invalid." };
  }

  let header: unknown;
  let payload: unknown;

  try {
    header = JSON.parse(decodeBase64Url(encodedHeader));
    payload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    return { ok: false, status: 401, code: "INVALID_TOKEN_ENCODING", message: "JWT token payload cannot be decoded." };
  }

  const typedHeader = header as { alg?: string; typ?: string };
  if (typedHeader.alg !== "HS256") {
    return { ok: false, status: 401, code: "INVALID_ALGORITHM", message: "Only HS256 JWT is supported." };
  }

  const expectedSignature = signHs256(`${encodedHeader}.${encodedPayload}`, AUTH_JWT_SECRET);
  const actualSignature = decodeBase64UrlBytes(encodedSignature);
  if (!timingSafeEqual(expectedSignature, actualSignature)) {
    return { ok: false, status: 401, code: "INVALID_SIGNATURE", message: "JWT signature is invalid." };
  }

  return validateClaims(payload);
}



export { extractBearerToken, extractQueryToken, verifyJwt, toAuthContext, upsertShadowUser , timingSafeEqual, decodeBase64Url, decodeBase64UrlBytes, signHs256 };
