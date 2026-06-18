export interface AppRoute {
  path: string;
  title?: string;
}

const shellRoutes: AppRoute[] = [
  { path: '/', title: 'Home' },
  { path: '/login', title: 'Login' },
  { path: '/settings', title: 'Settings' },
];

const contributedRoutes: AppRoute[] = [];

export function registerRouteContributions(routes: readonly AppRoute[]): void {
  contributedRoutes.push(...routes);
}

export function getAppRoutes(): readonly AppRoute[] {
  return [...shellRoutes, ...contributedRoutes];
}

export const appRoutes = shellRoutes;
