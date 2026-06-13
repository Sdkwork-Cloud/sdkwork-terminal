# SDKWork Terminal Applications

This directory contains all SDKWork Terminal application roots, organized by platform and runtime target.

## Directory Structure

```text
apps/
  sdkwork-terminal-pc/              # PC desktop/browser application (React + Tauri)
  sdkwork-terminal-flutter-mobile/  # Flutter mobile application (iOS + Android)
  sdkwork-terminal-h5/              # H5 mobile web application (React + Capacitor)
```

## Application Types

### PC Application (`sdkwork-terminal-pc`)

- **Framework**: React + Tauri
- **Platforms**: Windows, macOS, Linux desktop; iPadOS, Android tablet
- **Package naming**: `sdkwork-terminal-pc-*`
- **Spec**: `APP_PC_ARCHITECTURE_SPEC.md`, `DESKTOP_APP_ARCHITECTURE_SPEC.md`

### Flutter Mobile Application (`sdkwork-terminal-flutter-mobile`)

- **Framework**: Flutter/Dart
- **Platforms**: iOS, Android
- **Package naming**: `sdkwork_terminal_flutter_mobile_*`
- **Spec**: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md`, `APP_FLUTTER_UI_SPEC.md`

### H5 Application (`sdkwork-terminal-h5`)

- **Framework**: React + Vite
- **Platforms**: Mobile browsers, WeChat-H5, Capacitor iOS/Android
- **Package naming**: `sdkwork-terminal-h5-*`
- **Spec**: `APP_H5_ARCHITECTURE_SPEC.md`, `APP_MOBILE_REACT_UI_SPEC.md`

## Cross-Client Alignment

All applications share:

- Common route identity per `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
- Common SDK integration patterns per `APP_SDK_INTEGRATION_SPEC.md`
- Common IAM runtime per `IAM_LOGIN_INTEGRATION_SPEC.md`

## Development

Each application root is self-contained with its own build tooling, dependencies, and configuration.

### PC Application

```bash
cd apps/sdkwork-terminal-pc
pnpm install
pnpm dev          # Browser mode
pnpm tauri:dev    # Desktop mode
```

### Flutter Mobile Application

```bash
cd apps/sdkwork-terminal-flutter-mobile
flutter pub get
flutter run       # iOS/Android simulator or device
```

### H5 Application

```bash
cd apps/sdkwork-terminal-h5
pnpm install
pnpm dev          # Mobile browser mode
```
