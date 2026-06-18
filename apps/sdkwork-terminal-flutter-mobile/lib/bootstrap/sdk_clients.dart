import 'iam_runtime.dart';
import 'runtime.dart';

class SdkClients {
  final String baseUrl;
  final String apiVersion;
  final IamRuntime iamRuntime;

  SdkClients({
    required this.baseUrl,
    required this.apiVersion,
    required this.iamRuntime,
  });

  factory SdkClients.create() {
    final runtimeConfig = RuntimeConfig.fromEnvironment();
    final iamRuntime = getIamRuntime();

    return SdkClients(
      baseUrl: runtimeConfig.baseUrl,
      apiVersion: runtimeConfig.apiVersion,
      iamRuntime: iamRuntime,
    );
  }
}

SdkClients? _cachedSdkClients;

SdkClients getSdkClients() {
  return _cachedSdkClients ??= SdkClients.create();
}
