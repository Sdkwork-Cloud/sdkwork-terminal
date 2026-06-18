import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pcRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(pcRoot, '../..');
const specsRoot = path.resolve(repoRoot, '../sdkwork-specs');

function posixRelative(fromDir, toDir) {
  return path.relative(fromDir, toDir).split(path.sep).join('/');
}

function walkComponentSpecs(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'target') {
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

function relativeComponentRoot(specFile) {
  const componentRoot = path.dirname(path.dirname(specFile));
  return path.relative(repoRoot, componentRoot).split(path.sep).join('/');
}

function readPackageName(componentRoot) {
  const packageJsonPath = path.join(componentRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).name ?? null;
}

function alignComponentIdentity(specFile, spec) {
  let changed = false;
  const componentRoot = path.dirname(path.dirname(specFile));
  const expectedRoot = relativeComponentRoot(specFile);

  if (spec.component?.root !== expectedRoot) {
    spec.component.root = expectedRoot;
    changed = true;
  }

  const packageName = readPackageName(componentRoot);
  if (
    packageName
    && spec.component?.name
    && spec.component.name !== packageName
    && spec.component.name.startsWith('@sdkwork/')
  ) {
    spec.component.name = packageName;
    changed = true;
  }

  return changed;
}

function fixVerificationCommands(spec, componentRoot, specFile) {
  const commands = spec.verification?.commands ?? [];
  const crateName = spec.component?.name;
  const fixed = commands.map((command) => {
    let next = command.replaceAll('apps/sdkwork-terminal/', 'apps/sdkwork-terminal-pc/');
    const legacyPackageSegments = [
      'core',
      'shell',
      'commons',
      'contracts',
      'types',
      'infrastructure',
      'workbench',
      'sessions',
      'resources',
      'ai-cli',
      'settings',
      'diagnostics',
      'ui',
      'i18n',
    ];
    for (const segment of legacyPackageSegments) {
      next = next.replaceAll(
        `@sdkwork/terminal-${segment}`,
        `@sdkwork/terminal-pc-${segment}`,
      );
    }
    next = next.replace(
      /cargo test --manifest-path apps\/sdkwork-terminal-pc\/crates\/([^/]+)\/Cargo\.toml/,
      'cargo test -p $1',
    );
    next = next.replace(
      /cargo test --manifest-path apps\/sdkwork-terminal-pc\/src-tauri\/Cargo\.toml/,
      'cargo test --manifest-path packages/sdkwork-terminal-pc-desktop/src-tauri/Cargo.toml',
    );
    return next;
  });

  if (spec.component?.type === 'rust-crate' && crateName && !fixed.some((c) => c.includes('cargo test'))) {
    fixed.push(`cargo test -p ${crateName}`);
  }

  if (spec.component?.type === 'react-package' && spec.component?.name?.startsWith('@sdkwork/')) {
    const filter = spec.component.name;
    if (!fixed.some((c) => c.includes(filter))) {
      fixed.push(`pnpm --filter ${filter} typecheck`);
    }
  }

  if (spec.component?.type === 'react-tauri-app' || spec.component?.name === 'sdkwork-terminal') {
    return [
      'pnpm typecheck',
      'pnpm test',
      'cargo test --workspace',
      'pnpm verify',
    ];
  }

  spec.verification = { ...(spec.verification ?? {}), commands: [...new Set(fixed)] };
}

function syncPackageSpecReadme(componentRoot, spec) {
  const readmePath = path.join(componentRoot, 'specs/README.md');
  if (!fs.existsSync(readmePath)) {
    return false;
  }

  const componentName = spec.component?.name;
  const componentRootPath = spec.component?.root;
  if (!componentName || !componentRootPath) {
    return false;
  }

  let content = fs.readFileSync(readmePath, 'utf8');
  const original = content;

  content = content.replace(
    /\| Name \| `@sdkwork\/[^`]+` \|/,
    `| Name | \`${componentName}\` |`,
  );
  content = content.replace(
    /\| Root \| `[^`]+` \|/,
    `| Root | \`${componentRootPath}\` |`,
  );
  content = content.replace(
    /for `@sdkwork\/[^`]+`/,
    `for \`${componentName}\``,
  );

  if (content !== original) {
    fs.writeFileSync(readmePath, content);
    return true;
  }

  return false;
}

function alignComponentSpec(specFile) {
  const specDir = path.dirname(specFile);
  const specPrefix = `${posixRelative(specDir, specsRoot)}/`;
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  let changed = false;

  if (spec.component?.root?.startsWith('sdkwork-terminal/') && !spec.component.root.includes('apps/sdkwork-terminal-pc')) {
    const suffix = spec.component.root.replace(/^sdkwork-terminal\/?/, '');
    const nextRoot = suffix
      ? `sdkwork-terminal/apps/sdkwork-terminal-pc/${suffix}`
      : 'sdkwork-terminal/apps/sdkwork-terminal-pc';
    if (spec.component.root !== nextRoot) {
      spec.component.root = nextRoot;
      changed = true;
    }
  }

  if (alignComponentIdentity(specFile, spec)) {
    changed = true;
  }

  for (const entry of spec.canonicalSpecs ?? []) {
    const nextPath = `${specPrefix}${entry.file}`;
    if (entry.path !== nextPath) {
      entry.path = nextPath;
      changed = true;
    }
  }

  const beforeCommands = JSON.stringify(spec.verification?.commands ?? []);
  fixVerificationCommands(spec, relativeComponentRoot(specFile), specFile);
  if (JSON.stringify(spec.verification?.commands ?? []) !== beforeCommands) {
    changed = true;
  }

  if (changed) {
    spec.metadata = {
      ...(spec.metadata ?? {}),
      alignedAt: '2026-06-18',
      alignedBy: 'tools/scripts/align-component-specs.mjs',
      alignmentPass: 7,
    };
    fs.writeFileSync(specFile, `${JSON.stringify(spec, null, 2)}\n`);
  }

  const componentRoot = path.dirname(path.dirname(specFile));
  if (syncPackageSpecReadme(componentRoot, spec)) {
    changed = true;
    console.log(`aligned ${path.relative(pcRoot, path.join(componentRoot, 'specs/README.md'))}`);
  }

  for (const entry of spec.canonicalSpecs ?? []) {
    const resolved = path.resolve(specDir, entry.path);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Canonical spec path does not resolve for ${specFile}: ${entry.path}`);
    }
  }

  return changed;
}

const specFiles = walkComponentSpecs(pcRoot);
let changedCount = 0;

for (const specFile of specFiles) {
  if (alignComponentSpec(specFile)) {
    changedCount += 1;
    console.log(`aligned ${path.relative(pcRoot, specFile)}`);
  }
}

console.log(`aligned ${changedCount} of ${specFiles.length} component specs`);
