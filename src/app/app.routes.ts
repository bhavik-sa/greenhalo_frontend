import { Routes } from '@angular/router';
import { Login } from './Components/login/login';
import { Dashboard } from './Components/dashboard/dashboard';
import { Layout } from './Components/layout/layout';
import { MfaComponent } from './Components/mfa/mfa';
import { authGuard } from './guards/auth.guard';
import { MfaSetup } from './Components/mfa-setup/mfa-setup';
import { guestGuard } from './guards/guest.guard';
import { mfaGuard } from './guards/mfa.guard';
import { ResetPassword } from './Components/reset-password/reset-password';
import { UserManagementComponent } from './Components/user-management/user-management';
import { CmsComponent } from './Components/cms/cms';
import { ContactUsComponent } from './Components/contact-us/contact-us';
import { BadgeEditComponent } from './Components/badge/badge-edit/badge-edit';
import { BadgeManagementComponent } from './Components/badge/badge';
import { AuditHistoryComponent } from './Components/audit-history/audit-history';
import { ProfileComponent } from './Components/profile/profile';
export const routes: Routes = [
    {
        path: '',
        component: Login,
        pathMatch: 'full',
        canActivate: [guestGuard]
    },
    {
        path: 'login',
        component: Login,
        canActivate: [guestGuard]
    },
    {
        path: 'reset-password',
        component: ResetPassword,
        title: 'Reset Password'
    },
    {
        path: 'mfa',
        component: MfaComponent,
        canActivate: [mfaGuard],
        title: 'Multi‑Factor Authentication'
    },
    {
        path: 'settings/mfa',
        component: MfaSetup,
        title: 'Setup MFA'
    },
    {
        path: '',
        component: Layout,
        children: [
            {
                path: 'dashboard',
                component: Dashboard,
                canActivate: [authGuard],
                title: 'Dashboard',
            },
            {
                path: 'user-management',
                component: UserManagementComponent,
                canActivate: [authGuard],
                title: 'User Management'
            },
            {
                path: 'cms',
                component: CmsComponent,
                canActivate: [authGuard],
                title: 'CMS Pages'
            },
            {
                path: 'contact-us',
                component: ContactUsComponent,
                canActivate: [authGuard],
                title: 'Contact Us'
            },

            {
                path: 'badge',
                component: BadgeManagementComponent,
                canActivate: [authGuard],
                title: 'Badge Management'
            },
            {
                path: 'badge/:id/edit',
                component: BadgeEditComponent,
                canActivate: [authGuard],
                title: 'Edit Badge'
            },
            {
                path: 'audit-history',
                component: AuditHistoryComponent,
                canActivate: [authGuard],
                title: 'Audit History'
            },
            {
                path: 'profile',
                component: ProfileComponent,
                canActivate: [authGuard],
                title: 'Profile',
                data: { activeTab: 'profile' }
            }
        ],
    },
];