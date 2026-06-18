import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_terminal_flutter_mobile/bootstrap/session.dart';

void main() {
  test('TerminalSessionSnapshot reports IAM session from tokens', () {
    const snapshot = TerminalSessionSnapshot(
      authToken: 'auth-token',
      accessToken: 'access-token',
    );

    expect(snapshot.hasIamSession, isTrue);
  });

  test('TerminalSessionStore reads dart-define tokens', () {
    const snapshot = TerminalSessionSnapshot(
      authToken: 'auth-token',
      accessToken: 'access-token',
    );

    expect(snapshot.toJson(), {
      'authToken': 'auth-token',
      'accessToken': 'access-token',
    });
    expect(
      TerminalSessionSnapshot.fromJson(snapshot.toJson()).hasIamSession,
      isTrue,
    );
  });
}
