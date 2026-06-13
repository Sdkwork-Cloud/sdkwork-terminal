import type { ComponentType } from 'react';

export interface AppRoute {
  path: string;
  component: ComponentType;
  title?: string;
  icon?: string;
}

export const appRoutes: AppRoute[] = [
  { path: '/', component: () => null, title: 'Home' },
  { path: '/login', component: () => null, title: 'Login' },
  { path: '/settings', component: () => null, title: 'Settings' },
];

export const consoleRoutes: AppRoute[] = [
  { path: '/console', component: () => null, title: 'Console' },
  { path: '/console/settings', component: () => null, title: 'Console Settings' },
];

export const adminRoutes: AppRoute[] = [
  { path: '/admin', component: () => null, title: 'Admin' },
  { path: '/admin/users', component: () => null, title: 'User Management' },
];
