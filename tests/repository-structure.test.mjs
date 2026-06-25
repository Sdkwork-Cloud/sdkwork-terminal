import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const requiredRootFiles = [
  'README.md',
  'AGENTS.md',
  'package.json',
  'pnpm-workspace.yaml',
  'specs/topology.spec.json',
  'specs/architecture-alignment.md',
  'specs/GOVERNANCE_EXCEPTIONS.md',
];

const requiredDirectoryReadmes = [
  'apps/README.md',
  'configs/topology/README.md',
  'deployments/README.md',
  'docs/README.md',
  'scripts/README.md',
  'specs/README.md',
  'tests/README.md',
];

const requiredSdkworkMetadata = [
  '.sdkwork/README.md',
  '.sdkwork/skills/README.md',
  '.sdkwork/plugins/README.md',
  '.sdkwork/.gitignore',
];

const pcAppSdkworkMetadata = [
  'apps/sdkwork-terminal-pc/.sdkwork/README.md',
  'apps/sdkwork-terminal-pc/.sdkwork/skills/README.md',
  'apps/sdkwork-terminal-pc/.sdkwork/plugins/README.md',
];

function readUtf8(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `Expected ${relativePath} to exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('repository root documents narrow SDKWork workspace layout', () => {
  for (const relativePath of requiredRootFiles) {
    readUtf8(relativePath);
  }

  const readme = readUtf8('README.md');
  assert.match(readme, /SDKWORK_WORKSPACE_SPEC/);
  assert.match(readme, /sdkwork-web-framework/);
  assert.match(readme, /Intentionally absent/);
});

test('capability directories expose README purpose docs', () => {
  for (const relativePath of requiredDirectoryReadmes) {
    readUtf8(relativePath);
  }
});

test('sdkwork workspace metadata is present at repository and PC app roots', () => {
  for (const relativePath of [...requiredSdkworkMetadata, ...pcAppSdkworkMetadata]) {
    readUtf8(relativePath);
  }
});

test('sdkwork README files do not retain template placeholders', () => {
  const sdkworkReadmes = [
    '.sdkwork/README.md',
    'apps/sdkwork-terminal-pc/.sdkwork/README.md',
  ];

  for (const relativePath of sdkworkReadmes) {
    const contents = readUtf8(relativePath);
    assert.doesNotMatch(contents, /\$specPath/);
    assert.doesNotMatch(contents, /\$name/);
  }
});

test('architecture alignment documents framework posture', () => {
  const alignment = readUtf8('specs/architecture-alignment.md');
  assert.match(alignment, /sdkwork-web-framework/);
  assert.match(alignment, /sdkwork-database/);
  assert.match(alignment, /sdkwork-discovery/);
  assert.match(alignment, /sdkwork-utils/);
  assert.match(alignment, /EX-2026-REPO-002/);
});

test('governance exceptions cover narrow layout and local runtime', () => {
  const governance = readUtf8('specs/GOVERNANCE_EXCEPTIONS.md');
  assert.match(governance, /EX-2026-REPO-001/);
  assert.match(governance, /EX-2026-REPO-002/);
  assert.match(governance, /EX-2026-REPO-003/);
});

test('pc local runtime openapi authority is published', () => {
  const openapi = readUtf8('apps/sdkwork-terminal-pc/apis/local-runtime/openapi.yaml');
  assert.match(openapi, /openapi: 3\.1\.0/);
  assert.match(openapi, /\/terminal\/api\/v1\/sessions/);
});

test('verify script includes repository structure tests', () => {
  const rootPackage = JSON.parse(readUtf8('package.json'));
  assert.match(rootPackage.scripts?.['topology:test'], /repository-structure\.test\.mjs/);
});

function resolveComponentSpecPath(specRootRelativePath, specPath) {
  return path.resolve(repoRoot, specRootRelativePath, specPath);
}

test('h5 application exposes aligned mobile shell package', () => {
  readUtf8('apps/sdkwork-terminal-h5/packages/sdkwork-terminal-h5-shell/package.json');
  const shellSource = readUtf8(
    'apps/sdkwork-terminal-h5/packages/sdkwork-terminal-h5-shell/src/TerminalMobileShell.tsx',
  );
  const appSource = readUtf8('apps/sdkwork-terminal-h5/src/App.tsx');

  assert.match(shellSource, /TerminalMobileShell/);
  assert.match(shellSource, /Sessions/);
  assert.doesNotMatch(shellSource, /count is/);
  assert.match(appSource, /@sdkwork\/terminal-h5-shell/);
});

test('flutter mobile application exposes aligned companion shell home', () => {
  const homeSource = readUtf8('apps/sdkwork-terminal-flutter-mobile/lib/home_page.dart');

  assert.match(homeSource, /Sessions/);
  assert.match(homeSource, /companion shell/i);
  assert.doesNotMatch(homeSource, /count is/);
});

test('h5 application resolves generated appbase sdk through source paths', () => {
  const tsconfig = JSON.parse(readUtf8('apps/sdkwork-terminal-h5/tsconfig.json'));
  const appbasePath =
    tsconfig.compilerOptions?.paths?.['@sdkwork/iam-app-sdk']?.[0];
  assert.equal(
    typeof appbasePath,
    'string',
    'apps/sdkwork-terminal-h5/tsconfig.json must map @sdkwork/iam-app-sdk to generated source',
  );
  assert.match(appbasePath, /server-openapi\/src\/index\.ts$/);
  assert.equal(
    fs.existsSync(path.join(repoRoot, 'apps/sdkwork-terminal-h5', appbasePath)),
    true,
  );
});

test('pc app manifest avoids placeholder checksum digests before release finalization', () => {
  const manifest = JSON.parse(readUtf8('apps/sdkwork-terminal-pc/sdkwork.app.config.json'));
  const packages = manifest.artifacts?.installConfig?.packages ?? [];
  const placeholderPattern = /^([0-9a-f]{8})\1{7}$/i;

  assert.equal(manifest.security?.checksumRequired, false);

  for (const pkg of packages) {
    if (!pkg.checksum) {
      continue;
    }

    assert.equal(
      placeholderPattern.test(pkg.checksum),
      false,
      `package ${pkg.id} must not use repeated-pattern placeholder checksum`,
    );
  }
});

test('satellite application roots expose component specs and sdkwork metadata', () => {
  const satelliteRoots = [
    'apps/sdkwork-terminal-h5',
    'apps/sdkwork-terminal-flutter-mobile',
  ];

  for (const appRoot of satelliteRoots) {
    readUtf8(`${appRoot}/specs/README.md`);
    const manifest = JSON.parse(readUtf8(`${appRoot}/specs/component.spec.json`));
    assert.equal(manifest.component.domain, 'device');
    readUtf8(`${appRoot}/.sdkwork/README.md`);
    readUtf8(`${appRoot}/.sdkwork/.gitignore`);
    assert.doesNotMatch(readUtf8(`${appRoot}/.sdkwork/README.md`), /\$specPath/);
  }
});

test('pc application component spec canonical paths resolve to sdkwork-specs', () => {
  const specRoot = 'apps/sdkwork-terminal-pc/specs';
  const manifest = JSON.parse(readUtf8(`${specRoot}/component.spec.json`));

  assert.equal(manifest.component.domain, 'device');
  assert.ok(manifest.canonicalSpecs.length >= 20);

  for (const entry of manifest.canonicalSpecs) {
    const resolved = resolveComponentSpecPath(specRoot, entry.path);
    assert.equal(
      fs.existsSync(resolved),
      true,
      `Expected canonical spec path to exist: ${entry.path}`,
    );
  }
});

test('pc workspace does not declare unused sibling sdk workspaces', () => {
  const workspace = readUtf8('apps/sdkwork-terminal-pc/pnpm-workspace.yaml');
  assert.doesNotMatch(workspace, /sdkwork-drive/);
});

test('root workspace links generated appbase app sdk for satellite clients', () => {
  const workspace = readUtf8('pnpm-workspace.yaml');
  assert.match(
    workspace,
    /sdkwork-iam-app-sdk-typescript\/generated\/server-openapi/,
  );
  assert.match(workspace, /sdkwork-utils-typescript/);
});

test('root lockfile does not retain removed pc sub-app workspaces', () => {
  const lockfile = readUtf8('pnpm-lock.yaml');
  assert.doesNotMatch(lockfile, /apps\/sdkwork-terminal-pc\/apps\/(web|desktop):/);
});
