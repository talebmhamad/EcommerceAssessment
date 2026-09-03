import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../../config/env";
import { ApiError, unauthorized } from "../../shared/errors/api-error";
import type { JwtPayload } from "./auth.types";

const JWT_ALGORITHM = "HS256";
const JWT_TYPE = "JWT";
const POSTGRES_INTEGER_MAX = 2_147_483_647;

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(unsignedToken: string): string {
  return createHmac("sha256", config.jwt.secret)
    .update(unsignedToken)
    .digest("base64url");
}

function parseExpiresInSeconds(value: string): number {
  const match = /^(?<amount>[1-9]\d*)(?<unit>[smhd])$/.exec(value);

  if (!match?.groups) {
    throw new Error("Invalid JWT expiration configuration.");
  }

  const amount = Number(match.groups.amount);
  const unit = match.groups.unit;

  if (unit === "s") return amount;
  if (unit === "m") return amount * 60;
  if (unit === "h") return amount * 60 * 60;

  return amount * 24 * 60 * 60;
}

function safeParsePayload(value: string): JwtPayload {
  const parsed: unknown = JSON.parse(value);

  if (!parsed || typeof parsed !== "object") {
    throw unauthorized();
  }

  const payload = parsed as Record<string, unknown>;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw unauthorized();
  }

  return {
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp
  };
}

function verifyHeader(value: string): void {
  const parsed: unknown = JSON.parse(value);

  if (!parsed || typeof parsed !== "object") {
    throw unauthorized();
  }

  const header = parsed as Record<string, unknown>;

  if (header.alg !== JWT_ALGORITHM || header.typ !== JWT_TYPE) {
    throw unauthorized();
  }
}

function verifySignature(unsignedToken: string, signature: string): void {
  const expectedSignature = sign(unsignedToken);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw unauthorized();
  }
}

export function signAccessToken(userId: number): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: String(userId),
    iat: now,
    exp: now + parseExpiresInSeconds(config.jwt.expiresIn)
  };
  const header = {
    alg: JWT_ALGORITHM,
    typ: JWT_TYPE
  };
  const unsignedToken = [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(payload))
  ].join(".");

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyAccessToken(token: string): JwtPayload {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw unauthorized();
  }

  const [headerPart, payloadPart, signaturePart] = parts;

  if (!headerPart || !payloadPart || !signaturePart) {
    throw unauthorized();
  }

  try {
    verifyHeader(base64UrlDecode(headerPart));
    verifySignature(`${headerPart}.${payloadPart}`, signaturePart);

    const payload = safeParsePayload(base64UrlDecode(payloadPart));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      throw unauthorized();
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw unauthorized();
  }
}

export function getUserIdFromAccessToken(token: string): number {
  const payload = verifyAccessToken(token);
  const userId = Number(payload.sub);

  if (
    !Number.isInteger(userId) ||
    userId < 1 ||
    userId > POSTGRES_INTEGER_MAX ||
    String(userId) !== payload.sub
  ) {
    throw unauthorized();
  }

  return userId;
}
