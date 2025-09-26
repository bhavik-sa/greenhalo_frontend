import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Badge {
  _id: string;
  title: string;
  icon_url: string;
  html_content: string;
  status: boolean;
  type?: string;
  safer_dating_media?: {
    url: string;
    original_name: string;
    size: number;
    mime_type: string;
  }[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

@Injectable({
  providedIn: 'root'
})
export class BadgeService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getBadgeById(badgeId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/admin/badge?badgeId=${badgeId}`,
      this.getHeaders()
    );
  }

  updateBadge(badgeId: string, formData: FormData): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/admin/update/badge/${badgeId}`, 
      formData,
      this.getHeaders()
    );
  }
}
