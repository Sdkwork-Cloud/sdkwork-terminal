import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TerminalSessionSnapshot {
  final String? accessToken;
  final String? authToken;
  final String? refreshToken;

  const TerminalSessionSnapshot({
    this.accessToken,
    this.authToken,
    this.refreshToken,
  });

  bool get hasIamSession =>
      (authToken?.isNotEmpty ?? false) || (accessToken?.isNotEmpty ?? false);

  Map<String, String> toJson() {
    return {
      if (accessToken != null) 'accessToken': accessToken!,
      if (authToken != null) 'authToken': authToken!,
      if (refreshToken != null) 'refreshToken': refreshToken!,
    };
  }

  factory TerminalSessionSnapshot.fromJson(Map<String, dynamic> json) {
    return TerminalSessionSnapshot(
      accessToken: json['accessToken'] as String?,
      authToken: json['authToken'] as String?,
      refreshToken: json['refreshToken'] as String?,
    );
  }
}

class TerminalSessionStore {
  static const _storageKey = 'sdkwork-terminal.iam.session';
  static const _secureStorage = FlutterSecureStorage();

  static TerminalSessionSnapshot? readFromDartDefine() {
    const accessToken = String.fromEnvironment('SDKWORK_ACCESS_TOKEN');

    if (accessToken.isEmpty) {
      return null;
    }

    return TerminalSessionSnapshot(
      accessToken: accessToken,
    );
  }

  static Future<TerminalSessionSnapshot?> load() async {
    final fromDefine = readFromDartDefine();
    if (fromDefine != null) {
      return fromDefine;
    }

    final raw = await _secureStorage.read(key: _storageKey);
    if (raw == null || raw.trim().isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final snapshot = TerminalSessionSnapshot.fromJson(decoded);
      return snapshot.hasIamSession ? snapshot : null;
    } catch (_) {
      return null;
    }
  }

  static Future<void> save(TerminalSessionSnapshot snapshot) async {
    await _secureStorage.write(
      key: _storageKey,
      value: jsonEncode(snapshot.toJson()),
    );
  }

  static Future<void> clear() async {
    await _secureStorage.delete(key: _storageKey);
  }
}
