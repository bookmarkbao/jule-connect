# GitFlow 打包与发版（Tag 自动打包）

本项目使用 **GitFlow 分支模型**，并在 **推送 tag（例如 `v0.1.0`）** 时自动打包并发布 GitHub Release，产出 macOS / Windows 安装包。

## 分支约定

- `main`：线上稳定版本（只合并 release/hotfix）
- `develop`：日常集成分支（feature 合并目标）
- `feature/*`：功能分支（从 `develop` 切出，合并回 `develop`）
- `release/*`：发版分支（从 `develop` 切出，合并到 `main` + 回合并到 `develop`）
- `hotfix/*`：线上修复（从 `main` 切出，合并到 `main` + 回合并到 `develop`）

## 版本号与 Tag 规则

- Tag 必须是：`vX.Y.Z`（例如：`v0.1.0`）
- Tag 的 `X.Y.Z` 必须与以下两个版本一致，否则 CI 会失败：
  - `src-tauri/tauri.conf.json` 的 `version`
  - `src-tauri/Cargo.toml` 的 `[package].version`

## 发版流程（release 分支）

1. 从 `develop` 切出 release 分支：
   - `git checkout develop`
   - `git pull`
   - `git checkout -b release/0.1.0`
2. 更新版本号（两处）：
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
3. 合并到 `main` 并打 tag：
   - `git checkout main`
   - `git pull`
   - `git merge --no-ff release/0.1.0`
   - `git tag -a v0.1.0 -m "release v0.1.0"`
4. 回合并到 `develop`：
   - `git checkout develop`
   - `git pull`
   - `git merge --no-ff release/0.1.0`
5. 推送分支与 tag：
   - `git push origin main develop`
   - `git push origin v0.1.0`

推送 tag 后，GitHub Actions 将自动：

- macOS：打包 `.dmg`
- Windows：打包 `.msi` / `.exe`（NSIS）
- 创建/更新 GitHub Release，并把安装包作为附件上传

## Hotfix（线上紧急修复）

1. 从 `main` 切出：
   - `git checkout main`
   - `git pull`
   - `git checkout -b hotfix/0.1.1`
2. 修复并按需要更新版本号
3. 合并回 `main` + `develop`，并打 tag `v0.1.1`（同上）

## CI 配置

- 自动打包与发布：`.github/workflows/release.yml`
