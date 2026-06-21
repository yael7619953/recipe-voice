import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';

import { RegisterComponent } from './register.component';
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
  user: { id: '1', name: 'Tester', email: 'test@test.com' },
};

const VALID_FORM = { name: 'Tester', email: 'test@test.com', password: 'secret1', confirmPassword: 'secret1' };

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authService: { register: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authService = { register: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        provideRouter([{ path: 'recipes', redirectTo: '' }]),
        provideTranslateService({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
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
      component.form.setValue({ ...VALID_FORM, email: 'not-an-email' });
      expect(component.email.errors?.['email']).toBeTruthy();
    });

    it('should be invalid when password is too short', () => {
      component.form.setValue({ ...VALID_FORM, password: '123', confirmPassword: '123' });
      expect(component.password.errors?.['minlength']).toBeTruthy();
    });

    it('should be invalid when passwords do not match', () => {
      component.form.setValue({ ...VALID_FORM, confirmPassword: 'different' });
      expect(component.form.errors?.['passwordsMismatch']).toBeTruthy();
    });

    it('should be valid with all correct values', () => {
      component.form.setValue(VALID_FORM);
      expect(component.form.valid).toBe(true);
    });
  });

  describe('submit — invalid form', () => {
    it('should mark all fields as touched without calling the service', () => {
      component.submit();
      expect(authService.register).not.toHaveBeenCalled();
      expect(component.name.touched).toBe(true);
      expect(component.email.touched).toBe(true);
    });
  });

  describe('submit — success', () => {
    it('should navigate to /recipes', () => {
      authService.register.mockReturnValue(of(MOCK_RESPONSE));
      const navSpy = vi.spyOn(router, 'navigateByUrl');

      component.form.setValue(VALID_FORM);
      component.submit();

      expect(navSpy).toHaveBeenCalledWith('/recipes');
    });

    it('should not send confirmPassword to the service', () => {
      authService.register.mockReturnValue(of(MOCK_RESPONSE));
      component.form.setValue(VALID_FORM);
      component.submit();

      expect(authService.register).toHaveBeenCalledWith({
        name: VALID_FORM.name,
        email: VALID_FORM.email,
        password: VALID_FORM.password,
      });
    });
  });

  describe('submit — error', () => {
    it('should set EMAIL_TAKEN key on 409', () => {
      authService.register.mockReturnValue(throwError(() => ({ status: 409 })));
      component.form.setValue(VALID_FORM);
      component.submit();

      expect(component.errorKey()).toBe('AUTH.ERROR.EMAIL_TAKEN');
      expect(component.loading()).toBe(false);
      expect(component.form.enabled).toBe(true);
    });

    it('should set SERVER key on non-409 errors', () => {
      authService.register.mockReturnValue(throwError(() => ({ status: 500 })));
      component.form.setValue(VALID_FORM);
      component.submit();

      expect(component.errorKey()).toBe('AUTH.ERROR.SERVER');
    });
  });

  describe('error reset on input', () => {
    it('should clear errorKey when the user edits the form', () => {
      authService.register.mockReturnValue(throwError(() => ({ status: 409 })));
      component.form.setValue(VALID_FORM);
      component.submit();
      expect(component.errorKey()).not.toBeNull();

      component.form.patchValue({ email: 'other@test.com' });
      expect(component.errorKey()).toBeNull();
    });
  });
});
