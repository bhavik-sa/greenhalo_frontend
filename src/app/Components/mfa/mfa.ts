import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../Services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './mfa.html',
  styleUrls: ['./mfa.css']
})
export class MfaComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isLoading = false;
  isResending = false;
  email: string | null = null;
  countdown = 0;
  private resendInterval: any;
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit(): void {
    // Get the pending user ID from the auth service
    const userId = this.auth.getPendingUserId();
    if (!userId) {
      // Check if we have a pending user ID in session storage (for page refresh)
      const pendingUserId = sessionStorage.getItem('mfa_pending_user_id');
      if (!pendingUserId) {
        this.toast.warning('No pending MFA verification found. Please login again.');
        this.router.navigate(['/login']);
        return;
      }
      // If we found a pending user ID in session storage, set it in the auth service
      (this.auth as any).pendingUserId = pendingUserId;
    }

    // Get email from query params or session storage
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
        // Save email to session storage for page refresh
        sessionStorage.setItem('mfa_email', this.email || '');
      } else {
        // Fallback to session storage if not in query params
        this.email = sessionStorage.getItem('mfa_email');
      }
    });

    // Start resend countdown
    this.startResendCountdown();
  }

  startResendCountdown(seconds = 30): void {
    this.countdown = seconds;
    this.isResending = false;
    
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
    
    this.resendInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.resendInterval);
        this.isResending = true;
      }
    }, 1000);
  }

  async resendCode(): Promise<void> {
    if (this.isResending || this.countdown > 0) return;

    this.isResending = true;
    try {
      const userId = this.auth.getPendingUserId();
      if (!userId) {
        throw new Error('No user session found for MFA resend');
      }
      
      // In a real app, you would call the API to resend the code
      // For now, we'll simulate a successful resend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.toast.success('New verification code sent!');
      this.startResendCountdown(30);
    } catch (error: any) {
      console.error('Error resending MFA code:', error);
      const errorMessage = error.error?.message || 'Failed to resend verification code';
      this.toast.error(errorMessage);
    } finally {
      this.isResending = false;
    }
  }

 // In mfa.ts, update the submit() method
async submit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  const code = this.form.get('code')?.value?.toString().trim();
  if (!code) {
    this.toast.error('Please enter a valid verification code');
    return;
  }

  const userId = this.auth.getPendingUserId();
  if (!userId) {
    this.toast.error('Session expired. Please login again.');
    this.router.navigate(['/login']);
    return;
  }

  this.isLoading = true;

  try {
    // Verify the MFA code
    const response = await this.auth.verifyMfa(userId, code).pipe(first()).toPromise();
    
    // Check for successful verification
    const token = response?.token || response?.data?.access_token || response?.access_token;
    if (token) {
      // Store the token and user data
      localStorage.setItem('auth_token', token);
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      } else if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      // Show success message and redirect
      this.toast.success('Verification successful!');
      setTimeout(() => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      }, 1000);
      return;
    }
    
    // If we get here, the verification was not successful
    this.toast.error('Invalid verification code. Please try again.');
  } catch (error: any) {
    console.error('MFA verification error:', error);
    
    // Handle specific error cases
    if (error.status === 401) {
      this.toast.error('Invalid or expired verification code. Please try again.');
    } else if (error.status === 400) {
      this.toast.error(error.error?.message || 'Invalid request. Please check your input.');
    } else if (error.status === 0 || error.status >= 500) {
      this.toast.error('Server error. Please try again later.');
    } else {
      const errorMessage = error.error?.message || 'Failed to verify code. Please try again.';
      this.toast.error(errorMessage);
    }
  } finally {
    this.isLoading = false;
  }
}

  private handleSuccessfulVerification(): void {
    // Clear the stored email from session storage
    sessionStorage.removeItem('mfa_email');
    
    // Show success message
    this.toast.success('Verification successful! Redirecting...');
    
    // Navigate to dashboard or return URL
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Add a small delay for better UX
  }

  ngOnDestroy(): void {
    // Clear any pending intervals
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
    
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
    
    // Clean up session storage if navigating away from MFA page without completing MFA
    if (this.router.url !== '/mfa' && this.router.url !== '/mfa-verify') {
      sessionStorage.removeItem('mfa_email');
    }
  }
}
