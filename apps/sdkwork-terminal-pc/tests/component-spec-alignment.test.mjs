import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pcRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pcRoot, '../..');
const specsRoot = path.resolve(repoRoot, '../sdkwork-specs');

function walkComponentSpecs(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'target'].includes(entry.name)) {
        continue;
      }
      walkComponentSpecs(fullPath, results);
      continue;
    }
    if (entry.name === 'component.spec.json' && fullPath.includes(`${path.sep}specs${path.sep}`)) {
      results.push(fullPath);
    }
  }
  return results;
}

function posixRelative(fromDir, toDir) {
  return path.relative(fromDir, toDir).split(path.sep).join('/');
}

test('all pc component specs resolve canonical paths into sdkwork-specs', () => {
  const specFiles = walkComponentSpecs(pcRoot);
  assert.ok(specFiles.length >= 30);

  for (const specFile of specFiles) {
    const specDir = path.dirname(specFile);
    const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
    const expectedPrefix = `${posixRelative(specDir, specsRoot)}/`;

    for (const entry of spec.canonicalSpecs ?? []) {
      assert.equal(
        entry.path.startsWith(expectedPrefix),
        true,
        `${path.relative(pcRoot, specFile)} canonical path prefix mismatch for ${entry.file}`,
      );
      const resolved = path.resolve(specDir, entry.path);
      assert.equal(fs.existsSync(resolved), true, `Missing canonical spec: ${entry.path}`);
    }

    assert.doesNotMatch(
      JSON.stringify(spec),
      /apps\/sdkwork-terminal\//,
      `${path.relative(pcRoot, specFile)} still references legacy apps/sdkwork-terminal path`,
    );
  }
});

test('rust crate component specs use workspace cargo test commands', () => {
  const crateSpecs = walkComponentSpecs(path.join(pcRoot, 'crates'));

  for (const specFile of crateSpecs) {
    const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
    const commands = spec.verification?.commands ?? [];
    assert.ok(
      commands.some((command) => command.startsWith('cargo test -p ')),
      `${path.relative(pcRoot, specFile)} must declare cargo test -p command`,
    );
  }
});

function readPackageName(componentRoot) {
  const packageJsonPath = path.join(componentRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).name ?? null;
}

test('component spec roots and npm names align with filesystem', () => {
  const specFiles = walkComponentSpecs(pcRoot);

  for (const specFile of specFiles) {
    const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
    const componentRoot = path.dirname(path.dirname(specFile));
    const expectedRoot = path.relative(repoRoot, componentRoot).split(path.sep).join('/');

    assert.equal(
      spec.component?.root,
      expectedRoot,
      `${path.relative(pcRoot, specFile)} component.root must match filesystem`,
    );

    const packageName = readPackageName(componentRoot);
    if (packageName && spec.component?.name?.startsWith('@sdkwork/')) {
      assert.equal(
        spec.component.name,
        packageName,
        `${path.relative(pcRoot, specFile)} component.name must match package.json`,
      );
    }

    assert.doesNotMatch(
      spec.component?.root ?? '',
      /packages\/sdkwork-terminal-(?!pc-)/,
      `${path.relative(pcRoot, specFile)} must not use legacy package directory root`,
    );
  }
});

test('web and desktop entrypoints delegate to shared bootstrap', () => {
  for (const surface of ['apps/web/src/main.tsx', 'apps/desktop/src/main.tsx']) {
    const source = fs.readFileSync(path.join(pcRoot, surface), 'utf8');
    assert.match(
      source,
      /src\/bootstrap\/renderApp/,
      `${surface} must import shared bootstrap renderApp`,
    );
  }
});

test('surface application modules live under src/surfaces', () => {
  assert.equal(
    fs.existsSync(path.join(pcRoot, 'src/surfaces/web-app.tsx')),
    true,
    'web surface must live at src/surfaces/web-app.tsx',
  );
});

test('desktop surface modules remain in apps/desktop until package-boundary migration', () => {
  assert.equal(
    fs.existsSync(path.join(pcRoot, 'apps/desktop/src/App.tsx')),
    true,
    'desktop surface must remain under apps/desktop/src during EX-2026-PC-001 Phase 2',
  );
});

const legacyPackageImportPattern =
  /@sdkwork\/terminal-(?!pc-|web|desktop|workspace|local-runtime)/;

function walkTypeScriptSources(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'target', 'generated'].includes(entry.name)) {
        continue;
      }
      walkTypeScriptSources(fullPath, results);
      continue;
    }

    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }

  return results;
}

test('authored typescript uses pc-segment package imports', () => {
  const sourceRoots = [
    path.join(pcRoot, 'src'),
    path.join(pcRoot, 'apps'),
    path.join(pcRoot, 'packages'),
  ];

  for (const sourceRoot of sourceRoots) {
    for (const sourceFile of walkTypeScriptSources(sourceRoot)) {
      const source = fs.readFileSync(sourceFile, 'utf8');
      assert.doesNotMatch(
        source,
        legacyPackageImportPattern,
        `${path.relative(pcRoot, sourceFile)} must not import legacy @sdkwork/terminal-* package names`,
      );
    }
  }
});
