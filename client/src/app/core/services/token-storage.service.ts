import { Injectable } from '@angular/core';
import { AuthResponse, AuthUser } from '../models/auth.models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  hasValidSession(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || this.isExpired(token)) {
      return false;
    }
    return !!localStorage.getItem(USER_KEY);
  }

  getToken(): string | null {
    if (!this.hasValidSession()) {
      this.clear();
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  }

  getUser(): AuthUser | null {
    try {
      if (!this.hasValidSession()) {
        this.clear();
        return null;
      }
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  save(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /** Decodes the JWT payload and checks the `exp` claim. */
  private isExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
}
