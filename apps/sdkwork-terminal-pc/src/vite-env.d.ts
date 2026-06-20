/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_SDKWORK_TERMINAL_HOSTING?: string;
  readonly VITE_SDKWORK_TERMINAL_ENVIRONMENT?: string;
  readonly VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_CLIENT_DESKTOP_RENDERER_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_CLIENT_WEB_RENDERER_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_IAM_REQUIRED?: string;
  readonly VITE_TERMINAL_RUNTIME_WORKSPACE_ID?: string;
  readonly VITE_TERMINAL_RUNTIME_AUTHORITY?: string;
  readonly VITE_TERMINAL_RUNTIME_TARGET?: string;
  readonly VITE_TERMINAL_RUNTIME_WORKING_DIRECTORY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
