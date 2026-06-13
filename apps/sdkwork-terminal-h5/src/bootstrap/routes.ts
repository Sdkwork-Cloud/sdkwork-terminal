export interface AppRoute {
  path: string;
  component: React.ComponentType;
  title?: string;
}

export const appRoutes: AppRoute[] = [
  { path: '/', component: () => null, title: 'Home' },
  { path: '/login', component: () => null, title: 'Login' },
  { path: '/settings', component: () => null, title: 'Settings' },
];

// TODO: Define route contributions from packages
// This should register routes from shell and capability packages
