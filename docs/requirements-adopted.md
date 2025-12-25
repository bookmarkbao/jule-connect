# jule-connect 需求采纳（MVP）

## 已采纳（本次实现）

- 端口扫描（跨平台）
  - macOS/Linux：基于 `lsof`
  - Windows：基于 `netstat`
- 一键 Share via Tunnel
  - Provider：Cloudflare Quick Tunnel（`cloudflared`）
  - 自动解析并返回公网 HTTPS URL
- 续期（稳定性）
  - 手动续期：UI `Renew` / 命令 `renew_tunnel`
  - 自动续期：隧道子进程退出后后台巡检自动重建
  - 启动续期恢复：重启 App 后自动恢复“保持分享”的端口
- 基础 Tray 常驻入口
  - Open / Quit
- 可编程接口（第一版）
  - 通过 Tauri commands 暴露端口扫描与隧道生命周期

## 暂缓（未采纳/后续）

- 多 Provider（ngrok/localtunnel/zrok）与 Provider 选择 UI
- 稳定域名/固定 URL（需要 Cloudflare 登录与 Tunnel 命名/证书管理）
- 自动发现“新启动的 dev server”并自动分享（策略/白名单）
- 本地 HTTP API Server（`POST /tunnel/open` 等）与鉴权
- Windows 进程命令获取（`Get-Process`/WMI）与更完整的进程信息
- 动态 Tray 菜单展示端口与 URL

