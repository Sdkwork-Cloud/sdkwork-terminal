/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_SDKWORK_TERMINAL_ENVIRONMENT?: string;
  readonly VITE_SDKWORK_TERMINAL_DEPLOYMENT_PROFILE?: string;
  readonly VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_CLIENT_DESKTOP_RENDERER_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_CLIENT_WEB_RENDERER_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_IAM_REQUIRED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
