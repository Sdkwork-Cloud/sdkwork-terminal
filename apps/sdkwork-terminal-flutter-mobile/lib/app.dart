import 'package:flutter/material.dart';

class TerminalApp extends StatelessWidget {
  final Widget child;

  const TerminalApp({super.key, required this.child});

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
      home: child,
    );
  }
}
