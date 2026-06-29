pub const SESSION_EVENT_CHANNEL_CAPACITY: usize = 4096;

pub(crate) const MANAGED_TERMINAL_PROGRAM: &str = "sdkwork-terminal";
pub(crate) const MANAGED_TERMINAL_TYPE: &str = "xterm-256color";
pub(crate) const MANAGED_TERMINAL_COLOR_CAPABILITY: &str = "truecolor";
pub(crate) const MANAGED_TERMINAL_PROGRAM_VERSION: &str = env!("CARGO_PKG_VERSION");
pub(crate) const MANAGED_TERMINAL_FORCE_COLOR_LEVEL: &str = "3";

#[cfg(windows)]
pub(crate) const CREATE_NO_WINDOW: u32 = 0x0800_0000;
