use crate::secure_session;

#[tauri::command]
pub fn desktop_secure_session_read() -> Result<Option<String>, String> {
    // Default-slot read. Maintains the original command surface so
    // existing frontend callers continue to work; slot-aware callers
    // use `desktop_secure_session_read_slot`.
    secure_session::read_secure_session_payload(None)
}

#[tauri::command]
pub fn desktop_secure_session_write(payload: String) -> Result<(), String> {
    secure_session::write_secure_session_payload(payload, None, None)
}

#[tauri::command]
pub fn desktop_secure_session_clear() -> Result<(), String> {
    secure_session::clear_secure_session_payload(None)
}

#[tauri::command]
pub fn desktop_secure_session_read_slot(slot: String) -> Result<Option<String>, String> {
    secure_session::read_secure_session_payload(Some(&slot))
}

#[tauri::command]
pub fn desktop_secure_session_write_slot(
    slot: String,
    payload: String,
    ttl_seconds: Option<u64>,
) -> Result<(), String> {
    secure_session::write_secure_session_payload(payload, Some(&slot), ttl_seconds)
}

#[tauri::command]
pub fn desktop_secure_session_clear_slot(slot: String) -> Result<(), String> {
    secure_session::clear_secure_session_payload(Some(&slot))
}
