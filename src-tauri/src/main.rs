mod api;
mod app;
mod port;
mod store;
mod tray;
mod tunnel;

use std::sync::{Arc, Mutex};

use tauri::Manager;

use store::Store;
use tunnel::manager::TunnelManager;

pub struct AppState {
    pub store: Store,
    pub tunnels: Arc<Mutex<TunnelManager>>,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let store = Store::load(app.handle())?;
            let tunnels = Arc::new(Mutex::new(TunnelManager::new()));

            app.manage(AppState {
                store,
                tunnels: tunnels.clone(),
            });

            tray::init(app.handle())?;
            app::start_background_renewal(app.handle(), tunnels);
            app::restore_desired_tunnels(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api::commands::list_ports,
            api::commands::list_tunnels,
            api::commands::open_tunnel,
            api::commands::close_tunnel,
            api::commands::renew_tunnel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
