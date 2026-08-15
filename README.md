# DeepSeek Harness App

> 基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Electron 桌面端重构版。

DeepSeek Harness 是 DeepSeek AI 开源的 Agent Harness：以 Cordis 为底座，核心能力以插件方式组合。原项目当前仍处于开发者预览阶段，默认入口是浏览器 Web UI。本仓库将它封装为 macOS Apple Silicon 桌面应用，并围绕日常使用补齐了文件、产物预览、权限切换与插件管理体验。

## 做了什么

- **Electron 桌面启动**：启动后由 Electron 托管本地 Harness Host，仅监听 `127.0.0.1` 的随机端口，不对局域网暴露服务。
- **独立本地数据目录**：会话、设置、插件状态及 API Key 存在 Electron 的应用支持目录；构建安装包时会校验并拒绝把这些个人数据带入产物。
- **上传与解析**：输入框提供清晰的上传文件按钮。附件在对话中以文件标签显示，不会把 Word 等文档全文塞进聊天记录。
- **右侧产物面板**：支持 HTML、Markdown、图片、PDF、DOCX 等常见产物的预览；HTML 与 Markdown 可进入编辑态，修改后实时预览并保存。网页、Markdown 的预览和编辑均支持放大窗口。
- **文档预览**：DOCX 支持右侧内容预览及通过系统默认应用打开；图片支持预览与画布编辑。
- **权限与命令菜单**：输入框旁的单一工具入口提供“权限 / 命令”二级菜单，当前权限会显示在加号旁。完全访问需要确认风险后才会启用。
- **插件管理**：可查看插件用途、悬浮阅读说明，并切换允许停用的插件；不可停用项与配置热更新均会显示原因提示。
- **配置热更新**：配置热更新已内置，插件状态修改后会保存并在下次启动时恢复。

## 架构

```text
Electron Main Process
  ├─ 创建桌面窗口（Context Isolation + Sandbox）
  ├─ 启动本地 `dsh web --port 0`
  ├─ 只接受 Harness 返回的 127.0.0.1 随机端口
  └─ 退出时回收 Host 子进程

DeepSeek Harness Host
  ├─ Cordis 插件系统
  ├─ Agent / Session / Workspace / Plugin Inventory
  └─ 本地 API 与 Web 前端资源

React Client
  ├─ 对话、权限、命令、附件
  ├─ 插件设置
  └─ 右侧产物预览与编辑器
```

## 环境要求

- macOS（当前桌面构建目标为 Apple Silicon / arm64）
- Node.js `22.19.0+` 或 `24+`
- pnpm `11.7.0`

## 从源码启动桌面应用

```bash
git clone https://github.com/PAISHU-AI/DeepSeek-Harness-convergence-version.git
cd DeepSeek-Harness-convergence-version
pnpm install
pnpm run desktop:dev
```

`desktop:dev` 会先构建 Harness 的 Host 与前端资源，再启动 Electron。首次构建耗时会更长；后续仅查看已构建效果时，也可以在仓库根目录执行：

```bash
apps/electron/node_modules/.bin/electron apps/electron
```

## 常用命令

```bash
# 重新构建桌面端所依赖的 Host 和客户端资源
pnpm run desktop:build

# 构建 macOS arm64 DMG（仅在准备发版时执行）
pnpm run desktop:dist
```

`desktop:dist` 的输出目录为 `apps/electron/release/`。当前产物为未签名 DMG；正式分发请在具备 Apple Developer 证书的环境中完成签名和公证。

## 配置与隐私

桌面端使用 Electron 的 `userData/harness` 目录作为 `DSH_HOME`。API Key、会话、插件开关和本地配置都留在该目录，不会进入 Git 仓库，也不会被打进 DMG。请勿将个人配置文件提交到远程仓库。

## 上游与许可证

本项目基于 DeepSeek AI 的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 开发，保留其 MIT License。本仓库是独立的桌面端改造项目，并非 DeepSeek AI 官方发布版本。

原始项目仍处于开发者预览阶段，上游接口和插件机制可能发生不兼容变更；升级上游版本前请先在本地验证桌面端启动、插件加载与产物预览流程。
