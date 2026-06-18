import 'package:flutter/material.dart';

import 'bootstrap/iam_runtime.dart';
import 'bootstrap/session.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _authTokenController = TextEditingController();
  final _accessTokenController = TextEditingController();

  @override
  void dispose() {
    _authTokenController.dispose();
    _accessTokenController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final authToken = _authTokenController.text.trim();
    final accessToken = _accessTokenController.text.trim();
    if (authToken.isEmpty || accessToken.isEmpty) {
      return;
    }

    final snapshot = TerminalSessionSnapshot(
      authToken: authToken,
      accessToken: accessToken,
    );
    await TerminalSessionStore.save(snapshot);
    invalidateIamRuntime();
    initializeIamRuntime(snapshot);

    if (!mounted) {
      return;
    }

    Navigator.of(context).pushReplacementNamed('/');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Sign in',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Provide appbase IAM tokens to open the mobile shell.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _authTokenController,
                    decoration: const InputDecoration(
                      labelText: 'Auth token',
                      border: OutlineInputBorder(),
                    ),
                    autocorrect: false,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _accessTokenController,
                    decoration: const InputDecoration(
                      labelText: 'Access token',
                      border: OutlineInputBorder(),
                    ),
                    autocorrect: false,
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _submit,
                    child: const Text('Continue'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
