import type { ReactElement } from 'react';

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

declare module '@sdkwork/auth-pc-react' {
  export { SdkworkIamAuthRoutes, type SdkworkIamAuthRoutesProps };
}
