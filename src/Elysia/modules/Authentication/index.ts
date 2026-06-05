import type { AuthResult } from "@/types";
import { extractBearerToken, extractQueryToken, verifyJwt } from "./utils";

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
