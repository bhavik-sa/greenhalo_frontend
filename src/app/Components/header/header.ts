import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../Services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { environment } from '../../../environments/environment';
declare var bootstrap: any; // Declare bootstrap for dropdown functionality

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, AfterViewInit {
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  currentUser: any = null;
  
  private dropdown: any;
  profileImage: string | ArrayBuffer | null = null;
  uploadForm: FormGroup;
  @ViewChild('userDropdown', { static: false }) dropdownElement!: ElementRef;

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private toastService: ToastService
  ) {
    this.uploadForm = this.fb.group({
      profileImage: [null]
    });
  }

  ngOnInit(): void {
    // Get the current user from the auth service
    this.currentUser = this.authService.getProfile();
    this.currentUser.subscribe((response: any) => {
      this.currentUser = response.data;
      this.profileImage = this.currentUser.profile_url ? `${environment.apiUrl}/${this.currentUser.profile_url}` : '/assets/admin.webp';
    });
  }

  // Handle image loading errors
  onImageError(event: any) {
    // If image fails to load, fall back to default icon
    const imgElement = event.target;
    if (imgElement) {
      imgElement.style.display = 'none';
      const defaultAvatar = imgElement.parentElement?.querySelector('.default-avatar');
      if (defaultAvatar) {
        defaultAvatar.style.display = 'flex';
      }
    }
  }

  ngAfterViewInit(): void {
    // Initialize dropdown after view is ready
    if (this.dropdownElement) {
      this.dropdown = new bootstrap.Dropdown(this.dropdownElement.nativeElement);
    }
  }

  closeDropdown(): void {
    if (this.dropdown) {
      this.dropdown.hide();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.match('image.*')) {
        this.toastService.error('Please select a valid image file');
        return;
      }

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.toastService.error('Image size should be less than 2MB');
        return;
      }

      // Read the file and set as profile image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImage = e.target.result;
        // Here you would typically upload the image to your server
        // and update the user's profile with the new image URL
        this.uploadProfileImage(file);
      };
      reader.readAsDataURL(file);
    }
  }

  private uploadProfileImage(file: File): void {
    // Create form data
    const formData = new FormData();
    formData.append('profileImage', file);

    // Here you would typically make an HTTP request to your backend
    // to upload the image and get the URL
    // Example:
    /*
    this.authService.uploadProfileImage(formData).subscribe({
      next: (response) => {
        this.toastService.success('Profile image updated successfully');
        // Update the current user's profile image
        this.currentUser.profileImage = response.imageUrl;
        // You might want to update the user in local storage or service
      },
      error: (error) => {
        console.error('Error uploading image:', error);
        this.toastService.error('Failed to upload profile image');
        this.profileImage = null;
      }
    });
    */
    
    // For now, we'll just show a success message
    this.toastService.success('Profile image updated successfully (demo)');
  }

  logout(event: Event): void {
    event.preventDefault();
    this.closeDropdown();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
    // Toggle a class on the body for global state if needed
    document.body.classList.toggle('sidebar-collapsed');
  }
}
