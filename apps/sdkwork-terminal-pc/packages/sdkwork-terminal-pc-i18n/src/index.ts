import { createContext, useContext, useMemo, type ReactNode } from "react";

export type Locale = "zh-CN" | "en-US";

export const defaultLocale: Locale = "zh-CN";

export const localeLabels: Record<Locale, string> = {
  "zh-CN": "简体中文",
  "en-US": "English",
};

export const supportedLocales: readonly Locale[] = ["zh-CN", "en-US"] as const;

type MessageCatalog = Record<string, string>;

const zhCNMessages: MessageCatalog = {
  "common.ok": "确定",
  "common.cancel": "取消",
  "common.save": "保存",
  "common.delete": "删除",
  "common.close": "关闭",
  "common.refresh": "刷新",
  "common.search": "搜索",
  "common.copy": "复制",
  "common.paste": "粘贴",
  "common.selectAll": "全选",
  "common.clear": "清除",
  "common.find": "查找",
  "common.error": "错误",
  "common.loading": "加载中…",
  "common.retry": "重试",
  "common.exit": "退出",
  "shell.tab.new": "新建标签页",
  "shell.tab.close": "关闭标签页",
  "shell.tab.switchPrevious": "上一个标签页",
  "shell.tab.switchNext": "下一个标签页",
  "shell.tab.exited": "已退出",
  "shell.profile.powershell": "PowerShell",
  "shell.profile.bash": "Bash",
  "shell.profile.shell": "默认 Shell",
  "shell.header.minimize": "最小化",
  "shell.header.maximize": "最大化",
  "shell.header.restore": "还原",
  "shell.header.close": "关闭",
  "shell.overlay.bootstrap": "正在启动终端…",
  "shell.overlay.hostStatus": "主机状态",
  "shell.overlay.runtimeStatus": "运行时状态",
  "shell.overlay.search": "搜索",
  "shell.overlay.sessionCenter": "会话中心",
  "shell.overlay.resources": "资源",
  "shell.overlay.settings": "设置",
  "shell.overlay.diagnostics": "诊断",
  "shell.overlay.aiCli": "AI CLI",
  "settings.title": "设置",
  "settings.profile": "配置文件",
  "settings.theme": "主题",
  "settings.keybinding": "快捷键",
  "settings.appearance": "外观",
  "settings.startup": "启动",
  "settings.interaction": "交互",
  "settings.colorSchemes": "配色方案",
  "settings.advanced": "高级",
  "settings.persistence": "配置持久化基于 config.toml 与 SQLite，支持 Profile、Theme、Keybinding 等设置项。",
  "diagnostics.title": "诊断",
  "diagnostics.trace": "追踪",
  "diagnostics.metric": "指标",
  "diagnostics.bundle": "诊断包",
  "diagnostics.smokeEvidence": "Smoke 证据入口",
  "diagnostics.releaseEvidence": "发布证据入口",
  "diagnostics.reviewEvidence": "Review 证据入口",
  "aiCli.title": "AI CLI 原生托管",
  "aiCli.refresh": "刷新发现",
  "aiCli.launch": "启动",
  "aiCli.codex": "Codex",
  "aiCli.claudeCode": "Claude Code",
  "aiCli.gemini": "Gemini",
  "aiCli.openCode": "OpenCode",
  "aiCli.description": "集成边界冻结：CLI 原生托管，当前产品不做语义抽象。",
  "aiCli.platformInfo": "平台: {platform} | 架构: {arch} | 检查时间: {time}",
  "aiCli.found": "已发现",
  "aiCli.notFound": "未发现",
  "aiCli.authenticated": "已认证",
  "aiCli.notAuthenticated": "未认证",
  "aiCli.unknownVersion": "未知版本",
  "aiCli.versionAuth": "v{version} | {auth}",
  "aiCli.noCliFound": "未发现 AI CLI",
  "sessions.title": "会话中心",
  "sessions.empty": "无活跃会话",
  "sessions.reattach": "重新附加",
  "sessions.terminate": "终止",
  "sessions.replay": "回放",
  "sessions.attached": "已附加",
  "sessions.reattachRequired": "需要重新附加",
  "sessions.idle": "空闲",
  "sessions.sessionCount": "{count} 个会话",
  "sessions.replayPrefix": "回放",
  "sessions.replayHistory": "回放历史 {count} 条",
  "resources.title": "资源中心",
  "resources.executionTargets": "执行目标",
  "resources.connectors": "连接器",
  "resources.ssh": "SSH",
  "resources.docker": "Docker",
  "resources.kubernetes": "Kubernetes",
  "resources.remoteRuntime": "远程运行时",
  "resources.localShell": "本地终端",
  "resources.sessionReady": "会话就绪",
  "resources.needsAttention": "需要关注",
  "resources.blocked": "已阻塞",
  "resources.sessionReadyCount": "{count} 会话就绪",
  "auth.validating": "正在验证会话…",
  "auth.loginRequired": "需要登录",
  "auth.login": "登录",
  "auth.logout": "退出登录",
};

const enUSMessages: MessageCatalog = {
  "common.ok": "OK",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.close": "Close",
  "common.refresh": "Refresh",
  "common.search": "Search",
  "common.copy": "Copy",
  "common.paste": "Paste",
  "common.selectAll": "Select All",
  "common.clear": "Clear",
  "common.find": "Find",
  "common.error": "Error",
  "common.loading": "Loading…",
  "common.retry": "Retry",
  "common.exit": "Exit",
  "shell.tab.new": "New Tab",
  "shell.tab.close": "Close Tab",
  "shell.tab.switchPrevious": "Previous Tab",
  "shell.tab.switchNext": "Next Tab",
  "shell.tab.exited": "Exited",
  "shell.profile.powershell": "PowerShell",
  "shell.profile.bash": "Bash",
  "shell.profile.shell": "Default Shell",
  "shell.header.minimize": "Minimize",
  "shell.header.maximize": "Maximize",
  "shell.header.restore": "Restore",
  "shell.header.close": "Close",
  "shell.overlay.bootstrap": "Starting terminal…",
  "shell.overlay.hostStatus": "Host Status",
  "shell.overlay.runtimeStatus": "Runtime Status",
  "shell.overlay.search": "Search",
  "shell.overlay.sessionCenter": "Session Center",
  "shell.overlay.resources": "Resources",
  "shell.overlay.settings": "Settings",
  "shell.overlay.diagnostics": "Diagnostics",
  "shell.overlay.aiCli": "AI CLI",
  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.theme": "Theme",
  "settings.keybinding": "Keybindings",
  "settings.appearance": "Appearance",
  "settings.startup": "Startup",
  "settings.interaction": "Interaction",
  "settings.colorSchemes": "Color Schemes",
  "settings.advanced": "Advanced",
  "settings.persistence": "Configuration persists via config.toml and SQLite, supporting Profile, Theme, and Keybinding settings.",
  "diagnostics.title": "Diagnostics",
  "diagnostics.trace": "Trace",
  "diagnostics.metric": "Metrics",
  "diagnostics.bundle": "Diagnostic Bundle",
  "diagnostics.smokeEvidence": "Smoke evidence entry",
  "diagnostics.releaseEvidence": "Release evidence entry",
  "diagnostics.reviewEvidence": "Review evidence entry",
  "aiCli.title": "AI CLI Native Host",
  "aiCli.refresh": "Refresh Discovery",
  "aiCli.launch": "Launch",
  "aiCli.codex": "Codex",
  "aiCli.claudeCode": "Claude Code",
  "aiCli.gemini": "Gemini",
  "aiCli.openCode": "OpenCode",
  "aiCli.description": "Integration boundary frozen: CLI native host; no semantic abstraction in this product.",
  "aiCli.platformInfo": "Platform: {platform} | Arch: {arch} | Checked: {time}",
  "aiCli.found": "Found",
  "aiCli.notFound": "Not found",
  "aiCli.authenticated": "Authenticated",
  "aiCli.notAuthenticated": "Not authenticated",
  "aiCli.unknownVersion": "unknown",
  "aiCli.versionAuth": "v{version} | {auth}",
  "aiCli.noCliFound": "No AI CLI found",
  "sessions.title": "Session Center",
  "sessions.empty": "No active sessions",
  "sessions.reattach": "Reattach",
  "sessions.terminate": "Terminate",
  "sessions.replay": "Replay",
  "sessions.attached": "Attached",
  "sessions.reattachRequired": "Reattach required",
  "sessions.idle": "Idle",
  "sessions.sessionCount": "{count} sessions",
  "sessions.replayPrefix": "replay",
  "sessions.replayHistory": "replay history {count} entries",
  "resources.title": "Resource Center",
  "resources.executionTargets": "Execution Targets",
  "resources.connectors": "Connectors",
  "resources.ssh": "SSH",
  "resources.docker": "Docker",
  "resources.kubernetes": "Kubernetes",
  "resources.remoteRuntime": "Remote Runtime",
  "resources.localShell": "Local Shell",
  "resources.sessionReady": "Session ready",
  "resources.needsAttention": "Needs attention",
  "resources.blocked": "Blocked",
  "resources.sessionReadyCount": "{count} session ready",
  "auth.validating": "Validating session…",
  "auth.loginRequired": "Login required",
  "auth.login": "Login",
  "auth.logout": "Logout",
};

const messageCatalogs: Record<Locale, MessageCatalog> = {
  "zh-CN": zhCNMessages,
  "en-US": enUSMessages,
};

export interface I18nContextValue {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  locale?: Locale;
  children: ReactNode;
}

export function I18nProvider({ locale = defaultLocale, children }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    const catalog = messageCatalogs[locale] ?? messageCatalogs[defaultLocale];
    return {
      locale,
      t: (key: string, params?: Record<string, string | number>) => {
        let message = catalog[key] ?? key;
        if (params) {
          for (const [name, value] of Object.entries(params)) {
            message = message.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
          }
        }
        return message;
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: defaultLocale,
      t: (key: string) => key,
    };
  }
  return context;
}

export function translate(locale: Locale, key: string): string {
  const catalog = messageCatalogs[locale] ?? messageCatalogs[defaultLocale];
  return catalog[key] ?? key;
}
