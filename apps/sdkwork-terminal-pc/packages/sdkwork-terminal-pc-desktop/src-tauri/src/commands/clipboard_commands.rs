use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

#[tauri::command]
pub fn desktop_clipboard_read_text(app_handle: AppHandle) -> Result<String, String> {
    app_handle
        .clipboard()
        .read_text()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn desktop_clipboard_write_text(app_handle: AppHandle, text: String) -> Result<(), String> {
    app_handle
        .clipboard()
        .write_text(text)
        .map_err(|error| error.to_string())
}
