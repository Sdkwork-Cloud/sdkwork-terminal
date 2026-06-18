import 'dart:io' show Platform;

enum HostPlatform {
  flutterIos,
  flutterAndroid,
}

class HostAdapters {
  final HostPlatform platform;

  const HostAdapters({required this.platform});
}

HostPlatform resolveHostPlatform() {
  const runtimeTarget = String.fromEnvironment('SDKWORK_TERMINAL_RUNTIME_TARGET');
  if (runtimeTarget == 'flutter-ios') {
    return HostPlatform.flutterIos;
  }
  if (runtimeTarget == 'flutter-android') {
    return HostPlatform.flutterAndroid;
  }

  if (Platform.isIOS) {
    return HostPlatform.flutterIos;
  }
  return HostPlatform.flutterAndroid;
}

HostAdapters createHostAdapters() {
  return HostAdapters(platform: resolveHostPlatform());
}
