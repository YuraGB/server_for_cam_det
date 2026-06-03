import { createHmac } from "crypto";
import {
  AUTH_JWT_AUDIENCE,
  AUTH_JWT_ISSUER,
  AUTH_JWT_SECRET,
  SERVICE_JWT_ISSUERS,
} from "@/constants";
import type { AuthClaims, AuthContext, AuthResult } from "@/types";
import { upsertShadowUser } from "../../Routes/User/Service";
import { jwtVerify } from "jose";
import { getJWKS } from "@/Elysia/utils";
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

function validateClaims(claims: unknown, allowedIssuers: string[]): AuthResult {
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

  if (!typedClaims.iss || !allowedIssuers.includes(typedClaims.iss)) {
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

function verifyHs256Jwt(token: string): AuthResult {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_TOKEN",
      message: "JWT token format is invalid.",
    };
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_TOKEN",
      message: "JWT token format is invalid.",
    };
  }

  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(decodeBase64Url(encodedHeader));
    payload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    return {
      ok: false,
      status: 401,
      code: "INVALID_TOKEN",
      message: "JWT token payload is invalid.",
    };
  }

  if (
    !header ||
    typeof header !== "object" ||
    (header as { alg?: unknown }).alg !== "HS256"
  ) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_TOKEN",
      message: "JWT algorithm is not allowed.",
    };
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", AUTH_JWT_SECRET)
    .update(unsignedToken)
    .digest();
  const signature = decodeBase64UrlBytes(encodedSignature);
  if (!timingSafeEqual(signature, expectedSignature)) {
    return {
      ok: false,
      status: 401,
      code: "INVALID_TOKEN",
      message: "JWT signature is invalid.",
    };
  }

  return validateClaims(payload, SERVICE_JWT_ISSUERS);
}

async function verifyBetterAuthJwt(
  token: string,
  request: Request,
): Promise<AuthResult> {
  const originClient = new URL(request.headers.get("origin") || request.url)
    .origin;
  const JWKS = getJWKS(originClient);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: AUTH_JWT_ISSUER,
    audience: AUTH_JWT_AUDIENCE,
  });

  return validateClaims(payload, [AUTH_JWT_ISSUER]);
}

async function verifyJwt(token: string, request: Request): Promise<AuthResult> {
  const serviceResult = verifyHs256Jwt(token);
  if (serviceResult.ok) return serviceResult;

  try {
    return await verifyBetterAuthJwt(token, request);
  } catch {
    return {
      ok: false,
      status: 401,
      code: "INVALID_TOKEN",
      message: "JWT verification failed",
    };
  }
}

export { extractBearerToken, extractQueryToken, verifyJwt, upsertShadowUser };
