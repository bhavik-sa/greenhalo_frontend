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
            }
        ],
    },
];
