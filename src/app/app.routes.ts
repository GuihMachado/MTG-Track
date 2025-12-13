import { CanActivateFn, Router, Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { inject, PLATFORM_ID } from '@angular/core'; // <--- Importe PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // <--- Importe isPlatformBrowser
import { Dashboard } from './pages/dashboard/dashboard';

const authGuard: CanActivateFn = () => {
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (isPlatformBrowser(platformId)) {
        if (localStorage.getItem('auth-token')) {
        return true;
        }

        router.navigate(['/login']);
        return false;
    }
    return true; 
};

export const routes: Routes = [
    {
        path: '',
        component: Login
    },
    {
        path: 'register',
        component: Register
    },
    { 
        path: 'dashboard', 
        component: Dashboard,
        canActivate: [authGuard]
    },
];