import 'package:sdkwork_appbase_app_sdk/sdkwork_appbase_app_sdk.dart';

import 'environment.dart';
import 'session.dart';

const _appApiPrefix = '/app/v3/api';

class IamRuntime {
  final String baseUrl;
  final TerminalSessionSnapshot? session;
  final SdkworkAppClient appbaseApp;

  IamRuntime._({
    required this.baseUrl,
    required this.session,
    required this.appbaseApp,
  });

  bool get hasIamSession => session?.hasIamSession ?? false;

  factory IamRuntime.create({TerminalSessionSnapshot? session}) {
    final baseUrl = _normalizeGeneratedSdkBaseUrl(
      Environment.platformApiGatewayHttpUrl,
      _appApiPrefix,
    );
    final resolvedSession = session;

    return IamRuntime._(
      baseUrl: baseUrl,
      session: resolvedSession,
      appbaseApp: SdkworkAppClient.withBaseUrl(
        baseUrl: baseUrl,
        authToken: resolvedSession?.authToken,
        accessToken: resolvedSession?.accessToken,
      ),
    );
  }

  static String _normalizeGeneratedSdkBaseUrl(String baseUrl, String apiPrefix) {
    final normalizedBaseUrl = baseUrl.replaceAll(RegExp(r'/+$'), '');
    final normalizedApiPrefix = apiPrefix.replaceAll(RegExp(r'/+$'), '');
    if (normalizedBaseUrl.endsWith(normalizedApiPrefix)) {
      final trimmed = normalizedBaseUrl.substring(
        0,
        normalizedBaseUrl.length - normalizedApiPrefix.length,
      );
      return trimmed.isEmpty ? normalizedBaseUrl : trimmed;
    }
    return normalizedBaseUrl;
  }
}

IamRuntime? _cachedIamRuntime;

void initializeIamRuntime(TerminalSessionSnapshot? session) {
  _cachedIamRuntime = IamRuntime.create(session: session);
}

void invalidateIamRuntime() {
  _cachedIamRuntime = null;
}

IamRuntime getIamRuntime() {
  return _cachedIamRuntime ??= IamRuntime.create();
}
