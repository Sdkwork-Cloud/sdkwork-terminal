import 'package:flutter/material.dart';

import 'auth_gate.dart';
import 'home_page.dart';
import 'login_page.dart';

class TerminalApp extends StatelessWidget {
  const TerminalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SDKWork Terminal',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3B82F6),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/login': (_) => const LoginPage(),
        '/': (_) => const AuthGate(child: TerminalHomePage()),
      },
    );
  }
}
