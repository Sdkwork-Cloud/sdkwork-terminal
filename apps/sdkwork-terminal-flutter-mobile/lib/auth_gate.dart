import 'package:flutter/material.dart';

import 'bootstrap/iam_runtime.dart';

class AuthGate extends StatelessWidget {
  final Widget child;

  const AuthGate({super.key, required this.child});

  static bool get iamRequired {
    const flag = String.fromEnvironment('SDKWORK_TERMINAL_IAM_REQUIRED');
    if (flag == 'true' || flag == '1') {
      return true;
    }
    if (flag == 'false' || flag == '0') {
      return false;
    }
    return const bool.fromEnvironment('dart.vm.product');
  }

  @override
  Widget build(BuildContext context) {
    if (!iamRequired) {
      return child;
    }

    if (!getIamRuntime().hasIamSession) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final navigator = Navigator.of(context);
        if (!navigator.mounted) {
          return;
        }
        navigator.pushReplacementNamed('/login');
      });
      return const SizedBox.shrink();
    }

    return child;
  }
}
