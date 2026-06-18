import 'package:flutter/material.dart';

import 'app.dart';
import 'bootstrap/iam_runtime.dart';
import 'bootstrap/session.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final session = await TerminalSessionStore.load();
  initializeIamRuntime(session);
  runApp(const TerminalApp());
}
