import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthPayload, AuthResponse, AuthUser } from '../models/auth.models';
import { TokenStorageService } from './token-storage.service';

const API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokenStorage = inject(TokenStorageService);

  private _currentUser = signal<AuthUser | null>(this.tokenStorage.getUser());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => {
    if (this._currentUser() === null) {
      return false;
    }
    return this.tokenStorage.hasValidSession();
  });

  register(payload: AuthPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API}/register`, {
        name: payload.name?.trim(),
        email: payload.email.trim(),
        password: payload.password,
      })
      .pipe(tap((res) => this.applySession(res)));
  }

  login(payload: AuthPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API}/login`, {
        email: payload.email.trim(),
        password: payload.password,
      })
      .pipe(tap((res) => this.applySession(res)));
  }

  applyOAuthToken(token: string): Observable<void> {
    return this.http
      .get<{ success: boolean; user: AuthUser }>(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap((res) => this.applySession({ success: true, token, user: res.user })),
        map(() => undefined),
      );
  }

  logout(): void {
    this.tokenStorage.clear();
    this._currentUser.set(null);
  }

  getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  private applySession(res: AuthResponse): void {
    this.tokenStorage.save(res);
    this._currentUser.set(res.user);
  }
}
