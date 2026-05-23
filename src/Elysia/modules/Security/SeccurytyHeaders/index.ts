import { Elysia } from "elysia";

export const securityHeaders = new Elysia({
  name: "security-headers",
}).onAfterHandle(({ set }) => {
  set.headers["X-Frame-Options"] = "DENY";
  set.headers["X-Content-Type-Options"] = "nosniff";
  set.headers["Referrer-Policy"] = "no-referrer";

  set.headers["Permissions-Policy"] =
    "camera=(), microphone=(), geolocation=()";

  set.headers["Cross-Origin-Opener-Policy"] = "same-origin";
  set.headers["Cross-Origin-Resource-Policy"] = "same-origin";
});