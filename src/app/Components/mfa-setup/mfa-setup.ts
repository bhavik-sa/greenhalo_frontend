import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../shared/toast.service';
import { AuthService } from '../../Services/auth.service';


@Component({
  selector: 'app-mfa-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './mfa-setup.html',
  styleUrls: ['./mfa-setup.css']
})
export class MfaSetup implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  form!: FormGroup;
  isLoading = false;
  userId: string | null = null;

  // Data returned by setup
  base32?: string;
  otpauthUrl?: string;
  devOtp?: string; // optional, for development only

  get qrUrl(): string | undefined {
    if (!this.otpauthUrl) return undefined;
    const data = encodeURIComponent(this.otpauthUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}`;
  }

  ngOnInit(): void {
    this.userId = this.auth.getCurrentUserId();
    if (!this.userId) {
      this.toast.error('You must be logged in to setup MFA');
      return;
    }

    // Initialize form for OTP verification after scanning
    this.form = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(8)]]
    });

    // Request secret and otpauth_url from backend
    this.isLoading = true;
    this.auth.setupMfa(this.userId).subscribe({
      next: (res: any) => {
        this.base32 = res?.data?.base32 || res?.base32;
        this.otpauthUrl = res?.data?.otpauth_url || res?.otpauth_url;
        this.devOtp = res?.data?.devOtp || res?.devOtp; // dev only
        if (!this.base32 || !this.otpauthUrl) {
          this.toast.error('Failed to initialize MFA setup.');
        }
      },
      error: () => { /* interceptor shows error */ },
      complete: () => (this.isLoading = false)
    });
  }

  submit() {
    if (this.form.invalid || !this.userId) {
      this.form.markAllAsTouched();
      return;
    }

    const otp = this.form.get('otp')?.value?.toString().trim();
    if (!otp) return;

    this.isLoading = true;
    this.auth.verifyMfa(this.userId, otp).subscribe({
      next: () => this.toast.success('MFA enabled successfully'),
      error: () => { /* interceptor shows error */ },
      complete: () => (this.isLoading = false)
    });
  }

  // Copy Base32 secret to clipboard for manual entry in authenticator apps
  copySecret() {
    if (!this.base32) {
      this.toast.error('No secret to copy');
      return;
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(this.base32).then(() => {
        this.toast.success('Secret copied to clipboard');
      }).catch(() => {
        this.fallbackCopySecret();
      });
    } else {
      this.fallbackCopySecret();
    }
  }

  private fallbackCopySecret() {
    try {
      const el = document.getElementById('manual-secret') as HTMLInputElement | null;
      if (el) {
        el.removeAttribute('readonly');
        el.select();
        document.execCommand('copy');
        el.setAttribute('readonly', 'true');
        this.toast.success('Secret copied to clipboard');
      } else {
        this.toast.error('Unable to access secret field');
      }
    } catch {
      this.toast.error('Copy failed. Please copy the secret manually.');
    }
  }

  // Scroll and focus the OTP field to mimic a step-forward action
  focusOtp() {
    const otpEl = document.getElementById('otp') as HTMLInputElement | null;
    if (otpEl) {
      otpEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => otpEl.focus(), 250);
    }
  }

  selectSecret(event: Event) {
    const input = event.target as HTMLInputElement | null;
    input?.select?.();
  }
}
