# jule-connect UI/交互迁移参考（基于 `port-killer-main` 代码）

目的：分析 `port-killer-main` 的布局结构、核心功能与字段，并规划将“核心布局 + 核心交互 + 字段对齐”迁移到 `jule-connect`（Tauri + React + shadcn/ui）。

说明：以下结论以 `port-killer-main/Sources` 的 SwiftUI 实现为准（不是截图/二手描述）。

---

## 1) port-killer 的整体布局结构（真实代码）

### 1.1 主窗口：三栏 NavigationSplitView（Sidebar / List / Detail）

`port-killer-main/Sources/Views/MainWindowView.swift`：

- 三栏 `NavigationSplitView`
  - 左侧：`SidebarView`（分组过滤器）
  - 中间：内容区（默认 `PortTableView`；也可能是 Settings / Sponsors / K8s Port Forward / Cloudflare Tunnels）
  - 右侧：详情区（默认 `PortDetailView`；部分页面为空/日志面板）
- 中间栏全局搜索：`.searchable(text: $filter.searchText, prompt: "Search ports, processes...")`
- 顶部 toolbar：Refresh（Cmd+R）、Settings（Cmd+,）
- 底部 status bar：端口数量、扫描中指示
- Delete / ForwardDelete：对选中 port 执行 kill（带状态管理）

### 1.2 Menu Bar Extra（菜单栏弹窗/入口）

`port-killer-main/Sources/PortKillerApp.swift`：

- App 以菜单栏应用为主（Dock 图标随主窗口开关切换）
- 退出前清理：kill stuck port-forward、stop all tunnels

> jule-connect 目前先迁移主窗口布局；tray popup 可后续对齐。

---

## 2) Sidebar（过滤器）结构与交互（真实代码）

`port-killer-main/Sources/Views/SidebarView.swift`：

### 2.1 Sections 与条目

- **Categories**
  - All Ports（右侧数量：`ports.count`）
  - Favorites（右侧数量 + “+” 弹出框添加端口）
  - Watched（右侧数量 + “+” 弹出框添加端口 + watch 行为）
- **Networking**
  - K8s Port Forward（连接数量 + 绿点状态）
  - Cloudflare Tunnels（tunnels 数量 + 活跃绿点状态）
- **Process Types**
  - Web Server / Database / Development / System / Other（每项右侧数量）
- **Filters**
  - Port Range：min/max 输入
  - Reset Filters（仅当 filter 生效时出现）
- 其它
  - Sponsors
  - Settings

### 2.2 交互要点

- Sidebar 不是“路由页面”，而是“视图过滤器”（影响中间列表 `filteredPorts`）
- Favorites/Watched 支持“手动添加端口”
  - 即使端口当前未监听，也会以 `inactive` 占位显示（`PortInfo.inactive(port:)`）
- Filters 与 Search 共同影响展示结果

---

## 3) Main List（PortTableView）结构与交互（真实代码）

`port-killer-main/Sources/Views/PortTable/PortTableView.swift`：

### 3.1 表格列（Header 的真实列）

- ★（用于 Favorite/Watch 排序）
- 状态点（Active/Inactive）
- Port
- Process
- PID
- Type（由 `processName` heuristics 检测）
- Address
- User
- Actions

### 3.2 核心交互

- 排序：点击 header 切换排序字段与升降序
- 视图切换：List View ↔ Tree View（按 PID 分组、可展开）
- 选择行：右侧显示 `PortDetailView`
- 空态：无端口时展示 `ContentUnavailableView`

---

## 4) Detail Panel（PortDetailView）结构与交互（真实代码）

`port-killer-main/Sources/Views/PortDetailView.swift`：

### 4.1 详情字段（明确展示）

- Port / PID / Address / User / File Descriptor(fd) / Type
- Command（monospace 展示，可复制）

### 4.2 Actions（强操作集中在右侧）

- Add/Remove Favorite
- Watch/Stop Watching
- Tunnel
  - cloudflared 未安装：显示缺失 banner
  - 已有 tunnel：状态 badge + Copy URL + Stop
  - 无 tunnel：Share via Tunnel
- Kill Process（带确认对话框）

---

## 5) Cloudflare Tunnels 视图（Networking → Cloudflare Tunnels）

`port-killer-main/Sources/Views/CloudflareTunnels/CloudflareTunnelsView.swift`：

- Header：Stop All（当存在 tunnels 时）
- 依赖提示：cloudflared missing banner
- 列表：每条 tunnel 展示 port + url/状态/错误
- 行内操作：
  - Copy URL（带 “已复制” feedback）
  - Open in Browser
  - Stop tunnel（x）
  - 右键菜单（Copy/Open/Stop）
- 底部 status bar：active tunnels 数 + cloudflared installed 状态

---

## 6) 字段模型（port-killer 的对齐基准）

port-killer 的 `PortInfo`（`port-killer-main/Sources/Models/PortInfo.swift`）：

- `port: Int`
- `pid: Int`
- `processName: String`
- `address: String`
- `user: String`
- `command: String`（完整命令行）
- `fd: String`
- `isActive: Bool`
- `processType: ProcessType`（由 processName 检测）

---

## 7) 迁移到 jule-connect：本次只做“核心”

### 7.1 迁移范围（做）

- 三栏布局：Sidebar / Main List / Detail Panel
- Sidebar 核心项：All / Favorites / Watched / Cloudflare Tunnels + Port Range + Search
- 主表格核心列：★ / 状态 / Port / Process / PID / Type / Address / User / Actions（字段对齐优先）
- Detail Panel：字段区 + Command 区 + Tunnel Actions（Share/Copy/Renew/Close）
- Cloudflare Tunnels 视图：tunnels 列表（Stop All 可选）

### 7.2 暂不迁移（不做/后续）

- K8s Port Forwarder window + logs
- Sponsors/Update/KeyboardShortcuts（桌面端增强体验）
- Kill Process / Kill All（jule-connect 如需再补 Rust 命令与权限策略）

---

## 8) 第一步：用 shadcn blocks 规划 jule-connect 的布局结构

目标：先把 layout “搭骨架”，再把字段/交互逐步填满。

### 推荐 block 风格（对应三栏桌面工具）

- Sidebar block：左侧垂直导航（Section + Badge count + 选中态）
- Toolbar/Search block：中间栏顶部（Search + Refresh）
- Table/List block：中间栏主体（可排序表格；Tree view 后续再加）
- Detail panel block：右侧卡片式详情（Metadata grid + Command + Actions）

### React 组件树建议（jule-connect）

- `AppShell`
  - `Sidebar`
  - `MainPane`
    - `Toolbar`
    - `PortTable`
  - `DetailPane`
    - `PortDetail`

---

## 9) 第二步：实现核心功能（字段对齐优先）

- Port 扫描列表：字段至少能填 `Port/PID/Process/Address/User/FD/isActive`
- 搜索：按 `port/process/command/address` 模糊过滤
- Favorites / Watched：本地持久化（对齐 port-killer：未监听也显示占位）
- Tunnel 管理：按 port 显示 tunnel 状态，并提供 Share/Copy/Renew/Close

---

## 10) jule-connect 当前落地情况（对应本次迁移）

- 三栏布局（Sidebar / List / Detail）：`src/App.tsx`
- shadcn 基础组件：`src/components/ui/button.tsx`、`src/components/ui/card.tsx`、`src/components/ui/badge.tsx`、`src/components/ui/input.tsx`
- Port 扫描字段对齐（补齐 address/user/fd/isActive/processName）：`src-tauri/src/port/mod.rs`、`src-tauri/src/port/scanner.rs`
- Favorites/Watched 本地持久化（含 inactive 占位）：`src/App.tsx`
