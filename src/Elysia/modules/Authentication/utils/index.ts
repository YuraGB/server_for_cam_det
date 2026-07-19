import { createHmac } from "crypto";
import {
  AUTH_JWT_AUDIENCE,
  AUTH_JWT_ISSUER,
  AUTH_JWT_SECRET,
  SERVICE_JWT_ISSUERS,
} from "@/constants";
import type { AuthClaims, AuthContext, AuthResult } from "@/types";
import { upsertShadowUser } from "../../Routes/User/Services";
import { jwtVerify } from "jose";
import { getJWKS, isAllowedOrigin } from "@/Elysia/utils";

const unauthorized = (code: string, message: string): AuthResult => ({
  ok: false,
  status: 401,
  code,
  message,
});

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0),
        ),
      ]
    : [];

function decodeBase64UrlToBuffer(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");

  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
}

function decodeBase64Url(value: string): string {
  return decodeBase64UrlToBuffer(value).toString("utf8");
}

function decodeBase64UrlBytes(value: string): Uint8Array {
  return decodeBase64UrlToBuffer(value);
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
  const token =
    url.searchParams.get("token") ?? url.searchParams.get("access_token");
  return token?.trim() || null;
}

function toAuthContext(claims: AuthClaims): AuthContext {
  const role = typeof claims.role === "string" ? claims.role.trim() : "";
  const roles = getStringArray(claims.roles);
  const normalizedRoles =
    role.length > 0 ? [...new Set([role, ...roles])] : roles;

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    role: role || normalizedRoles[0],
    roles: normalizedRoles,
    permissions: getStringArray(claims.permissions),
    claims,
  };
}

function validateClaims(claims: unknown, allowedIssuers: string[]): AuthResult {
  if (!claims || typeof claims !== "object") {
    return unauthorized("INVALID_CLAIMS", "JWT claims payload is invalid.");
  }

  const typedClaims = claims as Partial<AuthClaims>;
  if (typeof typedClaims.sub !== "string" || typedClaims.sub.length === 0) {
    return unauthorized("INVALID_SUBJECT", "JWT subject is missing.");
  }

  if (!typedClaims.iss || !allowedIssuers.includes(typedClaims.iss)) {
    return unauthorized("INVALID_ISSUER", "JWT issuer is not allowed.");
  }

  const audiences = getStringArray(
    Array.isArray(typedClaims.aud) ? typedClaims.aud : [typedClaims.aud],
  );
  const hasAllowedAudience = audiences.some(
    (audience) => audience === AUTH_JWT_AUDIENCE || isAllowedOrigin(audience),
  );

  if (!hasAllowedAudience) {
    return unauthorized("INVALID_AUDIENCE", "JWT audience is not allowed.");
  }

  if (typeof typedClaims.exp !== "number") {
    return unauthorized("INVALID_EXP", "JWT expiration is missing.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typedClaims.exp <= now) {
    return unauthorized("TOKEN_EXPIRED", "JWT token is expired.");
  }

  return { ok: true, auth: toAuthContext(typedClaims as AuthClaims) };
}

function verifyHs256Jwt(token: string): AuthResult {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return unauthorized("INVALID_TOKEN", "JWT token format is invalid.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return unauthorized("INVALID_TOKEN", "JWT token format is invalid.");
  }

  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(decodeBase64Url(encodedHeader));
    payload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    return unauthorized("INVALID_TOKEN", "JWT token payload is invalid.");
  }

  if (
    !header ||
    typeof header !== "object" ||
    (header as { alg?: unknown }).alg !== "HS256"
  ) {
    return unauthorized("INVALID_TOKEN", "JWT algorithm is not allowed.");
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", AUTH_JWT_SECRET)
    .update(unsignedToken)
    .digest();
  const signature = decodeBase64UrlBytes(encodedSignature);
  if (!timingSafeEqual(signature, expectedSignature)) {
    return unauthorized("INVALID_TOKEN", "JWT signature is invalid.");
  }
  return validateClaims(payload, SERVICE_JWT_ISSUERS);
}

function getBetterAuthOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(origin)) return origin;

  const authOrigin = request.headers.get("x-auth-origin");
  if (!origin && authOrigin && isAllowedOrigin(authOrigin)) return authOrigin;

  return null;
}

async function verifyBetterAuthJwt(
  token: string,
  request: Request,
): Promise<AuthResult> {
  const origin = getBetterAuthOrigin(request);
  if (!origin) {
    return unauthorized("INVALID_ORIGIN", "JWT origin is not allowed.");
  }

  const isRuntimeToken = !request.headers.get("origin");
  const issuer = isRuntimeToken ? origin : AUTH_JWT_ISSUER;
  const audience = isRuntimeToken ? origin : AUTH_JWT_AUDIENCE;
  const allowedJWTIssuers = isRuntimeToken
    ? [AUTH_JWT_ISSUER, origin]
    : [AUTH_JWT_ISSUER];
  const JWKS = getJWKS(new URL(origin).origin);

  const { payload } = await jwtVerify(token, JWKS, {
    issuer,
    audience,
  });
  return validateClaims(payload, allowedJWTIssuers);
}

async function verifyJwt(token: string, request: Request): Promise<AuthResult> {
  const serviceResult = verifyHs256Jwt(token);
  if (serviceResult.ok) return serviceResult;

  try {
    return await verifyBetterAuthJwt(token, request);
  } catch {
    return unauthorized("INVALID_TOKEN", "JWT verification failed");
  }
}

export { extractBearerToken, extractQueryToken, verifyJwt, upsertShadowUser };
