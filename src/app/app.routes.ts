import { CanActivateFn, Router, Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { inject } from '@angular/core';

const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  
  if (localStorage.getItem('auth-token')) return true;
  
  router.navigate(['/login']);
  return false;
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
        component: Register,
        canActivate: [authGuard]
    },
];