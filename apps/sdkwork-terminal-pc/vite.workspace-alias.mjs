function resolveFromRoot(pathname) {
  const resolved = decodeURIComponent(new URL(pathname, import.meta.url).pathname);

  if (/^\/[A-Za-z]:\//.test(resolved)) {
    return resolved.slice(1);
  }

  return resolved;
}

export const workspaceAlias = {
  "@sdkwork/terminal-pc-shell/integration": resolveFromRoot("./packages/sdkwork-terminal-pc-shell/src/integration.tsx"),
  "@sdkwork/terminal-pc-shell/styles.css": resolveFromRoot("./packages/sdkwork-terminal-pc-shell/src/styles.css"),
  "@sdkwork/terminal-pc-shell": resolveFromRoot("./packages/sdkwork-terminal-pc-shell/src/index.tsx"),
  "@sdkwork/terminal-pc-workbench": resolveFromRoot("./packages/sdkwork-terminal-pc-workbench/src/index.tsx"),
  "@sdkwork/terminal-pc-sessions/model": resolveFromRoot("./packages/sdkwork-terminal-pc-sessions/src/model.ts"),
  "@sdkwork/terminal-pc-sessions": resolveFromRoot("./packages/sdkwork-terminal-pc-sessions/src/index.tsx"),
  "@sdkwork/terminal-pc-resources/model": resolveFromRoot("./packages/sdkwork-terminal-pc-resources/src/model.ts"),
  "@sdkwork/terminal-pc-resources": resolveFromRoot("./packages/sdkwork-terminal-pc-resources/src/index.tsx"),
  "@sdkwork/terminal-pc-ai-cli": resolveFromRoot("./packages/sdkwork-terminal-pc-ai-cli/src/index.tsx"),
  "@sdkwork/terminal-pc-settings": resolveFromRoot("./packages/sdkwork-terminal-pc-settings/src/index.tsx"),
  "@sdkwork/terminal-pc-diagnostics": resolveFromRoot("./packages/sdkwork-terminal-pc-diagnostics/src/index.tsx"),
  "@sdkwork/terminal-pc-core": resolveFromRoot("./packages/sdkwork-terminal-pc-core/src/index.ts"),
  "@sdkwork/terminal-pc-infrastructure": resolveFromRoot("./packages/sdkwork-terminal-pc-infrastructure/src/index.ts"),
  "@sdkwork/terminal-pc-contracts": resolveFromRoot("./packages/sdkwork-terminal-pc-contracts/src/index.ts"),
  "@sdkwork/terminal-pc-types": resolveFromRoot("./packages/sdkwork-terminal-pc-types/src/index.ts"),
  "@sdkwork/terminal-pc-ui": resolveFromRoot("./packages/sdkwork-terminal-pc-ui/src/index.tsx"),
  "@sdkwork/terminal-pc-i18n": resolveFromRoot("./packages/sdkwork-terminal-pc-i18n/src/index.ts"),
  "@sdkwork/terminal-pc-commons": resolveFromRoot("./packages/sdkwork-terminal-pc-commons/src/index.ts"),
};
