use tauri::State;

use crate::{port::scanner::scan_listening_ports, store::DesiredTunnel, AppState};

#[tauri::command]
pub fn list_ports() -> Result<Vec<crate::port::PortInfo>, String> {
    scan_listening_ports().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_tunnels(state: State<'_, AppState>) -> Result<Vec<crate::tunnel::TunnelInfo>, String> {
    let mgr = state.tunnels.lock().map_err(|_| "lock tunnels failed")?;
    Ok(mgr.list())
}

#[tauri::command]
pub fn open_tunnel(state: State<'_, AppState>, port: u16) -> Result<String, String> {
    {
        let mut mgr = state.tunnels.lock().map_err(|_| "lock tunnels failed")?;
        let info = mgr.start(port).map_err(|e| e.to_string())?;
        state
            .store
            .enable_desired_tunnel(DesiredTunnel {
                port,
                provider: info.provider.clone(),
                updated_at_ms: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok(info.url)
    }
}

#[tauri::command]
pub fn close_tunnel(state: State<'_, AppState>, port: u16) -> Result<(), String> {
    {
        let mut mgr = state.tunnels.lock().map_err(|_| "lock tunnels failed")?;
        mgr.stop(port).map_err(|e| e.to_string())?;
    }
    state
        .store
        .disable_desired_tunnel(port)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn renew_tunnel(state: State<'_, AppState>, port: u16) -> Result<String, String> {
    let url = {
        let mut mgr = state.tunnels.lock().map_err(|_| "lock tunnels failed")?;
        let info = mgr.renew(port).map_err(|e| e.to_string())?;
        info.url
    };
    state
        .store
        .touch_desired_tunnel(port)
        .map_err(|e| e.to_string())?;
    Ok(url)
}
