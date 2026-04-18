#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

fn main() {
    sdkwork_terminal_desktop_host_lib::run();
}
