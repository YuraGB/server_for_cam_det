import { createHmac } from "crypto";
import { AUTH_JWT_AUDIENCE, AUTH_JWT_ISSUER } from "@/constants";
import type { AuthClaims, AuthContext, AuthResult } from "@/types";
import { upsertShadowUser } from "../../ShallowUser/service";
import { jwtVerify } from "jose";
import { getJWKS } from "@/Elysia/utils";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeBase64UrlBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
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
  const token = url.searchParams.get("token");
  return token?.trim() || null;
}

function toAuthContext(claims: AuthClaims): AuthContext {
  const roles = Array.isArray(claims.roles)
    ? claims.roles.filter(
        (role): role is string => typeof role === "string" && role.length > 0,
      )
    : claims.role
      ? [claims.role]
      : [];

  const permissions = Array.isArray(claims.permissions)
    ? claims.permissions.filter(
        (permission): permission is string =>
          typeof permission === "string" && permission.length > 0,
      )
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
    return {
      ok: false,
      status: 401,
      code: "INVALID_CLAIMS",
      message: "JWT claims payload is invalid.",
    };
  }

  const typedClaims = claims as Partial<AuthClaims>;
  if (typeof typedClaims.sub !== "string" || typedClaims.sub.length === 0) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_SUBJECT",
      message: "JWT subject is missing.",
    };
  }

  if (typedClaims.iss !== AUTH_JWT_ISSUER) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_ISSUER",
      message: "JWT issuer is not allowed.",
    };
  }

  const audiences = Array.isArray(typedClaims.aud)
    ? typedClaims.aud
    : [typedClaims.aud];
  console.log(
    !audiences.includes(AUTH_JWT_AUDIENCE),
    typedClaims.aud,
    AUTH_JWT_AUDIENCE,
    AUTH_JWT_ISSUER,
  );
  if (!audiences.includes(AUTH_JWT_AUDIENCE)) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_AUDIENCE",
      message: "JWT audience is not allowed.",
    };
  }

  if (typeof typedClaims.exp !== "number") {
    return {
      ok: false,
      status: 401,
      code: "INVALID_EXP",
      message: "JWT expiration is missing.",
    };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typedClaims.exp <= now) {
    return {
      ok: false,
      status: 401,
      code: "TOKEN_EXPIRED",
      message: "JWT token is expired.",
    };
  }

  return { ok: true, auth: toAuthContext(typedClaims as AuthClaims) };
}

async function verifyJwt(token: string, request: Request): Promise<AuthResult> {
  const originClient = new URL(request.headers.get("origin") || request.url)
    .origin;
  const JWKS = getJWKS(originClient);
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: "better-auth",
      audience: "signaling",
    });

    return validateClaims(payload);
  } catch (err) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_TOKEN",
      message: "JWT verification failed",
    };
  }
}

export {
  extractBearerToken,
  extractQueryToken,
  verifyJwt,
  toAuthContext,
  upsertShadowUser,
  timingSafeEqual,
  decodeBase64Url,
  decodeBase64UrlBytes,
};
