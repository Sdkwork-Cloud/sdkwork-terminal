import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  DEFAULT_DEV_PROFILE_ID,
  loadProfile,
  resolveSurfaceHttpUrl,
  spec,
} from '../scripts/lib/terminal-topology.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const retiredClientEnvKeys = spec.retired?.envKeys ?? [];

function readProfileFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('terminal topology spec matches sdkwork v2 contract', () => {
  assert.equal(spec.schemaVersion, 2);
  assert.equal(spec.appId, 'sdkwork-terminal');
  assert.equal(spec.archetype, 'application-http-gateway');
  assert.equal(DEFAULT_DEV_PROFILE_ID, 'standalone.split-services.development');
});

test('standalone development profile exposes topology surface client keys', () => {
  const profile = loadProfile('standalone.split-services.development');

  assert.equal(profile.SDKWORK_TERMINAL_DEPLOYMENT_PROFILE, 'standalone');
  assert.equal(profile.SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_AUTOSTART, 'true');
  assert.equal(
    profile.SDKWORK_API_CLOUD_GATEWAY_CONFIG,
    '../sdkwork-api-cloud-gateway/configs/sdkwork-api-cloud-gateway.development.toml.example',
  );
  assert.equal(
    resolveSurfaceHttpUrl(profile, 'application.public-ingress'),
    'http://127.0.0.1:9620',
  );
  assert.equal(
    resolveSurfaceHttpUrl(profile, 'platform.api-gateway'),
    'http://127.0.0.1:3900',
  );
  assert.equal(
    profile.VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL,
    'http://127.0.0.1:3900',
  );
  assert.equal(
    profile.VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL,
    'http://127.0.0.1:9620',
  );
});

test('self-hosted production profile aligns runtime-node bind with deployments', () => {
  const profile = loadProfile('standalone.split-services.production');

  assert.equal(
    resolveSurfaceHttpUrl(profile, 'application.public-ingress'),
    'http://127.0.0.1:9620',
  );
  assert.equal(profile.SDKWORK_RUNTIME_NODE_BIND_ADDR, '127.0.0.1:9620');
});

test('cloud production profile uses SaaS platform and application URLs', () => {
  const profile = loadProfile('cloud.split-services.production');

  assert.equal(
    resolveSurfaceHttpUrl(profile, 'platform.api-gateway'),
    'https://api.sdkwork.com',
  );
  assert.equal(
    resolveSurfaceHttpUrl(profile, 'application.public-ingress'),
    'https://api.sdkwork.com/apps/sdkwork-terminal',
  );
});

test('topology profile env files do not retain retired client bridge keys', () => {
  for (const [profileId, relativePath] of Object.entries(spec.profileFiles)) {
    const contents = readProfileFile(relativePath);
    for (const retiredKey of retiredClientEnvKeys) {
      assert.doesNotMatch(
        contents,
        new RegExp(`^${retiredKey}=`, 'm'),
        `${profileId} still declares retired env key ${retiredKey}`,
      );
    }
  }
});

test('resolveBuildProfileId maps deployment profile to production split-services profiles', async () => {
  const { resolveBuildProfileId } = await import('../scripts/lib/terminal-topology.mjs');

  assert.equal(
    resolveBuildProfileId('cloud'),
    'cloud.split-services.production',
  );
  assert.equal(
    resolveBuildProfileId('standalone'),
    'standalone.split-services.production',
  );
});

test('terminal dev orchestrator injects IAM application bootstrap env', () => {
  const devScript = fs.readFileSync(path.join(repoRoot, 'scripts/terminal-dev.mjs'), 'utf8');
  const topologyAdapter = fs.readFileSync(
    path.join(repoRoot, 'scripts/lib/terminal-topology.mjs'),
    'utf8',
  );

  assert.match(devScript, /resolveIamDevEnv/);
  assert.match(devScript, /IAM_APPLICATION_BOOTSTRAP_ENV/);
  assert.match(topologyAdapter, /SDKWORK_TERMINAL_APP_ROOT/u);
});

test('terminal-build resolves workspace scripts from target', async () => {
  const { resolveWorkspaceScript } = await import('../scripts/terminal-build.mjs');

  assert.equal(resolveWorkspaceScript({ target: 'all', debug: false }), 'build');
  assert.equal(resolveWorkspaceScript({ target: 'web', debug: false }), 'build:web');
  assert.equal(resolveWorkspaceScript({ target: 'desktop', debug: false }), 'tauri:build');
  assert.equal(resolveWorkspaceScript({ target: 'desktop', debug: true }), 'tauri:check');
});

test('repo root exposes topology orchestration scripts', () => {
  const rootPackage = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );

  assert.equal(
    rootPackage.scripts?.['terminal:dev'],
    'node scripts/terminal-dev.mjs --target desktop',
  );
  assert.equal(
    rootPackage.scripts?.['terminal:build'],
    'node scripts/terminal-build.mjs --deployment-profile cloud',
  );
  assert.equal(
    rootPackage.scripts?.['topology:verify'],
    'pnpm topology:validate && pnpm topology:test && node scripts/terminal-dev.mjs --dry-run && node scripts/terminal-dev.mjs --dry-run --deployment-profile cloud',
  );
  assert.equal(
    rootPackage.dependencies?.['@sdkwork/app-topology'],
    'file:../sdkwork-app-topology',
  );
});

test('pc workspace dev scripts delegate to repo-root topology orchestrator', () => {
  const pcPackage = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'apps/sdkwork-terminal-pc/package.json'),
      'utf8',
    ),
  );

  assert.equal(
    pcPackage.scripts?.dev,
    'node ../../scripts/terminal-dev.mjs --target desktop',
  );
  assert.equal(
    pcPackage.scripts?.['dev:web'],
    'node ../../scripts/terminal-dev.mjs --target web',
  );
});

test('resolvePlatformGatewaySpawnPlan targets sibling sdkwork-api-cloud-gateway checkout', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    API_GATEWAY_REPO_ROOT,
    createPlatformGatewaySpawnPlan,
    loadProfile,
    resolvePlatformGatewayConfigPath,
    shouldAutostartGateway,
  } = await import('../scripts/lib/terminal-topology.mjs');

  const profile = loadProfile('standalone.split-services.development');
  assert.equal(shouldAutostartGateway(profile), true);

  const configPath = resolvePlatformGatewayConfigPath(profile);
  assert.equal(
    path.basename(configPath),
    'sdkwork-api-cloud-gateway.development.toml.example',
  );

  if (!fs.existsSync(path.join(API_GATEWAY_REPO_ROOT, 'Cargo.toml'))) {
    return;
  }

  const spawnPlan = createPlatformGatewaySpawnPlan(profile);
  assert.equal(spawnPlan.command, 'cargo');
  assert.equal(spawnPlan.args.at(-1), configPath);
  assert.match(spawnPlan.args.join(' '), /sdkwork-api-cloud-gateway-api-server/);
});

test('topology packaging targets align with desktop release matrix', async () => {
  const { DESKTOP_RELEASE_MATRIX } = await import(
    '../apps/sdkwork-terminal-pc/tools/release/resolve-desktop-release-plan.mjs'
  );

  assert.equal(spec.packaging?.targets?.length, DESKTOP_RELEASE_MATRIX.length);

  for (const [index, matrixEntry] of DESKTOP_RELEASE_MATRIX.entries()) {
    const target = spec.packaging.targets[index];
    assert.equal(target.platform, matrixEntry.platform);
    assert.equal(target.architecture, matrixEntry.arch);
    assert.equal(target.runner, matrixEntry.runner);
    assert.equal(target.rustTarget, matrixEntry.target);
    assert.deepEqual(
      target.formats,
      matrixEntry.bundles.split(','),
    );
    assert.equal(target.profile, 'cloud.split-services.production');
  }
});

test('satellite client bootstraps read topology platform gateway keys', () => {
  const h5Environment = readProfileFile(
    'apps/sdkwork-terminal-h5/src/bootstrap/environment.ts',
  );
  const h5Runtime = readProfileFile('apps/sdkwork-terminal-h5/src/bootstrap/runtime.ts');
  const flutterEnvironment = readProfileFile(
    'apps/sdkwork-terminal-flutter-mobile/lib/bootstrap/environment.dart',
  );
  const flutterRuntime = readProfileFile(
    'apps/sdkwork-terminal-flutter-mobile/lib/bootstrap/runtime.dart',
  );

  assert.match(h5Environment, /VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL/);
  assert.match(h5Environment, /VITE_SDKWORK_TERMINAL_ENVIRONMENT/);
  assert.match(h5Runtime, /VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL/);
  assert.match(flutterEnvironment, /SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL/);
  assert.match(flutterEnvironment, /SDKWORK_TERMINAL_ENVIRONMENT/);
  assert.doesNotMatch(flutterEnvironment, /ENVIRONMENT', defaultValue/);
  assert.match(flutterRuntime, /SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL/);
});

test('satellite client bootstraps wire generated appbase SDK clients', () => {
  const h5IamRuntime = readProfileFile('apps/sdkwork-terminal-h5/src/bootstrap/iamRuntime.ts');
  const h5SdkClients = readProfileFile('apps/sdkwork-terminal-h5/src/bootstrap/sdkClients.ts');
  const h5HostAdapters = readProfileFile('apps/sdkwork-terminal-h5/src/bootstrap/hostAdapters.ts');
  const flutterIamRuntime = readProfileFile(
    'apps/sdkwork-terminal-flutter-mobile/lib/bootstrap/iam_runtime.dart',
  );
  const flutterSdkClients = readProfileFile(
    'apps/sdkwork-terminal-flutter-mobile/lib/bootstrap/sdk_clients.dart',
  );
  const flutterHostAdapters = readProfileFile(
    'apps/sdkwork-terminal-flutter-mobile/lib/bootstrap/host_adapters.dart',
  );

  assert.match(h5IamRuntime, /@sdkwork\/iam-app-sdk/);
  assert.match(h5IamRuntime, /createClient/);
  assert.match(h5SdkClients, /appbaseApp/);
  assert.doesNotMatch(h5IamRuntime, /TODO/);
  assert.doesNotMatch(h5SdkClients, /TODO/);
  assert.doesNotMatch(h5HostAdapters, /TODO/);
  assert.match(flutterIamRuntime, /SdkworkAppClient/);
  assert.match(flutterSdkClients, /getIamRuntime/);
  assert.doesNotMatch(flutterIamRuntime, /TODO/);
  assert.doesNotMatch(flutterSdkClients, /TODO/);
  assert.doesNotMatch(flutterHostAdapters, /TODO/);
});

test('satellite clients expose login routes and secure session storage', () => {
  const h5Main = readProfileFile('apps/sdkwork-terminal-h5/src/main.tsx');
  const h5AuthGate = readProfileFile('apps/sdkwork-terminal-h5/src/AuthGate.tsx');
  const h5LoginPage = readProfileFile('apps/sdkwork-terminal-h5/src/LoginPage.tsx');
  const flutterApp = readProfileFile('apps/sdkwork-terminal-flutter-mobile/lib/app.dart');
  const flutterAuthGate = readProfileFile('apps/sdkwork-terminal-flutter-mobile/lib/auth_gate.dart');
  const flutterLoginPage = readProfileFile('apps/sdkwork-terminal-flutter-mobile/lib/login_page.dart');
  const flutterSession = readProfileFile('apps/sdkwork-terminal-flutter-mobile/lib/bootstrap/session.dart');

  assert.match(h5Main, /LoginPage/);
  assert.match(h5AuthGate, /Navigate to="\/login"/);
  assert.match(h5LoginPage, /setTokens/);
  const h5App = readProfileFile('apps/sdkwork-terminal-h5/src/App.tsx');
  assert.match(h5App, /@sdkwork\/terminal-h5-shell/);
  assert.doesNotMatch(h5App, /useState\(0\)/);
  const h5Vite = readProfileFile('apps/sdkwork-terminal-h5/vite.config.ts');
  assert.match(h5Vite, /@sdkwork\/iam-app-sdk/);
  assert.match(h5Vite, /@sdkwork\/terminal-h5-shell/);
  const h5Tsconfig = JSON.parse(readProfileFile('apps/sdkwork-terminal-h5/tsconfig.json'));
  assert.match(
    h5Tsconfig.compilerOptions.paths['@sdkwork/iam-app-sdk'][0],
    /server-openapi\/src\/index\.ts$/,
  );
  assert.match(flutterApp, /\/login/);
  assert.match(flutterAuthGate, /pushReplacementNamed\('\/login'\)/);
  assert.match(flutterLoginPage, /TerminalSessionStore\.save/);
  assert.match(flutterSession, /FlutterSecureStorage/);
  const flutterHome = readProfileFile('apps/sdkwork-terminal-flutter-mobile/lib/home_page.dart');
  assert.match(flutterHome, /Sessions/);
  assert.doesNotMatch(flutterHome, /count is/);
});

test('client bootstrap reads topology surface env keys', () => {
  const environmentSource = fs.readFileSync(
    path.join(repoRoot, 'apps/sdkwork-terminal-pc/packages/sdkwork-terminal-pc-core/src/bootstrap/environment.ts'),
    'utf8',
  );
  const webAppSource = fs.readFileSync(
    path.join(repoRoot, 'apps/sdkwork-terminal-pc/src/surfaces/web-app.tsx'),
    'utf8',
  );
  const webMainSource = fs.readFileSync(
    path.join(repoRoot, 'apps/sdkwork-terminal-pc/src/entries/web-main.tsx'),
    'utf8',
  );

  assert.match(environmentSource, /VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL/);
  assert.match(environmentSource, /VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL/);
  assert.doesNotMatch(environmentSource, /VITE_API_BASE_URL/);
  assert.match(webMainSource, /\.\.\/surfaces\/web-app/);
  assert.match(webAppSource, /getApplicationPublicHttpUrl/);
  assert.match(webAppSource, /terminalSessionStore/);
  assert.match(webAppSource, /useSyncExternalStore/);
  assert.doesNotMatch(webAppSource, /VITE_TERMINAL_RUNTIME_BASE_URL/);
});
