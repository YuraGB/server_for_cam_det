import type { ALLOWED_ORIGINS } from "@/constants";
import type { elysiaHandler } from "@/Elysia/app";
import type { Serve } from "bun";

export type WSData = {
  ip: string;
  peerId?: string;
  lastSeenAt?: number;
  auth?: AuthContext;
};

export type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; status: number; code: string; message: string };

export type AuthClaims = {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
};

export type AuthContext = {
  userId: string;
  email?: string;
  role?: string;
  roles: string[];
  permissions: string[];
  claims: AuthClaims;
};

export type RegisterMessage = {
  type: "register";
  peerId: string;
};

export type SignalMessage = {
  type: string;
  targetPeerId: string;
  [key: string]: unknown;
};

export type ElysiaFetchHandler = typeof elysiaHandler;
export type BunFetchHandler = Serve.Options<WSData>["fetch"];

export type TAllowedOrigin = (typeof ALLOWED_ORIGINS)[number];
