use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, Position, Result, WebviewUrl,
    WebviewWindowBuilder,
};

const TRAY_POPUP_LABEL: &str = "tray-popup";
const TRAY_POPUP_WIDTH: f64 = 340.0;
const TRAY_POPUP_HEIGHT: f64 = 520.0;

fn rect_to_physical(rect: &tauri::Rect, scale_factor: f64) -> (f64, f64, f64, f64) {
    let (x, y) = match rect.position {
        tauri::Position::Physical(p) => (p.x as f64, p.y as f64),
        tauri::Position::Logical(p) => (p.x * scale_factor, p.y * scale_factor),
    };

    let (w, h) = match rect.size {
        tauri::Size::Physical(s) => (s.width as f64, s.height as f64),
        tauri::Size::Logical(s) => (s.width * scale_factor, s.height * scale_factor),
    };

    (x, y, w, h)
}

fn ensure_tray_popup_window(app: &AppHandle) -> Result<()> {
    if app.get_webview_window(TRAY_POPUP_LABEL).is_some() {
        return Ok(());
    }

    let url = if cfg!(target_os = "macos") {
        WebviewUrl::App("popup.html?mode=system".into())
    } else {
        WebviewUrl::App("popup.html".into())
    };

    let mut builder = WebviewWindowBuilder::new(app, TRAY_POPUP_LABEL, url)
        .title("Quick Connect")
        .visible(false)
        .resizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .inner_size(TRAY_POPUP_WIDTH, TRAY_POPUP_HEIGHT);

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .decorations(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .traffic_light_position(tauri::LogicalPosition::new(-10_000.0, -10_000.0));
    }

    #[cfg(not(target_os = "macos"))]
    {
        builder = builder
            .decorations(false)
            .transparent(true)
            .background_color(Color(0, 0, 0, 0))
            .shadow(true);
    }

    builder.build()?;

    Ok(())
}

fn hide_tray_popup(app: &AppHandle) -> Result<()> {
    if let Some(w) = app.get_webview_window(TRAY_POPUP_LABEL) {
        let _ = w.hide();
    }
    Ok(())
}

fn show_tray_popup_near(
    app: &AppHandle,
    position: PhysicalPosition<f64>,
    rect: tauri::Rect,
) -> Result<()> {
    ensure_tray_popup_window(app)?;
    let w = app
        .get_webview_window(TRAY_POPUP_LABEL)
        .expect("tray popup window missing after ensure");

    let popup_size = w.outer_size()?;
    let popup_width = popup_size.width as f64;
    let popup_height = popup_size.height as f64;

    let monitor = app
        .monitor_from_point(position.x, position.y)?
        .or(app.primary_monitor()?);

    let (monitor_x, monitor_y, monitor_w, monitor_h, scale_factor) = if let Some(m) = monitor {
        let mp = m.position();
        let ms = m.size();
        (
            mp.x as f64,
            mp.y as f64,
            ms.width as f64,
            ms.height as f64,
            m.scale_factor(),
        )
    } else {
        (0.0, 0.0, 10_000.0, 10_000.0, 1.0)
    };

    let (rect_x, rect_y, rect_w, rect_h) = rect_to_physical(&rect, scale_factor);

    let preferred_x = rect_x + rect_w - popup_width;

    let preferred_y = if rect_y <= (monitor_y + monitor_h / 2.0) {
        // tray seems to be near the top; show below
        rect_y + rect_h
    } else {
        // tray seems to be near the bottom; show above
        rect_y - popup_height
    };

    let clamped_x = preferred_x.clamp(monitor_x, monitor_x + monitor_w - popup_width);
    let clamped_y = preferred_y.clamp(monitor_y, monitor_y + monitor_h - popup_height);

    w.set_position(Position::Physical(tauri::PhysicalPosition::new(
        clamped_x.round() as i32,
        clamped_y.round() as i32,
    )))?;
    w.show()?;
    w.set_focus()?;
    Ok(())
}

fn toggle_tray_popup(app: &AppHandle, position: PhysicalPosition<f64>, rect: tauri::Rect) {
    let Some(w) = app.get_webview_window(TRAY_POPUP_LABEL) else {
        let _ = show_tray_popup_near(app, position, rect);
        return;
    };

    match w.is_visible() {
        Ok(true) => {
            let _ = hide_tray_popup(app);
        }
        _ => {
            let _ = show_tray_popup_near(app, position, rect);
        }
    }
}

pub fn init(app: &AppHandle) -> Result<()> {
    ensure_tray_popup_window(app)?;

    let open = MenuItemBuilder::new("Open").id("open").build(app)?;
    let quick_panel = MenuItemBuilder::new("Quick Panel")
        .id("quick_panel")
        .build(app)?;
    let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;
    let menu = MenuBuilder::new(app)
        .items(&[&quick_panel, &open, &quit])
        .build()?;

    let tray = TrayIconBuilder::with_id("tray-icon")
        .menu(&menu)
        .icon(tauri::include_image!("icons/icon.png"))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Down,
                position,
                rect,
                ..
            } = event
            {
                toggle_tray_popup(tray.app_handle(), position, rect);
            }
        })
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "quick_panel" => {
                let rect = app
                    .tray_by_id("tray-icon")
                    .and_then(|t| t.rect().ok().flatten())
                    .unwrap_or(tauri::Rect {
                        position: tauri::Position::Physical(tauri::PhysicalPosition::new(0, 0)),
                        size: tauri::Size::Physical(tauri::PhysicalSize::new(
                            TRAY_POPUP_WIDTH as u32,
                            TRAY_POPUP_HEIGHT as u32,
                        )),
                    });
                let (rect_x, rect_y, _rect_w, _rect_h) = rect_to_physical(&rect, 1.0);
                toggle_tray_popup(
                    app,
                    PhysicalPosition::new(rect_x, rect_y),
                    rect,
                );
            }
            "open" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
                let _ = hide_tray_popup(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    let _ = tray.set_icon_as_template(false);
    let _ = tray.set_show_menu_on_left_click(false);
    let _ = tray.set_tooltip(Some("jule-connect"));

    Ok(())
}
