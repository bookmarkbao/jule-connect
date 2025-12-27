生成应用图标（`src-tauri/icons`）

本项目使用 Tauri CLI 生成各平台需要的图标产物（macOS `.icns`、Windows `.ico`、以及多尺寸 PNG 等），输出到 `src-tauri/icons/`。

## 输入源

- 推荐：`src-tauri/app-icon.png`（1024x1024，方形）
- 原始设计稿：`src-tauri/app-icon-source.png`

要求：输入应为方形 PNG 或 SVG（建议透明背景）。

## 一键生成（推荐）

运行：

```bash
npm run gen:icons
```

默认会使用 `src-tauri/app-icon.png`，并输出到 `src-tauri/icons/`。

## 自定义输入/输出

```bash
npm run gen:icons -- --input src-tauri/app-icon-source.png --output src-tauri/icons
```

或简写：

```bash
npm run gen:icons -- src-tauri/app-icon-source.png
```

## 实现说明

- 入口脚本：`scripts/gen-icons.mjs`
- 底层调用：`./node_modules/.bin/tauri icon`
