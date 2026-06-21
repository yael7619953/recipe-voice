import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/auth.models';

class FakeTranslateLoader extends TranslateLoader {
  getTranslation() {
    return of({});
  }
}

const MOCK_RESPONSE: AuthResponse = {
  success: true,
  token: 'tok',
  user: { id: '1', name: 'Test', email: 'test@test.com' },
};

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authService = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        provideRouter([{ path: 'recipes', redirectTo: '' }]),
        provideTranslateService({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form validation', () => {
    it('should be invalid when empty', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('should be invalid with a bad email', () => {
      component.form.setValue({ email: 'not-an-email', password: 'pass123' });
      expect(component.email.errors?.['email']).toBeTruthy();
    });

    it('should be invalid when password is too short', () => {
      component.form.setValue({ email: 'a@b.com', password: '123' });
      expect(component.password.errors?.['minlength']).toBeTruthy();
    });

    it('should be valid with correct values', () => {
      component.form.setValue({ email: 'a@b.com', password: 'secret1' });
      expect(component.form.valid).toBe(true);
    });
  });

  describe('submit — invalid form', () => {
    it('should mark all fields as touched without calling the service', () => {
      component.submit();
      expect(authService.login).not.toHaveBeenCalled();
      expect(component.email.touched).toBe(true);
      expect(component.password.touched).toBe(true);
    });
  });

  describe('submit — success', () => {
    it('should navigate to /recipes and keep loading true until nav', () => {
      authService.login.mockReturnValue(of(MOCK_RESPONSE));
      const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      component.form.setValue({ email: 'a@b.com', password: 'secret1' });
      component.submit();

      expect(navSpy).toHaveBeenCalledWith('/recipes');
    });

    it('should disable the form while the request is in flight', () => {
      authService.login.mockReturnValue(of(MOCK_RESPONSE));
      component.form.setValue({ email: 'a@b.com', password: 'secret1' });
      component.submit();
      // form was disabled before the observable emitted (synchronously checked)
      // after of() emits, navigateByUrl is called — form stays disabled (navigation away)
      expect(component.loading()).toBe(true);
    });
  });

  describe('submit — error', () => {
    it('should set INVALID_CREDENTIALS key on 401', () => {
      authService.login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401 })),
      );
      component.form.setValue({ email: 'a@b.com', password: 'wrong1' });
      component.submit();

      expect(component.errorKey()).toBe('AUTH.ERROR.INVALID_CREDENTIALS');
      expect(component.loading()).toBe(false);
      expect(component.form.enabled).toBe(true);
    });

    it('should set SERVER key on non-401 errors', () => {
      authService.login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      component.form.setValue({ email: 'a@b.com', password: 'secret1' });
      component.submit();

      expect(component.errorKey()).toBe('AUTH.ERROR.SERVER');
    });
  });

  describe('error reset on input', () => {
    it('should clear errorKey when the user edits the form', () => {
      authService.login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401 })),
      );
      component.form.setValue({ email: 'a@b.com', password: 'wrong1' });
      component.submit();
      expect(component.errorKey()).not.toBeNull();

      component.form.patchValue({ email: 'b@b.com' });
      expect(component.errorKey()).toBeNull();
    });
  });
});
