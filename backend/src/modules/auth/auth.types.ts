export type AuthenticatedUser = {
  id: number;
  email: string;
  createdAt: Date;
};

export type AuthenticatedUserResponse = {
  id: number;
  email: string;
  createdAt: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: AuthenticatedUserResponse;
};

export type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
};
