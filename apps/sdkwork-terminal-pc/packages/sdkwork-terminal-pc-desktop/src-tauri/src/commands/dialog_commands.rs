use crate::mapper::{normalize_user_facing_path, resolve_working_directory_picker_starting_directory};
use crate::snapshots::DesktopWorkingDirectoryPickerRequest;
use std::sync::mpsc;
use std::time::Duration;
use tauri::Window;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn desktop_pick_working_directory(
    window: Window,
    request: DesktopWorkingDirectoryPickerRequest,
) -> Result<Option<String>, String> {
    let (sender, receiver) = mpsc::sync_channel(1);
    let mut dialog = window.dialog().file().set_parent(&window);

    if let Some(title) = request
        .title
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        dialog = dialog.set_title(title);
    }

    if let Some(starting_directory) =
        resolve_working_directory_picker_starting_directory(request.default_path.as_deref())
    {
        dialog = dialog.set_directory(starting_directory);
    }

    dialog.pick_folder(move |folder_path| {
        let response = folder_path
            .map(|value| {
                value
                    .simplified()
                    .into_path()
                    .map(|path| normalize_user_facing_path(&path))
                    .map_err(|error| error.to_string())
            })
            .transpose();
        let _ = sender.send(response);
    });

    tauri::async_runtime::spawn_blocking(move || -> Result<Option<String>, String> {
        receiver
            .recv_timeout(Duration::from_secs(300))
            .map_err(|error| match error {
                mpsc::RecvTimeoutError::Timeout => {
                    "working directory picker timed out waiting for a response".to_string()
                }
                mpsc::RecvTimeoutError::Disconnected => {
                    "working directory picker did not return a response".to_string()
                }
            })?
    })
    .await
    .map_err(|error| error.to_string())?
}
