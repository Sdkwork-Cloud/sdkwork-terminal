export interface SdkworkAuthAppearanceConfig {
  asidePanelClassName?: string;
  bodyClassName?: string;
  contentContainerClassName?: string;
  pageClassName?: string;
  qrFrameClassName?: string;
  shellClassName?: string;
  slotProps?: {
    background?: { className?: string };
    page?: { className?: string };
    shell?: { className?: string };
  };
  theme?: Record<string, string>;
}

export interface SdkworkAuthRuntimeConfig {
  leftRailMode?: string;
  loginMethods?: string[];
  oauthLoginEnabled?: boolean;
  oauthProviders?: string[];
  qrLoginEnabled?: boolean;
  recoveryMethods?: string[];
  registerMethods?: string[];
  verificationPolicy?: Record<string, boolean>;
  developmentPrefill?: Record<string, unknown>;
}

const TERMINAL_VERIFICATION_POLICY = {
  emailCodeLoginEnabled: false,
  emailRegistrationVerificationRequired: false,
  phoneCodeLoginEnabled: false,
  phoneRegistrationVerificationRequired: false,
};

export function resolveTerminalAuthRuntimeConfig(): SdkworkAuthRuntimeConfig {
  return {
    leftRailMode: 'qr-only',
    loginMethods: ['password'],
    oauthLoginEnabled: false,
    oauthProviders: [],
    qrLoginEnabled: true,
    recoveryMethods: [],
    registerMethods: ['email', 'phone'],
    verificationPolicy: TERMINAL_VERIFICATION_POLICY,
  };
}

export function resolveTerminalAuthAppearance(): SdkworkAuthAppearanceConfig {
  return {
    asidePanelClassName: 'sdkwork-terminal-auth-aside-panel',
    bodyClassName: 'sdkwork-terminal-auth-body',
    contentContainerClassName: 'sdkwork-terminal-auth-content',
    pageClassName: 'sdkwork-terminal-auth-page',
    qrFrameClassName: 'sdkwork-terminal-auth-qr-frame',
    shellClassName: 'sdkwork-terminal-auth-card-shell',
    slotProps: {
      background: {
        className: 'sdkwork-terminal-auth-background',
      },
      page: {
        className: 'sdkwork-terminal-auth-page',
      },
      shell: {
        className: 'sdkwork-terminal-auth-card-shell',
      },
    },
    theme: {
      asideCardBackgroundColor: 'var(--sdkwork-terminal-auth-aside-card-bg)',
      asideCardBorderColor: 'var(--sdkwork-terminal-auth-aside-card-border)',
      asidePanelBackgroundColor: 'var(--sdkwork-terminal-auth-aside-bg)',
      asidePanelBorderColor: 'var(--sdkwork-terminal-auth-aside-border)',
      asidePanelColor: 'var(--sdkwork-terminal-auth-aside-text)',
      badgeBackgroundColor: 'var(--sdkwork-terminal-auth-aside-badge-bg)',
      badgeTextColor: 'var(--sdkwork-terminal-auth-aside-badge-text)',
      contentBackgroundColor: 'var(--sdkwork-terminal-auth-content-bg)',
      contentBorderColor: 'transparent',
      contentTextColor: 'var(--sdkwork-terminal-auth-content-text)',
      descriptionColor: 'var(--sdkwork-terminal-auth-muted-text)',
      dividerColor: 'var(--sdkwork-terminal-auth-divider)',
      fieldBackgroundColor: 'var(--sdkwork-terminal-auth-field-bg)',
      fieldBorderColor: 'transparent',
      fieldPlaceholderColor: '#9ca3af',
      fieldTextColor: 'var(--sdkwork-terminal-auth-content-text)',
      formMutedTextColor: 'var(--sdkwork-terminal-auth-muted-text)',
      iconMutedColor: 'var(--sdkwork-terminal-auth-muted-text)',
      labelColor: 'var(--sdkwork-terminal-auth-content-text)',
      pageBackgroundColor: 'var(--sdkwork-terminal-auth-bg)',
      qrFrameBackgroundColor: 'var(--sdkwork-terminal-auth-qr-bg)',
      qrFrameBorderColor: 'transparent',
      shellBackgroundColor: 'var(--sdkwork-terminal-auth-content-bg)',
      shellBorderColor: 'transparent',
      tabActiveBackgroundColor: 'transparent',
      tabActiveTextColor: 'var(--sdkwork-terminal-auth-content-text)',
      tabBackgroundColor: 'transparent',
      tabInactiveTextColor: 'var(--sdkwork-terminal-auth-muted-text)',
      titleColor: 'var(--sdkwork-terminal-auth-content-text)',
    },
  };
}

export function resolveTerminalAuthLocale(): string | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const language = navigator.language.trim();
  return language || null;
}
