export interface HostAdapters {
  platform: 'h5' | 'capacitor-ios' | 'capacitor-android';
}

export function createHostAdapters(): HostAdapters {
  // TODO: Initialize host adapters
  // This should handle platform-specific capabilities
  return { platform: 'h5' };
}
