class RuntimeConfig {
  final String baseUrl;
  final String apiVersion;
  final Map<String, String> headers;

  const RuntimeConfig({
    required this.baseUrl,
    this.apiVersion = 'v1',
    this.headers = const {},
  });

  factory RuntimeConfig.development() {
    return const RuntimeConfig(
      baseUrl: 'https://api-dev.sdkwork.com',
    );
  }

  factory RuntimeConfig.test() {
    return const RuntimeConfig(
      baseUrl: 'https://api-test.sdkwork.com',
    );
  }

  factory RuntimeConfig.staging() {
    return const RuntimeConfig(
      baseUrl: 'https://api-staging.sdkwork.com',
    );
  }

  factory RuntimeConfig.production() {
    return const RuntimeConfig(
      baseUrl: 'https://api.sdkwork.com',
    );
  }
}
