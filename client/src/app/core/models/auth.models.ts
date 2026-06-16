export interface AuthPayload {
  email: string;
  password: string;
  name?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}
