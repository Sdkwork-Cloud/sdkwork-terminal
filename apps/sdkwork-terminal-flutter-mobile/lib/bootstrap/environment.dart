class Environment {
  static const String development = 'development';
  static const String test = 'test';
  static const String staging = 'staging';
  static const String production = 'production';

  static String get current {
    const env = String.fromEnvironment(
      'SDKWORK_TERMINAL_ENVIRONMENT',
      defaultValue: development,
    );
    return env;
  }

  static bool get isDevelopment => current == development;
  static bool get isTest => current == test;
  static bool get isStaging => current == staging;
  static bool get isProduction => current == production;

  static String get platformApiGatewayHttpUrl {
    const topologyUrl = String.fromEnvironment(
      'SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL',
      defaultValue: String.fromEnvironment(
        'VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL',
      ),
    );
    if (topologyUrl.trim().isNotEmpty) {
      return topologyUrl.trim();
    }

    switch (current) {
      case production:
        return 'https://api.sdkwork.com';
      case staging:
        return 'https://api-staging.sdkwork.com';
      case test:
        return 'https://api-test.sdkwork.com';
      default:
        return 'https://api-dev.sdkwork.com';
    }
  }
}
