import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    // Add other user fields as needed
  };
  // When MFA is required, backend may return a challenge instead of a token
  mfaRequired?: boolean;
  mfaToken?: string; // temporary token to be used with MFA verify (not used by your backend, optional)
  userId?: string;   // for your backend, carry userId to MFA verify
}

export interface ForgotPasswordResponse {
  status: number;
  data: any;
  message: string;
  success?: boolean; // Keeping for backward compatibility
}

export interface ResetPasswordRequest {
  token: string;
  email: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  // Add other profile fields as needed
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  profile_url?: string;
  // Add other updateable fields
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ApiResponse {
  message: string;
  success: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl; // Direct URL for now
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  private mfaToken: string | null = null;
  private pendingUserId: string | null = sessionStorage.getItem('mfa_pending_user_id'); // used by your backend during MFA verify

  constructor(private http: HttpClient) {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.isAuthenticatedSubject.next(true);
    }
  }

  // Email MFA: request server to send an OTP to user's email.
  // If userId is omitted, backend should use session (recommended for login flow).
  enableMfa(userId?: string) {
    if (userId) this.pendingUserId = userId;
    const body: any = {};
    if (this.pendingUserId) body.userId = this.pendingUserId;
    return this.http.post<any>(`${this.apiUrl}/auth/mfa/setup`, body, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true // Important for handling cookies/sessions
    }).pipe(
      tap(response => {
        // IMPORTANT: prioritize MFA check BEFORE handling a normal token
        if (response?.mfaRequired) {
          // For your backend, we expect userId to be provided (no token yet)
          if (response?.userId) {
            this.pendingUserId = response.userId;
            sessionStorage.setItem('mfa_pending_user_id', response.userId);
          }
          // Optional support if backend also returns an mfaToken (not required by your code)
          if ((response as any).mfaToken) {
            this.mfaToken = (response as any).mfaToken as string;
          }
          this.isAuthenticatedSubject.next(false);
          return;
        }

        if (response && response.token) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user || {}));
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError(error => {
        let errorMessage = 'Login failed. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your connection.';
        } else if (error.status === 401) {
          errorMessage = 'Invalid email or password.';
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  getMfaToken(): string | null {
    return this.mfaToken;
  }

  clearMfaToken(): void {
    this.mfaToken = null;
  }

  // Some backends start an MFA session via cookie and do not return an mfaToken.
  // Call this to indicate an MFA flow is in progress using the session cookie.
  startMfaSession(): void {
    if (!this.mfaToken) {
      this.mfaToken = 'cookie-session';
    }
  }

  setupMfaTotp(userId: string) {
    return this.http.post<any>(`${this.apiUrl}/auth/mfa/setup`, { userId }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });
  }

  // Alias for clarity in components
  setupMfa(userId: string) {
    return this.setupMfaTotp(userId);
  }

  getPendingUserId(): string | null {
    return this.pendingUserId;
  }

  setPendingUserId(userId: string | null): void {
    this.pendingUserId = userId;
  }

  getCurrentUserId(): string | null {
    const stored = this.getCurrentUser();
    if (stored?.id) return stored.id;
    return this.getPendingUserId();
  }

  // Verify MFA code and exchange for a final auth token
  // Overloads to support both login-time flow (code only) and setup/explicit flow (userId + otp)
  verifyMfa(code: string): Observable<any>;
  verifyMfa(userId: string, otp: string): Observable<any>;
  verifyMfa(a: string, b?: string): Observable<any> {
    // If called with (userId, otp)
    if (typeof b === 'string') {
      const body = { userId: a, otp: b } as any;
      return this.http.post<any>(`${this.apiUrl}/auth/mfa/verify`, body, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      }).pipe(
        tap((res) => {
          const token = res?.data?.access_token || res?.access_token || res?.token;
          const user = res?.data?.user || res?.user || (res?.data?.id ? { id: res.data.id, role: res.data.role } : undefined);
          if (token) {
            localStorage.setItem('auth_token', token);
            if (user) {
              localStorage.setItem('user', JSON.stringify(user));
            }
            this.isAuthenticatedSubject.next(true);
          }
        })
      );
    }

    // Called with (code) only — use pendingUserId/session
    const code = a;
    const body: any = { otp: code };
    if (this.pendingUserId) body.userId = this.pendingUserId;
    if (this.mfaToken && this.mfaToken !== 'cookie-session') {
      body.mfaToken = this.mfaToken;
    }
    return this.http.post<any>(`${this.apiUrl}/auth/mfa/verify`, body, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    }).pipe(
      tap((res) => {
        const token = res?.token || res?.access_token || res?.data?.access_token;
        const user = res?.user || res?.data?.user;
        if (token) {
          localStorage.setItem('auth_token', token);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          this.isAuthenticatedSubject.next(true);
          this.clearMfaToken();
          this.pendingUserId = null;
          sessionStorage.removeItem('mfa_pending_user_id');
        }
      })
    );
  }

  clearMfaPendingState(): void {
    this.pendingUserId = null;
    this.mfaToken = null;
    sessionStorage.removeItem('mfa_pending_user_id');
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    this.clearMfaPendingState();
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getCurrentUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Request a password reset link
   * @param email User's email address
   */
  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(
      `${this.apiUrl}/auth/forgot-password`,
      { email },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      }
    );
  }

  /**
   * Reset user's password using the token from the reset email
   * @param data Reset password data
   */
  resetPassword(data: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(
      `${this.apiUrl}/auth/reset-password`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      }
    );
  }

  /**
   * Get user profile
   */
  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Accept': 'application/json'
      },
      withCredentials: true
    });
  }

  /**
   * Update user profile
   * @param profileData Profile data to update
   */
  updateProfile(profileData: UpdateProfileRequest): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.apiUrl}/auth/profile`,
      profileData,
      {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      }
    );
  }

  /**
   * Change user password
   * @param currentPassword Current password
   * @param newPassword New password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.apiUrl}/auth/change-password`,
      {
        current_password: currentPassword,
        new_password: newPassword
      },
      {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        withCredentials: true
      }
    );
  }
}
