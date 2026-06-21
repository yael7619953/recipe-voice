import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = signal(false);
  errorKey = signal<string | null>(null);

  constructor() {
    const error = inject(ActivatedRoute).snapshot.queryParamMap.get('error');
    if (error === 'oauth_failed') {
      this.errorKey.set('AUTH.ERROR.OAUTH_FAILED');
    }

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.errorKey.set(null));
  }

  get email() {
    return this.form.controls.email;
  }
  get password() {
    return this.form.controls.password;
  }

  private resetAfterFailure(): void {
    this.loading.set(false);
    this.form.enable();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorKey.set(null);

    const credentials = this.form.getRawValue();
    this.form.disable();

    this.authService
      .login(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/recipes').then((ok) => {
            if (!ok) {
              this.resetAfterFailure();
              this.errorKey.set('AUTH.ERROR.SERVER');
            }
          });
        },
        error: (err: unknown) => {
          this.resetAfterFailure();
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          this.errorKey.set(
            status === 401 ? 'AUTH.ERROR.INVALID_CREDENTIALS' : 'AUTH.ERROR.SERVER',
          );
        },
      });
  }
}
