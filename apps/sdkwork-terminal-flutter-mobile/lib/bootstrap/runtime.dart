import 'environment.dart';

class RuntimeConfig {
  final String baseUrl;
  final String apiVersion;
  final Map<String, String> headers;

  const RuntimeConfig({
    required this.baseUrl,
    this.apiVersion = 'v1',
    this.headers = const {},
  });

  static String _resolvePlatformApiGatewayHttpUrl() {
    const topologyUrl = String.fromEnvironment(
      'SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL',
      defaultValue: String.fromEnvironment(
        'VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL',
      ),
    );
    if (topologyUrl.trim().isNotEmpty) {
      return topologyUrl.trim();
    }

    return Environment.platformApiGatewayHttpUrl;
  }

  factory RuntimeConfig.fromEnvironment() {
    return RuntimeConfig(
      baseUrl: _resolvePlatformApiGatewayHttpUrl(),
    );
  }

  factory RuntimeConfig.development() {
    return RuntimeConfig.fromEnvironment();
  }

  factory RuntimeConfig.test() {
    return RuntimeConfig.fromEnvironment();
  }

  factory RuntimeConfig.staging() {
    return RuntimeConfig.fromEnvironment();
  }

  factory RuntimeConfig.production() {
    return RuntimeConfig.fromEnvironment();
  }
}
