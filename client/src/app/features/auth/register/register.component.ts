import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

const passwordsMatchValidator: ValidatorFn = (group: AbstractControl) => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordsMismatch: true };
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  loading = signal(false);
  errorKey = signal<string | null>(null);

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.errorKey.set(null));
  }

  get name() {
    return this.form.controls.name;
  }
  get email() {
    return this.form.controls.email;
  }
  get password() {
    return this.form.controls.password;
  }
  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }
  get passwordsMismatch() {
    return this.form.errors?.['passwordsMismatch'] && this.confirmPassword.touched;
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

    const { name, email, password } = this.form.getRawValue();
    this.form.disable();

    this.authService
      .register({ name, email, password })
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
        error: (err) => {
          this.resetAfterFailure();
          this.errorKey.set(
            err.status === 409 ? 'AUTH.ERROR.EMAIL_TAKEN' : 'AUTH.ERROR.SERVER',
          );
        },
      });
  }
}
