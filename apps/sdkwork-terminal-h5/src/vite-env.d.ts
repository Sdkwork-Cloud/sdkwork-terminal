/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SDKWORK_TERMINAL_ENVIRONMENT?: string;
  readonly VITE_SDKWORK_TERMINAL_HOSTING?: string;
  readonly VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL?: string;
  readonly VITE_SDKWORK_TERMINAL_IAM_REQUIRED?: string;
  readonly VITE_SDKWORK_TERMINAL_RUNTIME_TARGET?: string;
  readonly VITE_SDKWORK_TERMINAL_CAPACITOR_PLATFORM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
