import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Sidebar, Footer],
  template: `
    <div class="app-wrapper" [class.sidebar-collapse]="isSidebarCollapsed">

      <!-- Header Start -->
      <app-header (toggleSidebarEvent)="toggleSidebar()"></app-header>
      <!-- Header End -->

      <!-- Sidebar Start -->
      <aside class="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        <app-sidebar [isCollapsed]="isSidebarCollapsed"></app-sidebar>
      </aside>
      <!-- Sidebar End -->

      <!-- Main Start -->
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
      <!-- Main End -->

      <!-- Footer Start -->
      <app-footer></app-footer>
      <!-- Footer End -->

    </div>
  `,
 
})
export class LayoutComponent implements OnInit {
  isSidebarCollapsed = false;

  ngOnInit(): void {
    // Initialize sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    this.isSidebarCollapsed = savedState ? JSON.parse(savedState) : false;

    // Apply initial state to body class
    if (this.isSidebarCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    // Save state to localStorage
    localStorage.setItem('sidebarCollapsed', JSON.stringify(this.isSidebarCollapsed));

    // Apply/remove body class for global state
    document.body.classList.toggle('sidebar-collapsed', this.isSidebarCollapsed);
  }
}
