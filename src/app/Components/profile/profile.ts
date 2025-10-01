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
    // Initialize profile form with all fields optional
    this.profileForm = this.fb.group({
      name: [''],
      email: ['', [Validators.email]],  // Email is optional but must be valid if provided
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

  // Load user profile data
  loadProfile(): void {
    this.isLoading = true;
    this.authService.getProfile().subscribe({
      next: (response: any) => {
        this.userProfile = response.data;

        // Handle profile URL with fallback to default
        const profileUrl = this.userProfile.profile_url
          ? `${environment.apiUrl}/${this.userProfile.profile_url}`
          : '/assets/admin.webp';

        // Update userProfile object
        this.userProfile.profile_url = profileUrl;

        // Patch only the values that exist in the response
        const formData: any = {};
        if (this.userProfile.name) formData.name = this.userProfile.name;
        if (this.userProfile.email) formData.email = this.userProfile.email;
        formData.profile_url = profileUrl;

        this.profileForm.patchValue(formData);

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

      const formData = new FormData();
      formData.append('profile_image', this.selectedFile, this.selectedFile.name);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        const error = new Error('No authentication token found');
        console.error('Auth error:', error);
        reject(error);
        return;
      }



      this.http.put<{ url: string, status: number }>(`${environment.apiUrl}/auth/profile`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        reportProgress: true
      }).subscribe({
        next: (response: { url: string, status: number }) => {
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
    // Check if the form is valid (email format if provided)
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    try {
      const formData = new FormData();
      let hasChanges = false;
      const formValues = this.profileForm.value;

      // Check which fields have been changed and add them to formData
      if (formValues.name !== undefined && formValues.name !== this.userProfile?.name) {
        formData.append('name', formValues.name);
        hasChanges = true;
      }

      if (formValues.email !== undefined && formValues.email !== this.userProfile?.email) {
        formData.append('email', formValues.email);
        hasChanges = true;
      }

      // Handle profile image if changed
      if (formValues.profile_url instanceof File) {
        formData.append('profile_image', formValues.profile_url);
        hasChanges = true;
      }

      // If no changes, show message and return
      if (!hasChanges) {
        this.toastService.info('No changes detected.');
        this.isLoading = false;
        return;
      }

      // Call the update service
      this.authService.updateProfile(formData).subscribe({
        next: (response) => {
          this.toastService.success('Profile updated successfully!');
          this.loadProfile(); // Reload profile to get updated data
          this.isLoading = false;
          this.profileImagePreview = null; // Reset preview
          this.selectedFile = null; // Reset selected file
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.toastService.error(error.error?.message || 'Failed to update profile. Please try again.');
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error in profile update:', error);
      this.toastService.error('An error occurred while updating your profile');
      this.isLoading = false;
    }
  }

  resetForm(): void {
    this.profileForm.reset();
    this.profileImagePreview = null;
    this.selectedFile = null;
    // Reset the file input element
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Change password
  onChangePassword(): void {
    // Mark all fields as touched to trigger validation messages
    this.passwordForm.markAllAsTouched();
    
    // Check if form is invalid
    if (this.passwordForm.invalid) {
      // Find the first invalid control and show its error
      const invalidControl = Object.keys(this.passwordForm.controls).find(key => {
        const control = this.passwordForm.get(key);
        return control?.invalid && (control?.touched || control?.dirty);
      });
      
      if (invalidControl) {
        const control = this.passwordForm.get(invalidControl);
        const errors = control?.errors || {};
        
        if (errors['required']) {
          const fieldName = invalidControl === 'currentPassword' ? 'Current password' : 
                           invalidControl === 'newPassword' ? 'New password' : 'Confirm password';
          this.toastService.error(`${fieldName} is required`);
        } else if (errors['minlength']) {
          this.toastService.error('Password must be at least 8 characters long');
        } else if (errors['passwordStrength']) {
          this.toastService.error(errors['passwordStrength']);
        } else if (errors['passwordMismatch']) {
          this.toastService.error('New password and confirm password do not match');
        } else {
          this.toastService.error('Please fill in all required fields correctly');
        }
      } else {
        this.toastService.error('Please correct the errors in the form');
      }
      return;
    }
    
    // Check if passwords match (additional check, though form validation should catch this)
    if (this.passwordForm.value.newPassword !== this.passwordForm.value.confirmPassword) {
      this.toastService.error('New password and confirm password do not match');
      return;
    }
    
    this.isPasswordLoading = true;
    const { currentPassword, newPassword } = this.passwordForm.value;
    
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (response) => {
        this.toastService.success(response.message);
        this.passwordForm.reset();
        this.isPasswordLoading = false;
        
        // Optional: Close the password form or switch to profile tab
      },
      error: (error) => {
        console.error('Password change error:', error);
        
        // Default error message
        let errorMessage = 'Failed to change password. Please try again.';
        
        // Extract error message from different possible locations in the error object
        if (error?.message) {
          errorMessage = error.message;
        } else if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.error) {
          // Handle error object that might be a string or an object
          errorMessage = typeof error.error === 'string' 
            ? error.error 
            : 'Invalid password or server error';
        }
        
        // Log the error for debugging
        console.log('Displaying error toast with message:', errorMessage);
        
        // Show error to user with a longer timeout
        this.toastService.error(errorMessage, 'Error', 10000);
        
        // Clear sensitive fields on error
        this.passwordForm.get('currentPassword')?.reset();
        this.passwordForm.get('newPassword')?.reset();
        this.passwordForm.get('confirmPassword')?.reset();
        
        this.isPasswordLoading = false;
      }
    });
  }

  // Custom password validator
  private passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value || typeof value !== 'string') {
        return null; // Return null for empty or invalid values
      }

      const hasMinLength = value.length >= 8;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      // If all validations pass
      if (hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar) {
        return null;
      }

      // If any validation fails, return the standard error message
      return {
        passwordStrength: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
      };
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

      // Only validate if both fields have values
      if (!newPassword.value || !confirmPassword.value) {
        return null;
      }

      if (newPassword.value !== confirmPassword.value) {
        // Set error on confirmPassword control
        confirmPassword.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      } else {
        // Clear any existing mismatch errors
        if (confirmPassword.hasError('passwordMismatch')) {
          delete confirmPassword.errors?.['passwordMismatch'];
          confirmPassword.updateValueAndValidity();
        }
        return null;
      }
    };
  }

  // Helper methods for template
  get profileFormControls() {
    return this.profileForm.controls;
  }

  get passwordFormControls() {
    return this.passwordForm.controls;
  }

  // Handle closing the profile/password forms
  onClose(): void {
    // Reset forms
    this.resetForm();
    this.passwordForm.reset();

    // Navigate back to the dashboard
    this.router.navigate(['/dashboard']);
  }
}