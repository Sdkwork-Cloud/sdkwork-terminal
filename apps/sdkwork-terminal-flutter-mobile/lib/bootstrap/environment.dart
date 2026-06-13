class Environment {
  static const String development = 'development';
  static const String test = 'test';
  static const String staging = 'staging';
  static const String production = 'production';

  static String get current {
    const env = String.fromEnvironment('ENVIRONMENT', defaultValue: development);
    return env;
  }

  static bool get isDevelopment => current == development;
  static bool get isTest => current == test;
  static bool get isStaging => current == staging;
  static bool get isProduction => current == production;
}
