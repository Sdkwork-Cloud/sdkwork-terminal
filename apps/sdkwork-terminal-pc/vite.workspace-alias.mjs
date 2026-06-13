function resolveFromRoot(pathname) {
  const resolved = decodeURIComponent(new URL(pathname, import.meta.url).pathname);

  if (/^\/[A-Za-z]:\//.test(resolved)) {
    return resolved.slice(1);
  }

  return resolved;
}

export const workspaceAlias = {
  "@sdkwork/terminal-shell/integration": resolveFromRoot("./packages/sdkwork-terminal-shell/src/integration.tsx"),
  "@sdkwork/terminal-shell/styles.css": resolveFromRoot("./packages/sdkwork-terminal-shell/src/styles.css"),
  "@sdkwork/terminal-shell": resolveFromRoot("./packages/sdkwork-terminal-shell/src/index.tsx"),
  "@sdkwork/terminal-workbench": resolveFromRoot("./packages/sdkwork-terminal-workbench/src/index.tsx"),
  "@sdkwork/terminal-sessions/model": resolveFromRoot("./packages/sdkwork-terminal-sessions/src/model.ts"),
  "@sdkwork/terminal-sessions": resolveFromRoot("./packages/sdkwork-terminal-sessions/src/index.tsx"),
  "@sdkwork/terminal-resources/model": resolveFromRoot("./packages/sdkwork-terminal-resources/src/model.ts"),
  "@sdkwork/terminal-resources": resolveFromRoot("./packages/sdkwork-terminal-resources/src/index.tsx"),
  "@sdkwork/terminal-ai-cli": resolveFromRoot("./packages/sdkwork-terminal-ai-cli/src/index.tsx"),
  "@sdkwork/terminal-settings": resolveFromRoot("./packages/sdkwork-terminal-settings/src/index.tsx"),
  "@sdkwork/terminal-diagnostics": resolveFromRoot("./packages/sdkwork-terminal-diagnostics/src/index.tsx"),
  "@sdkwork/terminal-core": resolveFromRoot("./packages/sdkwork-terminal-core/src/index.ts"),
  "@sdkwork/terminal-infrastructure": resolveFromRoot("./packages/sdkwork-terminal-infrastructure/src/index.ts"),
  "@sdkwork/terminal-contracts": resolveFromRoot("./packages/sdkwork-terminal-contracts/src/index.ts"),
  "@sdkwork/terminal-types": resolveFromRoot("./packages/sdkwork-terminal-types/src/index.ts"),
  "@sdkwork/terminal-ui": resolveFromRoot("./packages/sdkwork-terminal-ui/src/index.tsx"),
  "@sdkwork/terminal-i18n": resolveFromRoot("./packages/sdkwork-terminal-i18n/src/index.ts"),
  "@sdkwork/terminal-commons": resolveFromRoot("./packages/sdkwork-terminal-commons/src/index.ts"),
};
