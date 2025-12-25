# jule-connect 技术实现（MVP）

## 目标

- 发现本机正在监听的端口
- 对指定端口启动隧道，并得到公网 HTTPS URL
- 隧道掉线/进程退出后自动续期（重建）
- 重启 App 后自动恢复“需要保持分享”的端口（续期恢复）

## 架构

- 桌面框架：Tauri v2（Rust Core + Web UI）
- UI：React + Vite
- IPC：Tauri `command`
- Tunnel Provider：Cloudflare Quick Tunnel（`cloudflared tunnel --url http://localhost:<port>`）

## Core 模块

- 端口扫描：`src-tauri/src/port/scanner.rs`
  - macOS/Linux：`lsof -iTCP -sTCP:LISTEN -P -n`
  - Windows：`netstat -ano -p tcp`（仅 LISTENING）
- Tunnel Provider：`src-tauri/src/tunnel/cloudflare.rs`
  - 启动 `cloudflared`
  - 监听 stdout/stderr，抓取 `https://*.trycloudflare.com`
  - 20 秒内未拿到 URL 视为失败并杀进程
- Tunnel 生命周期：`src-tauri/src/tunnel/manager.rs`
  - `start/stop/renew/list`
  - `take_dead_ports()`：检测子进程是否退出，用于续期触发
- 续期机制：`src-tauri/src/app.rs`
  - 每 5 秒巡检一次：发现 dead port 后调用 `renew(port)`
  - App 启动后读取持久化期望列表，逐个 `start(port)` 恢复
- 状态持久化：`src-tauri/src/store.rs`
  - 文件：`app_data_dir/state.json`
  - 保存“期望保持分享”的端口列表（用于续期恢复）

## 对外 API（Tauri Commands）

对应实现：`src-tauri/src/api/commands.rs`

- `list_ports()` -> `PortInfo[]`
- `list_tunnels()` -> `TunnelInfo[]`
- `open_tunnel(port)` -> `url`
- `close_tunnel(port)`
- `renew_tunnel(port)` -> `url`

## UI（面板）

- `src/App.tsx`
  - 展示端口列表 + 当前隧道状态
  - Share / Renew / Close / Copy
  - 2.5s 轮询刷新（MVP 简化）

## 已知限制（MVP）

- Quick Tunnel 的 URL 可能会在续期/重启后变化（云端分配）
- 仅实现 Cloudflare provider；ngrok/localtunnel 作为后续扩展点（`TunnelProvider` trait）
- Tray 当前仅提供 Open/Quit 基础菜单，未动态展示端口状态
