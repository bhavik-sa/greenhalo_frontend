import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService, ProfileResponse, UpdateProfileRequest, ApiResponse } from '../../Services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ]
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  isLoading = false;
  isPasswordLoading = false;
  userProfile: any = null;
  selectedFile: File | null = null;
  profileImagePreview: string | ArrayBuffer | null = null;
  isUploading = false;
  // Add these properties to your component class
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  activeTab: 'profile' | 'password' = 'profile';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    // Initialize profile form
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      profile_url: ['']
    });

    // Initialize password form with custom validator
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordValidator()
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator() });
  }

  ngOnInit(): void {
    // Get the initial tab from the URL query parameters
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'password') {
        this.activeTab = 'password';
      } else {
        this.activeTab = 'profile';
      }
    });
    
    this.loadProfile();
  }

  setActiveTab(tab: 'profile' | 'password'): void {
    this.activeTab = tab;
    // Update the URL with the active tab
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'password' ? 'password' : null },
      queryParamsHandling: 'merge'
    });
  }

// In profile.ts, update the loadProfile method:
loadProfile(): void {
  this.isLoading = true;
  this.authService.getProfile().subscribe({
    next: (response: any) => {
      this.userProfile = response.data;
      console.log('Profile data:', this.userProfile);

      // ✅ Always prepend base URL if backend returns just the path
      const profileUrl = this.userProfile.profile_url 
        ? `${environment.apiUrl}/${this.userProfile.profile_url}`
        : '';

      // ✅ Update userProfile object for direct binding
      this.userProfile.profile_url = profileUrl;

      // ✅ Patch values into form
      this.profileForm.patchValue({
        name: this.userProfile.name,
        email: this.userProfile.email,
        profile_url: profileUrl
      });

      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error loading profile:', error);
      this.toastService.error('Failed to load profile. Please try again.');
      this.isLoading = false;
    }
  });
}


onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    
    // Create a preview of the selected image
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.profileImagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Update the form with the new file
    this.profileForm.patchValue({
      profile_url: file
    });
    this.profileForm.get('profile_url')?.updateValueAndValidity();
  }
}

  // Upload profile image
  private uploadProfileImage(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedFile) {
        const error = new Error('No file selected');
        console.error('Upload error:', error);
        reject(error);
        return;
      }

      console.log('Selected file:', this.selectedFile.name, 'size:', this.selectedFile.size, 'type:', this.selectedFile.type);
      
      const formData = new FormData();
      formData.append('profile_image', this.selectedFile, this.selectedFile.name);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        const error = new Error('No authentication token found');
        console.error('Auth error:', error);
        reject(error);
        return;
      }

      console.log('Sending request to:', `${environment.apiUrl}/auth/profile`);
      
      this.http.put<{url: string, status: number}>(`${environment.apiUrl}/auth/profile`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        reportProgress: true
      }).subscribe({
        next: (response: {url: string, status: number}) => {
          console.log('Upload successful, response:', response);
          if (response.status !== 200) {
            const error = new Error('Invalid response from server');
            console.error('Response error:', error, 'Response:', response);
            reject(error);
            return;
          }
          resolve(response.url);
        },
        error: (error) => {
          console.error('Upload error details:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            headers: error.headers,
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          reject(new Error(error.error?.message || 'Failed to upload image. Please try again.'));
        }
      });
    });
  }

  // Update profile
  async onProfileSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      let profileImageUrl = this.profileForm.value.profile_url;
      
      // Upload new profile image if selected
      if (this.selectedFile) {
        try {
          console.log('Starting profile image upload...');
          profileImageUrl = await this.uploadProfileImage();
          
          this.profileForm.patchValue({ profile_url: profileImageUrl });
        } catch (error) {
          console.error('Error uploading profile image:', error);
          this.toastService.error('Failed to upload profile image');
          this.isLoading = false;
          return;
        }
      }

      const profileData: UpdateProfileRequest = {
        name: this.profileForm.value.name,
        email: this.profileForm.value.email,
        profile_url: profileImageUrl || ''
      };

      this.authService.updateProfile(profileData).subscribe({
        next: (response) => {
          this.toastService.success('Profile updated successfully');
          // Update local user data
          const user = this.authService.getCurrentUser();
          if (user) {
            user.name = profileData.name;
            user.email = profileData.email;
            user.profile_url = profileData.profile_url;
            localStorage.setItem('user', JSON.stringify(user));
          }
          this.selectedFile = null; // Reset selected file after successful update
          this.loadProfile(); // Reload profile to get the latest data
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          const errorMessage = error.error?.message || 'Failed to update profile. Please try again.';
          this.toastService.error(errorMessage);
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error in profile update:', error);
      this.toastService.error('An error occurred while updating your profile');
      this.isLoading = false;
    }
  }
  resetForm() {
    throw new Error('Method not implemented.');
  }

  // Change password
  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isPasswordLoading = true;
    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (response) => {
        this.toastService.success('Password changed successfully');
        this.passwordForm.reset();
        this.isPasswordLoading = false;
      },
      error: (error) => {
        console.error('Error changing password:', error);
        const errorMessage = error.error?.message || 'Failed to change password. Please try again.';
        this.toastService.error(errorMessage);
        this.isPasswordLoading = false;
      }
    });
  }

  // Custom password validator
  private passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const hasUpperCase = /[A-Z]/.test(control.value);
      const hasLowerCase = /[a-z]/.test(control.value);
      const hasNumber = /[0-9]/.test(control.value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(control.value);

      const valid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

      if (!valid) {
        return { passwordStrength: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' };
      }

      return null;
    };
  }

  // Confirm password match validator
  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const newPassword = control.get('newPassword');
      const confirmPassword = control.get('confirmPassword');

      if (!newPassword || !confirmPassword) {
        return null;
      }

      if (newPassword.value !== confirmPassword.value) {
        return { passwordMismatch: 'Passwords do not match' };
      }

      return null;
    };
  }

  // Helper methods for template
  get profileFormControls() {
    return this.profileForm.controls;
  }

  get passwordFormControls() {
    return this.passwordForm.controls;
  }
}
