import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, ResetPasswordRequest } from '../../Services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPassword implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private readonly SUCCESS_POPUP_KEY = 'showPasswordResetSuccess';

  resetPasswordForm: FormGroup;
  isLoading = false;
  submitted = false;
  error = ''; // Initialize as empty string instead of null
  token: string | null = null;
  showPassword = false;
  showConfirmPassword = false;
  isValidToken = false;

  constructor() {
    this.resetPasswordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z\d@$.!%*#?&]/)
      ]],
      password_confirmation: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.toast.error('Invalid or expired reset link. Please request a new one.');
      this.router.navigate(['/login']);
      return;
    }
    this.token = token;
    this.isValidToken = true;
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('password_confirmation')?.value 
      ? null 
      : { passwordMismatch: true };
  }

  togglePassword(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  private showError(message: string): void {
    const errorMessage = message || 'An unknown error occurred';
    this.error = errorMessage;
    this.toast.error(errorMessage);
  }

  onSubmit() {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const token = this.token;
    if (!token) {
      const errorMsg = 'Invalid or expired reset token. Please request a new password reset link.';
      this.showError(errorMsg);
      return;
    }

    this.isLoading = true;
    this.error = ''; // Reset to empty string

    const { password, password_confirmation } = this.resetPasswordForm.value;
    
    // Create a properly typed reset password request
    const resetRequest: ResetPasswordRequest = {
      token: token,
      email: '', // Not needed as per requirement
      new_password: password,
      confirm_password: password_confirmation
    };

    this.authService.resetPassword(resetRequest)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response: any) => {
          // Check if the response indicates success
          if (response && response.status >= 200 && response.status < 300) {
            this.submitted = true;
            this.toast.success(response.message || 'Your password has been reset successfully!');
            localStorage.removeItem(this.SUCCESS_POPUP_KEY);
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          } else {
            // Handle non-2xx responses that still come through as 'next'
            const errorMsg = response?.message || 'An error occurred while resetting your password.';
            this.showError(errorMsg);
          }
        },
        error: (error) => {
          // Handle HTTP errors (4xx, 5xx)
          const errorMsg = error.error?.message || 'An error occurred while resetting your password.';
          this.showError(errorMsg);
        }
      });
  }
}
