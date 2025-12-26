# jule-connect

把本机 `localhost` 端口一键“分享”为公网 HTTPS 地址（隧道），并支持掉线自动续期恢复。

## 产品声明（Product Statement）

`jule-connect` 是一个桌面端网络工具：帮助你把本机正在监听的端口（例如 `http://localhost:3000`）快速暴露为公网可访问的 HTTPS 地址，用于临时分享、联调、演示和远程访问。

设计目标：

- **一键分享**：从端口列表选择一个端口，生成可访问的公网链接。
- **自动恢复**：隧道掉线后自动续期/重建（取决于 provider 能力）。
- **可观察与可控**：收藏、关注、复制链接、打开浏览器访问、关闭/续期隧道。
- **跨平台**：macOS / Windows（以及可选 Linux）保持一致体验。

重要说明：

- 当前默认 provider 为 **Cloudflare Quick Tunnel（`cloudflared`）**。Quick Tunnel 的 URL 可能在重建/续期/重启后变化，这是其特性，不是 bug。
- 本工具会调用系统命令获取端口占用信息，并可在你确认后结束占用端口的进程（“Kill”）。请谨慎使用。

## 先决条件

- Node.js / npm
- Rust toolchain（Tauri v2）
- 已安装 `cloudflared`（用于 Cloudflare Quick Tunnel）

## 开发

- 安装依赖：`npm i`
- 启动桌面端：`npm run dev`（Tauri dev）
- 开发端口：默认 `5177`；如需修改，同时改 `vite.config.ts` 和 `src-tauri/tauri.conf.json` 的 `build.devUrl`

## 使用说明（桌面端）

- **刷新端口列表**：顶部刷新按钮会扫描本机监听端口。
- **创建分享链接**：在详情面板点击 `Create Share Link`。
  - 创建过程会显示 loading，并在顶部 Toast 提示进度与结果。
  - 创建成功后会显示 URL；你可以 `Copy URL` 或 `Open` 用系统默认浏览器打开。
- **续期/关闭**：对已创建的链接可以 `Renew` 或 `Close`。
- **Kill 端口进程**：在端口表格的垃圾桶按钮点击并确认后，会结束对应 PID（用于释放端口）。

## 技术使用说明（Technical Notes）

### 技术栈

- UI：React + Vite + TailwindCSS + shadcn/ui（Radix）
- 桌面：Tauri v2（Rust）
- 状态管理：Zustand
- 反馈与加载：`react-hot-toast` + `react-spinners`

### 架构概览

- 前端通过 `@tauri-apps/api/core` 的 `invoke()` 调用后端命令，核心命令位于：
  - `src-tauri/src/api/commands.rs`
- 隧道管理（Cloudflare provider）：
  - `src-tauri/src/tunnel/manager.rs`
  - `src-tauri/src/tunnel/cloudflare.rs`
- 端口扫描（不同平台走不同系统命令）：
  - `src-tauri/src/port/scanner.rs`
- Kill 进程（不同平台走不同系统命令）：
  - `src-tauri/src/port/killer.rs`

### 平台差异（重要）

- macOS / Linux：端口扫描依赖 `lsof`；结束进程使用 `kill`。
- Windows：端口扫描依赖 `netstat -ano`；结束进程使用 `taskkill`。
- 打开浏览器：Tauri 命令 `open_url` 通过系统默认方式打开（Windows `explorer` / macOS `open` / Linux `xdg-open`）。

### 常见问题（FAQ）

- **为什么复制失败（NotAllowedError）？**
  - 这是 WebView 对 Clipboard API 的限制（通常需要用户手势触发）。本项目已移除“自动复制”，但 `Copy URL` 仍可能因平台策略失败；建议在需要时手动复制或后续改为 Tauri 原生剪贴板能力。

## 说明

- 当前 MVP 仅内置 `cloudflared` provider；URL 可能会在续期/重启后变化（Quick Tunnel 特性）。
- 技术实现：`docs/tech-implementation.md`
- 需求采纳：`docs/requirements-adopted.md`

## 许可证（AGPL-3.0）

本项目采用 **GNU Affero General Public License v3.0（AGPL-3.0-only）** 发布，详见 `LICENSE`。

开发者/使用者须知（简要）：

- 你可以在遵守 AGPL-3.0 的前提下使用、修改与分发本项目。
- 如果你修改本项目并向他人提供网络服务（包括在你的环境中向用户提供可访问的功能），通常需要向用户提供相应的源代码（以 AGPL-3.0 的要求为准）。
