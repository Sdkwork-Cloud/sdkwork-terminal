class AppRoute {
  final String path;
  final String? title;

  const AppRoute({
    required this.path,
    this.title,
  });
}

const List<AppRoute> shellRoutes = [
  AppRoute(path: '/', title: 'Home'),
  AppRoute(path: '/login', title: 'Login'),
  AppRoute(path: '/settings', title: 'Settings'),
];

final List<AppRoute> _contributedRoutes = [];

void registerRouteContributions(List<AppRoute> routes) {
  _contributedRoutes.addAll(routes);
}

List<AppRoute> getAppRoutes() {
  return [...shellRoutes, ..._contributedRoutes];
}
