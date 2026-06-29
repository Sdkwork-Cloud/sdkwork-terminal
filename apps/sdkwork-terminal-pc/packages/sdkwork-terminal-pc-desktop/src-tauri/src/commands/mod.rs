mod ai_cli_commands;
mod clipboard_commands;
mod connector_commands;
mod dialog_commands;
mod host_commands;
mod secure_session_commands;
mod session_commands;

pub use ai_cli_commands::{desktop_ai_cli_discovery, desktop_ai_cli_launch};
pub use clipboard_commands::{desktop_clipboard_read_text, desktop_clipboard_write_text};
pub use connector_commands::{
    desktop_connector_exec_probe, desktop_connector_launch, desktop_connector_session_create,
    desktop_execution_target_catalog,
};
pub use dialog_commands::desktop_pick_working_directory;
pub use host_commands::{
    desktop_daemon_health, desktop_daemon_reconnect, desktop_daemon_start, desktop_daemon_stop,
    desktop_host_status,
};
pub use secure_session_commands::{
    desktop_secure_session_clear, desktop_secure_session_clear_slot, desktop_secure_session_read,
    desktop_secure_session_read_slot, desktop_secure_session_write,
    desktop_secure_session_write_slot,
};
pub use session_commands::{
    desktop_local_process_session_create, desktop_local_shell_exec,
    desktop_local_shell_session_create, desktop_local_shell_session_input,
    desktop_local_shell_session_input_bytes, desktop_local_shell_session_resize,
    desktop_local_shell_session_terminate, desktop_session_attach,
    desktop_session_attachment_acknowledge, desktop_session_detach, desktop_session_index,
    desktop_session_input, desktop_session_input_bytes, desktop_session_reattach,
    desktop_session_replay_slice, desktop_session_resize, desktop_session_terminate,
};
