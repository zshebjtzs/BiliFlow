# BiliFlow

BiliFlow 是一个基于 yt-dlp 的轻量级 Windows 视频下载 GUI。项目采用 Vue 3 + TypeScript + Vite 构建界面，由 Neutralinojs 提供本地桌面窗口能力。

当前版本完成了桌面框架与基础页面，下载和音视频处理功能尚未接入。

## 技术栈

- Vue 3 + TypeScript
- Vite
- Naive UI
- Neutralinojs

## 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- Windows 10/11
- WebView2 Runtime（Windows 11 已内置）

## 首次安装

```bash
npm install
npm run neu:update
```

`npm run neu:update` 会使用官方 Neutralinojs CLI 下载桌面运行时到 `bin/`。该目录是本地运行时文件，不提交到 Git。

## 开发

启动 Neutralinojs 桌面窗口，并自动运行 Vite 开发服务器：

```bash
npm run neu:dev
```

仅启动浏览器端 Vite 预览：

```bash
npm run dev
```

Neutralinojs 开发模式会加载 `http://localhost:5173`，Vue 页面修改后由 Vite HMR 直接更新。

## 构建

```bash
# 类型检查并构建前端，输出到 dist/
npm run build

# 构建前端并通过 Neutralinojs CLI 打包桌面发行目录
npm run neu:build
```

桌面发行目录位于 `release/biliflow/`。Windows 下直接运行：

```bash
./release/biliflow/biliflow-win_x64.exe
```

`release/biliflow/` 是便携式目录，不需要安装程序。Windows 可执行文件、`resources.neu` 和 Neutralinojs 运行时均已包含在目录内；终端用户无需单独安装 Node.js 或 Neutralinojs。仅需要系统具备 WebView2 Runtime（Windows 11 默认包含）。

## 脚本说明

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器（浏览器预览） |
| `npm run neu:dev` | 启动 Neutralinojs 桌面开发模式，自动启动 Vite |
| `npm run build` | 类型检查并构建前端到 `dist/` |
| `npm run neu:build` | 构建并打包桌面发行文件到 `release/biliflow/` |
| `npm run neu:update` | 下载或更新 Neutralinojs 运行时 |
| `npm run preview` | 预览前端构建结果 |

## 目录结构

```text
BiliFlow/
├─ bin/                       # Neutralinojs 运行时（忽略提交）
├─ public/
├─ release/                   # 桌面发行目录（忽略提交）
├─ src/
│  ├─ components/             # Vue 组件
│  ├─ views/                  # 页面视图
│  ├─ utils/                  # 工具函数
│  ├─ types/                  # TypeScript 类型声明
│  ├─ App.vue
│  ├─ main.ts
│  └─ style.css
├─ dist/                      # 前端构建产物（忽略提交）
├─ index.html
├─ neutralino.config.json
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```
