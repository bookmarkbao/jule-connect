# jule-connect

把本机 `localhost` 端口一键“分享”为公网 HTTPS 地址（隧道），并支持掉线自动续期恢复。

## 先决条件

- Node.js / npm
- Rust toolchain（Tauri v2）
- 已安装 `cloudflared`（用于 Cloudflare Quick Tunnel）

## 开发

- 安装依赖：`npm i`
- 启动桌面端：`npm run dev`（Tauri dev）

## 说明

- 当前 MVP 仅内置 `cloudflared` provider；URL 可能会在续期/重启后变化（Quick Tunnel 特性）。
- 技术实现：`docs/tech-implementation.md`
- 需求采纳：`docs/requirements-adopted.md`
