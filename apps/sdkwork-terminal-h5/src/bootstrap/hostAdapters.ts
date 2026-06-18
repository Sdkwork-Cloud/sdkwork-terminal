export type HostPlatform = 'h5' | 'capacitor-ios' | 'capacitor-android';

export interface HostAdapters {
  platform: HostPlatform;
}

export function resolveHostPlatform(): HostPlatform {
  const runtimeTarget = import.meta.env.VITE_SDKWORK_TERMINAL_RUNTIME_TARGET?.trim().toLowerCase();
  if (runtimeTarget === 'capacitor-ios') {
    return 'capacitor-ios';
  }
  if (runtimeTarget === 'capacitor-android') {
    return 'capacitor-android';
  }

  const capacitorPlatform = import.meta.env.VITE_SDKWORK_TERMINAL_CAPACITOR_PLATFORM?.trim().toLowerCase();
  if (capacitorPlatform === 'ios') {
    return 'capacitor-ios';
  }
  if (capacitorPlatform === 'android') {
    return 'capacitor-android';
  }

  return 'h5';
}

export function createHostAdapters(): HostAdapters {
  return {
    platform: resolveHostPlatform(),
  };
}
