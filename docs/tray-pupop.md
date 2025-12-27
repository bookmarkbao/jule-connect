很好，这一张图**正好是整个 port-killer 最“灵魂”的功能点**。
我先**告诉你这是什么**，再**教你怎么“准确描述给 AI”**，最后给你**Tauri 里如何实现的工程级方案**（不是概念）。

---

## 一、这是什么功能？一句话说清楚

> **这是「系统托盘（Tray）点击弹出的原生 Popup 面板」**
> 行为上 **等同于浏览器扩展的 Popup**，但它是**系统级的**

在 macOS 上也常被叫作：

* Tray Popup
* Status Bar Popover
* Menubar App Panel

port-killer 的这个功能不是“打开窗口”，而是：

> **点击顶部状态栏图标 → 立即显示一个轻量、无窗口感的操作面板**

---

## 二、它和“普通窗口”的本质区别（很重要）

| 项目         | 普通窗口         | Tray Popup      |
| ---------- | ------------ | --------------- |
| 是否显示在 Dock | 是            | 否               |
| 是否可独立切换    | 是            | 否               |
| 是否常驻       | 否            | 是               |
| 出现方式       | Cmd+Tab / 打开 | **点击图标瞬间出现**    |
| 设计目标       | 完整功能         | **快速查看 + 快速操作** |

👉 **这是一个“Quick Panel”，不是 App 本体**

---

## 三、这个 Popup 在 port-killer 里承担什么职责？

你可以这样描述给 AI（这是核心认知）：

> **Tray Popup 是“主应用的快速控制面板”，
> 用于在不打开主窗口的情况下，快速查看端口 / tunnel 状态，并执行常用操作。**

### Popup 里做的事（只做三类）：

1. **状态一眼可见**

   * Cloudflare Tunnels 列表
   * Local Ports 状态
   * 成功 / Error（红绿点）

2. **轻操作**

   * Copy URL
   * Stop / Kill
   * Refresh

3. **入口跳转**

   * Open Main App
   * Quit

🚫 **不放复杂设置**
🚫 **不放 Sponsors**
🚫 **不放 Settings（你这个决策非常正确）**

---

## 四、如何“准确描述给 AI”让它实现（你可以直接复制）

你可以把下面这段**原封不动丢给 AI**：

```text
Implement a system tray popup (menubar popover) similar to port-killer.

Requirements:
- Clicking the tray icon should show a lightweight popup panel (not a full window)
- The popup behaves like a browser extension popup:
  - Appears instantly
  - Dismisses when clicking outside
  - Does not appear in Dock or app switcher
- The popup displays:
  - A list of active Cloudflare tunnels (port + public URL + status)
  - A list of local ports
  - Status indicators (green = active, red = error)
- Each item supports quick actions:
  - Copy URL
  - Stop / disconnect tunnel
- Bottom actions:
  - Refresh
  - Open main window
  - Quit application
- Do NOT include Sponsors or Settings in the popup

This popup is a quick control panel, not the main application UI.
```

---

## 五、在 Tauri 里如何实现（工程级）

### 核心概念（记住这 3 个）

1. **Tray（系统托盘）**
2. **Popover / hidden window**
3. **Window positioning + focus behavior**

---

### 1️⃣ 创建系统托盘（Tray）

```rust
tauri::SystemTray::new()
  .with_menu(tauri::SystemTrayMenu::new())
```

但注意：
**port-killer 的 Popup 不是 MenuItem，而是一个 Window**

---

### 2️⃣ 创建一个「专用 Popup Window」（关键）

这个窗口必须具备以下特性：

* 无标题栏
* 无边框
* 不显示在 Dock
* 不显示在 Cmd+Tab
* 失焦即关闭

Tauri 配置示意：

```rust
tauri::WindowBuilder::new(
  app,
  "tray-popup",
  tauri::WindowUrl::App("popup.html".into())
)
.decorations(false)
.resizable(false)
.always_on_top(true)
.skip_taskbar(true)
.visible(false)
.build()?;
```

👉 **这是 Popup 的核心**

---

### 3️⃣ 点击 Tray 图标 → 切换 Popup 显示

逻辑是：

```rust
on_tray_icon_click {
  if popup_visible {
    hide_popup();
  } else {
    position_popup_near_tray();
    show_popup();
  }
}
```

Popup 出现的位置要靠近菜单栏右上角（macOS）。

---

### 4️⃣ Popup 的 UI 特点（前端）

Popup UI 和主窗口 **不是同一个页面**：

* 使用同一套组件（shadcn）
* 但布局更紧凑
* 禁止复杂路由

建议结构：

```
popup/
├── TunnelList
├── LocalPortList
└── FooterActions
```

---

### 5️⃣ 失焦自动关闭（非常关键）

这是 Popup 的“灵魂”：

```js
window.addEventListener("blur", () => {
  invoke("hide_tray_popup");
});
```

**没有这个，就不像浏览器 Popup**

---

## 六、你这个 Popup 在 jule-connect 中的定位（帮你定名）

我强烈建议你在项目中这样叫它：

> **Quick Connect Panel**

而不是：

* tray window
* popup window

因为它是一个**能力面板**。

---

## 七、和你现有架构的映射（快速对齐）

| port-killer        | jule-connect        |
| ------------------ | ------------------- |
| Tray Popup         | Quick Connect Panel |
| Cloudflare Tunnels | Primary Feature     |
| Local Ports        | Secondary Context   |
| Kill               | Disconnect          |
| Copy URL           | Share               |

---

## 八、你现在的判断是 100% 正确的两点

✔️ **Sponsors 不进 Popup**
✔️ **Settings 不进 Popup**

因为：

> **Popup = 快速操作
> 主窗口 = 完整控制**

这是成熟系统工具的分工。

---

## 九、如果你愿意，我可以下一步直接给你：

1. 🧱 **Tauri Tray + Popup 最小可运行代码**
2. 🎨 **Popup 的 shadcn UI 结构（组件级）**
3. 📐 **macOS / Windows Popup 行为差异处理**

