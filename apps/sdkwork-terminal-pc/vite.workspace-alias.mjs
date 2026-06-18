function resolveFromRoot(pathname) {
  const resolved = decodeURIComponent(new URL(pathname, import.meta.url).pathname);

  if (/^\/[A-Za-z]:\//.test(resolved)) {
    return resolved.slice(1);
  }

  return resolved;
}

function resolveAppbasePath(relativePath) {
  return resolveFromRoot(`../../../sdkwork-appbase/${relativePath}`);
}

function resolveUiPcReactPath(relativePath) {
  return resolveFromRoot(`../../../sdkwork-ui/sdkwork-ui-pc-react/${relativePath}`);
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
  "@sdkwork/terminal-core": resolveFromRoot("./packages/sdkwork-terminal-pc-core/src/index.ts"),
  "@sdkwork/terminal-shell/integration": resolveFromRoot("./packages/sdkwork-terminal-pc-shell/src/integration.tsx"),
  "@sdkwork/terminal-shell/styles.css": resolveFromRoot("./packages/sdkwork-terminal-pc-shell/src/styles.css"),
  "@sdkwork/terminal-shell": resolveFromRoot("./packages/sdkwork-terminal-pc-shell/src/index.tsx"),
  "@sdkwork/terminal-workbench": resolveFromRoot("./packages/sdkwork-terminal-pc-workbench/src/index.tsx"),
  "@sdkwork/terminal-sessions/model": resolveFromRoot("./packages/sdkwork-terminal-pc-sessions/src/model.ts"),
  "@sdkwork/terminal-sessions": resolveFromRoot("./packages/sdkwork-terminal-pc-sessions/src/index.tsx"),
  "@sdkwork/terminal-resources/model": resolveFromRoot("./packages/sdkwork-terminal-pc-resources/src/model.ts"),
  "@sdkwork/terminal-resources": resolveFromRoot("./packages/sdkwork-terminal-pc-resources/src/index.tsx"),
  "@sdkwork/terminal-ai-cli": resolveFromRoot("./packages/sdkwork-terminal-pc-ai-cli/src/index.tsx"),
  "@sdkwork/terminal-settings": resolveFromRoot("./packages/sdkwork-terminal-pc-settings/src/index.tsx"),
  "@sdkwork/terminal-diagnostics": resolveFromRoot("./packages/sdkwork-terminal-pc-diagnostics/src/index.tsx"),
  "@sdkwork/terminal-infrastructure": resolveFromRoot("./packages/sdkwork-terminal-pc-infrastructure/src/index.ts"),
  "@sdkwork/terminal-contracts": resolveFromRoot("./packages/sdkwork-terminal-pc-contracts/src/index.ts"),
  "@sdkwork/terminal-types": resolveFromRoot("./packages/sdkwork-terminal-pc-types/src/index.ts"),
  "@sdkwork/terminal-ui": resolveFromRoot("./packages/sdkwork-terminal-pc-ui/src/index.tsx"),
  "@sdkwork/terminal-i18n": resolveFromRoot("./packages/sdkwork-terminal-pc-i18n/src/index.ts"),
  "@sdkwork/terminal-commons": resolveFromRoot("./packages/sdkwork-terminal-pc-commons/src/index.ts"),
  "@sdkwork/auth-pc-react": resolveAppbasePath("packages/pc-react/iam/sdkwork-auth-pc-react/src/index.ts"),
  "@sdkwork/auth-runtime-pc-react": resolveAppbasePath("packages/pc-react/iam/sdkwork-auth-runtime-pc-react/src/index.ts"),
  "@sdkwork/appbase-pc-react": resolveAppbasePath("packages/pc-react/foundation/sdkwork-appbase-pc-react/src/index.ts"),
  "@sdkwork/i18n-pc-react": resolveAppbasePath("packages/pc-react/foundation/sdkwork-i18n-pc-react/src/index.ts"),
  "@sdkwork/core-pc-react": resolveFromRoot("./src/bootstrap/sdkworkCorePcReactShim.ts"),
  "@sdkwork/ui-pc-react": resolveUiPcReactPath("src/index.ts"),
  "@sdkwork/iam-contracts": resolveAppbasePath("packages/common/iam/sdkwork-iam-contracts/src/index.ts"),
  "@sdkwork/iam-runtime": resolveAppbasePath("packages/common/iam/sdkwork-iam-runtime/src/index.ts"),
  "@sdkwork/iam-sdk-adapter": resolveAppbasePath("packages/common/iam/sdkwork-iam-sdk-adapter/src/index.ts"),
  "@sdkwork/iam-sdk-ports": resolveAppbasePath("packages/common/iam/sdkwork-iam-sdk-ports/src/index.ts"),
  "@sdkwork/iam-service": resolveAppbasePath("packages/common/iam/sdkwork-iam-service/src/index.ts"),
  "@sdkwork/runtime-bootstrap": resolveAppbasePath("packages/common/foundation/sdkwork-runtime-bootstrap/src/index.ts"),
  "@sdkwork/appbase-app-sdk": resolveAppbasePath("sdks/sdkwork-appbase-app-sdk/sdkwork-appbase-app-sdk-typescript/generated/server-openapi/src/index.ts"),
  "@sdkwork/appbase-backend-sdk": resolveAppbasePath("sdks/sdkwork-appbase-backend-sdk/sdkwork-appbase-backend-sdk-typescript/generated/server-openapi/src/index.ts"),
};
