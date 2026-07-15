import type { ReactElement, ReactNode } from 'react';

export interface SdkworkIamAuthRoutesProps {
  appearance?: Record<string, unknown>;
  basePath?: string;
  getRuntime: () => unknown;
  homePath?: string;
  locale?: string | null;
  runtimeConfig?: Record<string, unknown>;
  viewportMode?: 'fixed' | 'page';
}

export function SdkworkIamAuthRoutes(
  props: SdkworkIamAuthRoutesProps,
): ReactElement | null;

export interface SdkworkSessionAuthBrowserRootProps {
  children: ReactNode;
}

export function SdkworkSessionAuthBrowserRoot(
  props: SdkworkSessionAuthBrowserRootProps,
): ReactElement | null;

declare module '@sdkwork/auth-pc-react' {
  export {
    SdkworkIamAuthRoutes,
    SdkworkSessionAuthBrowserRoot,
    type SdkworkIamAuthRoutesProps,
    type SdkworkSessionAuthBrowserRootProps,
  };
}
