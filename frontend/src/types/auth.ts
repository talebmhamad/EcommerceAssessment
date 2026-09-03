export type AuthUser = {
  id: number;
  email: string;
  createdAt: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: AuthUser;
};

export type StoredAuthState = {
  accessToken: string;
  user: AuthUser;
};
