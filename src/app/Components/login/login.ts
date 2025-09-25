import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, ForgotPasswordResponse, LoginRequest } from '../../Services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

// API Response Interface
export interface ApiResponse<T = any> {
  status: number;
  data: T;
  message: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  // Services
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  // Form groups
  loginForm: FormGroup;
  forgotPasswordForm: FormGroup;

  // UI State
  isLoading = false;
  error: string | null = null;
  showPassword = false;
  showForgotPasswordModal = false;
  showLogin = true;
  isSendingResetLink = false;
  resetLinkSent = false;
  showSuccessPopup = false;
  successMessage = 'Password reset link has been sent to your email';
  private readonly SUCCESS_POPUP_KEY = 'showPasswordResetSuccess';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // Check if we need to show the success popup from a previous session
    const showPopup = localStorage.getItem(this.SUCCESS_POPUP_KEY) === 'true';
    if (showPopup) {
      this.showSuccessPopup = true;
      this.showLogin = false;
      // Don't clear the flag here, only clear it when user clicks 'Back to Login'
    }
  }
  // Toggle password visibility
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // Open forgot password modal
  openForgotPassword(): void {
    this.showForgotPasswordModal = true;
    this.resetLinkSent = false;
    this.forgotPasswordForm.reset();
    localStorage.removeItem(this.SUCCESS_POPUP_KEY);
    this.showSuccessPopup = false;
    this.showLogin = true;
  }

  // Close forgot password modal
  closeForgotPassword(): void {
    this.showForgotPasswordModal = false;
    this.resetLinkSent = false;
    // Ensure success popup is hidden when closing forgot password
    this.showSuccessPopup = false;
    this.showLogin = true;
    localStorage.removeItem(this.SUCCESS_POPUP_KEY);
  }

  // Handle back to login from success popup
  onBackToLogin(): void {
    this.showLogin = true;
    this.showSuccessPopup = false;
    // Clear the stored state
    localStorage.removeItem(this.SUCCESS_POPUP_KEY);
  }

  // Handle forgot password form submission
  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    const email = this.forgotPasswordForm.get('email')?.value;
    this.isSendingResetLink = true;

    this.authService.forgotPassword(email)
      .pipe(
        finalize(() => {
          this.isSendingResetLink = false;
        })
      )
      .subscribe({
        next: (response: ForgotPasswordResponse) => {
          // Close the forgot password modal
          this.closeForgotPassword();
          
          // Update the success message in the popup
          this.successMessage = response.message;
          
          // Hide the login form and show success message
          this.showLogin = false;
          this.showSuccessPopup = true;
          
          // Store the state in localStorage
          localStorage.setItem(this.SUCCESS_POPUP_KEY, 'true');
          
          // Show success toast
          this.toast.success(response.message);
        },
        error: (error: { error: ForgotPasswordResponse | string }) => {
          // Handle both string and object error responses
          const errorMessage = typeof error.error === 'string' 
            ? error.error 
            : error.error?.message || 'Failed to send reset link. Please try again.';
          this.toast.error(errorMessage);
        }
      });
  }

  // Handle login form submission
  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.error = null;

    const email = this.loginForm.get('email')?.value;
    const password = this.loginForm.get('password')?.value;

    if (!email || !password) {
      this.toast.error('Please enter both email and password');
      this.isLoading = false;
      return;
    }

    const credentials: LoginRequest = { email, password };

    this.authService.login(credentials)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          if (!response) {
            this.toast.error('No response from server');
            return;
          }

          // If a token already exists, proceed normally
          const hasToken = !!localStorage.getItem('auth_token');
          if (hasToken) {
            this.toast.success('Logged in successfully');
            setTimeout(() => this.router.navigateByUrl('/dashboard'), 900);
            return;
          }

          // Show login success message
          this.toast.success('Login successful! Verifying your account...');
          
          // Email OTP MFA flow
          const idFromLogin = (response as any)?.data?.id || (response as any)?.userId;
          const userEmail = this.loginForm.get('email')?.value;
          
          if (idFromLogin) {
            this.authService.setPendingUserId(idFromLogin);
            if (userEmail) {
              sessionStorage.setItem('mfa_email', userEmail);
            }
          }
          
          // Add a small delay to ensure the success message is visible
          setTimeout(() => {
            this.authService.enableMfa().subscribe({
              next: () => {
                this.toast.info('Enter the verification code to continue');
                const queryParams: any = {};
                if (idFromLogin) {
                  queryParams.userId = idFromLogin;
                }
                if (userEmail) {
                  queryParams.email = userEmail;
                }
                this.router.navigate(['/mfa'], { queryParams });
              },
              error: (error) => {
                console.error('MFA setup error:', error);
                this.toast.error('Failed to send verification code. Please try again.');
              }
            });
          }, 1000); // 1 second delay to show the success message
        },
        error: (error) => {
          const errorMessage = error?.message || 'Login failed. Please check your credentials and try again.';
          this.error = errorMessage;
          this.toast.error(errorMessage);
        }
      });
  }


 
}
