use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

use tauri::{AppHandle, Manager};

use crate::{tunnel::manager::TunnelManager, AppState};

pub fn restore_desired_tunnels(app: &AppHandle) {
    let app = app.clone();
    thread::spawn(move || {
        let state = app.state::<AppState>();
        let desired = state.store.desired_tunnels();
        if desired.is_empty() {
            return;
        }

        for t in desired {
            let res: Result<(), String> = (|| {
                let mut mgr = state.tunnels.lock().map_err(|_| "lock tunnels failed".to_string())?;
                mgr.start(t.port).map(|_| ()).map_err(|e| e.to_string())
            })();
            if res.is_err() {
                let _ = state.store.disable_desired_tunnel(t.port);
            }
        }
    });
}

pub fn start_background_renewal(app: &AppHandle, tunnels: Arc<Mutex<TunnelManager>>) {
    let app = app.clone();
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(5));

        let dead_ports = {
            let mut mgr = match tunnels.lock() {
                Ok(m) => m,
                Err(_) => continue,
            };
            mgr.take_dead_ports()
        };

        if dead_ports.is_empty() {
            continue;
        }

        for port in dead_ports {
            let _ = tunnels.lock().map(|mut mgr| mgr.renew(port));
            let state = app.state::<AppState>();
            let _ = state.store.touch_desired_tunnel(port);
        }
    });
}
