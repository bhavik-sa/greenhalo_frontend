import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BadgeService } from '../../../Services/badge.service';
import { ToastService } from '../../../shared/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './badge-edit.html',
  styleUrls: ['./badge-edit.css']
})
export class BadgeEditComponent implements OnInit {
  badgeForm: FormGroup;
  badgeId: string = '';
  isLoading = false;
  error: string | null = null;
  mediaTypes = ['VIDEO', 'ARTICLE', 'WEBINAR', 'INTERVIEW'];
  selectedIconFile: File | null = null;
  selectedMediaFile: File | null = null;
  previewIconUrl: string | ArrayBuffer | null = null;
  previewMediaUrl: string | ArrayBuffer | null = null;
  existingMedia: any = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private badgeService: BadgeService,
    private toast: ToastService
  ) {
    this.badgeForm = this.fb.group({
      title: ['', Validators.required],
      html_content: ['', Validators.required],
      status: [true],
      type: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.badgeId = id;
      this.loadBadgeDetails();
    } else {
      this.error = 'No badge ID provided';
    }
  }

  loadBadgeDetails(): void {
    this.isLoading = true;
    this.badgeService.getBadgeById(this.badgeId).subscribe({
      next: (response: any) => {
        const badge = response.data;
        this.badgeForm.patchValue({
          title: badge.title,
          html_content: badge.html_content,
          status: badge.status,
          type: badge.type || ''
        });
        
        if (badge.icon_url) {
          this.previewIconUrl = badge.icon_url;
        }
        
        if (badge.safer_dating_media && badge.safer_dating_media.length > 0) {
          this.existingMedia = badge.safer_dating_media[0];
          this.previewMediaUrl = this.existingMedia.url;
        }
        
        this.isLoading = false;
      },
      error: (err : any) => {
        console.error('Error loading badge:', err);
        this.error = err.error?.message || 'Failed to load badge details';
        this.toast.error(this.error || 'Failed to load badge details');
        this.isLoading = false;
      }
    });
  }

  onIconFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedIconFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.previewIconUrl = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onMediaFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedMediaFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.previewMediaUrl = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeIcon(): void {
    this.selectedIconFile = null;
    this.previewIconUrl = null;
    // If you want to remove the existing icon from the server, you'll need to handle that separately
  }

  removeMedia(): void {
    this.selectedMediaFile = null;
    this.previewMediaUrl = null;
    this.existingMedia = null;
  }

  onSubmit(): void {
    if (this.badgeForm.invalid) {
      this.badgeForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formData = new FormData();
    
    // Add form fields
    Object.keys(this.badgeForm.value).forEach(key => {
      if (this.badgeForm.value[key] !== null && this.badgeForm.value[key] !== undefined) {
        formData.append(key, this.badgeForm.value[key]);
      }
    });
    
    // Add files if selected
    if (this.selectedIconFile) {
      formData.append('icon_url', this.selectedIconFile);
    }
    
    if (this.selectedMediaFile) {
      formData.append('safer_dating_media_uri', this.selectedMediaFile);
    } else if (this.existingMedia) {
      // If we have existing media but no new file, we need to make sure the type is included
      formData.append('type', this.badgeForm.value.type || '');
    }

    this.badgeService.updateBadge(this.badgeId, formData).subscribe({
      next: (response) => {
        this.toast.success('Badge updated successfully');
        this.router.navigate(['/badge']);
      },
      error: (err) => {
        console.error('Error updating badge:', err);
        this.error = err.error?.message || 'Failed to update badge';
        this.toast.error(this.error || 'Failed to update badge');
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/badge']).catch(err => {
      console.error('Navigation error:', err);
    });
  }
}
