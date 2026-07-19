import type { AuthResult } from "@/types";
import { extractBearerToken, extractQueryToken, verifyJwt } from "./utils";

/**
 * Authenticates a request by extracting the bearer token or access_token query parameter,
 * and verifying the JWT.
 *
 * Uses in the `authenticateRequest` function to handle the authentication process in websocket connections or as middleware.
 *
 * @param request - The incoming HTTP request to authenticate.
 * @returns A promise that resolves to an AuthResult indicating the authentication outcome.
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

  return authResult;
}

export { authenticateRequest };
