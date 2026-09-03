import { config } from "../../config/env";
import { prisma } from "../../infrastructure/database";
import { unauthorized } from "../../shared/errors/api-error";
import { verifyPassword } from "../../shared/security/password-hasher";
import type { LoginBody } from "../../validation/request-schemas";
import type {
  AuthenticatedUser,
  AuthenticatedUserResponse,
  LoginResponse
} from "./auth.types";
import { signAccessToken } from "./jwt";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

function toUserResponse(user: AuthenticatedUser): AuthenticatedUserResponse {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString()
  };
}

export async function login(loginBody: LoginBody): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({
    where: { email: loginBody.email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      createdAt: true
    }
  });

  if (!user) {
    throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await verifyPassword(loginBody.password, user.passwordHash);

  if (!passwordMatches) {
    throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt
  };

  return {
    accessToken: signAccessToken(user.id),
    tokenType: "Bearer",
    expiresIn: config.jwt.expiresIn,
    user: toUserResponse(safeUser)
  };
}

export async function getAuthenticatedUserById(
  userId: number
): Promise<AuthenticatedUserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true
    }
  });

  if (!user) {
    throw unauthorized();
  }

  return toUserResponse(user);
}
