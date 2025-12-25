use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager, Result,
};

pub fn init(app: &AppHandle) -> Result<()> {
    let open = MenuItemBuilder::new("Open").id("open").build(app)?;
    let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&open, &quit]).build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "open" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
