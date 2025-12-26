use tauri::State;

use crate::{
    port::{killer::kill_pid as kill_pid_impl, scanner::scan_listening_ports},
    store::DesiredTunnel,
    AppState,
};

fn open_url_impl(url: &str) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("only http(s) urls are allowed".to_string());
    }

    let status = if cfg!(target_os = "windows") {
        std::process::Command::new("explorer")
            .arg(url)
            .status()
            .map_err(|e| e.to_string())?
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open")
            .arg(url)
            .status()
            .map_err(|e| e.to_string())?
    } else {
        std::process::Command::new("xdg-open")
            .arg(url)
            .status()
            .map_err(|e| e.to_string())?
    };

    if !status.success() {
        return Err(format!("failed to open url (exit={})", status));
    }

    Ok(())
}

#[tauri::command]
pub async fn list_ports() -> Result<Vec<crate::port::PortInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| scan_listening_ports())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_tunnels(state: State<'_, AppState>) -> Result<Vec<crate::tunnel::TunnelInfo>, String> {
    let mgr = state.tunnels.lock().map_err(|_| "lock tunnels failed")?;
    Ok(mgr.list())
}

#[tauri::command]
pub async fn open_tunnel(state: State<'_, AppState>, port: u16) -> Result<String, String> {
    let store = state.store.clone();
    let tunnels = state.tunnels.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut mgr = tunnels.lock().map_err(|_| "lock tunnels failed".to_string())?;
        let info = mgr.start(port).map_err(|e| e.to_string())?;
        store
            .enable_desired_tunnel(DesiredTunnel {
                port,
                provider: info.provider.clone(),
                updated_at_ms: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok::<_, String>(info.url)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn close_tunnel(state: State<'_, AppState>, port: u16) -> Result<(), String> {
    let store = state.store.clone();
    let tunnels = state.tunnels.clone();
    tauri::async_runtime::spawn_blocking(move || {
        {
            let mut mgr = tunnels.lock().map_err(|_| "lock tunnels failed".to_string())?;
            mgr.stop(port).map_err(|e| e.to_string())?;
        }
        store
            .disable_desired_tunnel(port)
            .map_err(|e| e.to_string())?;
        Ok::<_, String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn renew_tunnel(state: State<'_, AppState>, port: u16) -> Result<String, String> {
    let store = state.store.clone();
    let tunnels = state.tunnels.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let url = {
            let mut mgr = tunnels.lock().map_err(|_| "lock tunnels failed".to_string())?;
            let info = mgr.renew(port).map_err(|e| e.to_string())?;
            info.url
        };
        store.touch_desired_tunnel(port).map_err(|e| e.to_string())?;
        Ok::<_, String>(url)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn kill_pid(pid: u32, force: Option<bool>) -> Result<(), String> {
    let force = force.unwrap_or(true);
    tauri::async_runtime::spawn_blocking(move || kill_pid_impl(pid, force))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || open_url_impl(&url))
        .await
        .map_err(|e| e.to_string())?
}
