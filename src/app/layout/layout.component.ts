import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Header } from '../Components/header/header';
import { Sidebar } from '../Components/sidebar/sidebar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Sidebar],
  template: `
    <div class="wrapper" [class.sidebar-collapse]="isSidebarCollapsed">
      <app-header (toggleSidebarEvent)="toggleSidebar()"></app-header>
      <app-sidebar [isCollapsed]="isSidebarCollapsed"></app-sidebar>
      <div class="content-wrapper">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .wrapper {
      display: flex;
      min-height: 100vh;
      flex-direction: column;
      transition: all 0.3s;
    }
    
    .content-wrapper {
      flex: 1;
      margin-left: 250px; /* Same as sidebar width */
      padding: 20px;
      transition: margin-left 0.3s ease;
    }
    
    .sidebar-collapse .content-wrapper {
      margin-left: 64px; /* Collapsed sidebar width */
    }
    
    /* Sidebar styling */
    .main-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      padding-top: 50px;
      height: 100vh;
      width: 250px;
      z-index: 1038;
      transition: transform 0.3s ease-in-out, width 0.3s ease-in-out;
      overflow-y: auto;
    }
    
    .main-sidebar.sidebar-collapse {
      width: 64px;
    }
    
    /* Adjust content when sidebar is collapsed */
    .sidebar-collapse .main-sidebar {
      width: 64px;
    }
    
    /* Hide text when sidebar is collapsed */
    .sidebar-collapse .nav-link p {
      display: none;
    }
    
    .sidebar-collapse .brand-text {
      display: none;
    }
  `]
})
export class LayoutComponent {
  isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    document.body.classList.toggle('sidebar-collapsed', this.isSidebarCollapsed);
  }
}
