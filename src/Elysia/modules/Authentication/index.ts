import type { AuthResult } from "@/types";
import {
  extractBearerToken,
  extractQueryToken,
  upsertShadowUser,
  verifyJwt,
} from "./utils";

/*
    1. Extract token from Authorization header or access_token query parameter
    2. Verify and decode JWT token
    3. Sync user info into local shadow_users table    
*/
async function authenticateRequest(request: Request): Promise<AuthResult> {
  const token = extractBearerToken(request) ?? extractQueryToken(request);

  if (!token) {
    return {
      ok: false,
      status: 401,
      code: "MISSING_TOKEN",
      message:
        "Authorization bearer token or access_token query parameter is required.",
    };
  }

  const authResult = await verifyJwt(token, request);
  if (!authResult.ok) {
    return authResult;
  }

  try {
    await upsertShadowUser({
      externalUserId: authResult.auth.userId,
      email: authResult.auth.email,
      role: authResult.auth.role,
      roles: authResult.auth.roles,
      permissions: authResult.auth.permissions,
      authIssuer: authResult.auth.claims.iss,
    });
  } catch {
    return {
      ok: false,
      status: 500,
      code: "AUTH_SYNC_FAILED",
      message:
        "Failed to sync authenticated user into local shadow_users table.",
    };
  }

  return authResult;
}

export { authenticateRequest };
