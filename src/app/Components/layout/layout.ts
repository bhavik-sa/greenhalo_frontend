import { Component } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, Sidebar, Header, Footer],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
  standalone: true
})
export class Layout {
  sidebarCollapsed = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    // Store the state in localStorage to persist across page reloads
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
  }

  // Optional: Initialize the sidebar state from localStorage
  ngOnInit() {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      this.sidebarCollapsed = savedState === 'true';
    }
  }
}
