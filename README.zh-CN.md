# Claude Console

[English](./README.md) | 简体中文

一个电子墨水(e-ink)风格的桌面仪表盘,把你的 **Claude Code 使用情况** 和 **本机系统遥测** 并排展示。它在温暖的「纸张」底色上轮播两块竖屏画面 —— 适合放在工位旁的副屏或常驻展示屏上。

| Console — Code Companion | Bridge — System Telemetry |
| :---: | :---: |
| ![Console 屏](./misc/images/code-companion.png) | ![Bridge 屏](./misc/images/system-telemetry.png) |

## 功能

- **Console 屏** —— 模型、当前会话时长、上下文窗口占用、今日预估花费 / 输出 token / 工具调用次数、24 小时「每小时 token」柱状图、平均输出速度、触达文件数、API 错误数,以及最近一次操作。
- **Bridge 屏** —— CPU / GPU / RAM 环形仪表、实时 60 点网络采样(下行/上行)、剩余磁盘、电池。
- **免操作展示** —— 两块画面自动轮播。也可手动翻页:点击左/右半边,或按 `←` / `→`;还能用 URL 参数固定某一屏(见 [使用](#使用))。
- **全程本地** —— 使用数据来自你自己的 `~/.claude` 会话记录,系统指标在本机读取,不向任何地方上传。

## 环境要求

- Node.js 18+(Next.js 16)。
- 在你使用 Claude Code 的那台机器上运行,这样它才能读取 `~/.claude/projects/`。
- 支持 macOS / Linux / Windows。注意:macOS 上 GPU 利用率常常拿不到(此时仪表只显示型号、不显示百分比)。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:3000
```

生产环境:

```bash
npm run build    # 同时也是本项目的类型检查 / 验证步骤
npm start
```

> 项目没有单独的 `lint` 或 `test` 脚本 —— `npm run build` 就是验证步骤。

## 使用

- **自动轮播:** 最后一次交互约 18 秒后自动切到另一屏。
- **手动翻页:** 点击左半边 → Console,右半边 → Bridge;或用 `←` / `→`。
- **固定某一屏**(适合常驻展示): `http://localhost:3000/?screen=bridge` 或 `?screen=console`。

## 工作原理

```
客户端 (app/page.tsx, 轮询)
  ├─ GET /api/claude  → lib/claude-stats.ts   读取 ~/.claude/projects/**/*.jsonl
  └─ GET /api/system  → lib/system-stats.ts   通过 `systeminformation` 读取系统
```

- **Claude 统计** 通过扫描 `~/.claude/projects/` 下最近(约 2 天内)的 JSONL 会话记录得到,逐行解析为会话 / 今日 / 上下文等聚合数据,结果缓存约 10 秒。
- **系统统计** 来自 [`systeminformation`](https://www.npmjs.com/package/systeminformation) 包。后台每秒采样一次,维护一段滚动的 60 点网络曲线。

### 花费是估算值

会话记录里 **并不** 保存每条消息的花费,所以「今日花费」是按 token 数量乘以 [`lib/pricing.ts`](./lib/pricing.ts) 里的价格表 **估算** 出来的。按你自己的套餐修改其中的 `RATES` 表即可。

## 目录结构

```
app/
  page.tsx            # 客户端仪表盘:轮询、翻页、自动轮播
  layout.tsx          # 根外壳 + 元数据
  globals.css         # 电子墨水设计系统(CSS 容器 + cq* 单位)
  api/claude/route.ts # GET /api/claude
  api/system/route.ts # GET /api/system
components/           # ConsoleScreen、BridgeScreen、仪表、图表
lib/
  claude-stats.ts     # 解析 ~/.claude 会话记录(仅服务端)
  system-stats.ts     # 通过 systeminformation 读取系统(仅服务端)
  pricing.ts          # 可编辑的花费价格表
  format.ts           # 客户端安全的格式化工具
  types.ts            # ClaudeStats / SystemStats —— 服务端↔客户端的契约
misc/images/          # 两张设计参考效果图
```

## 技术栈

Next.js 16(App Router)· React 19 · TypeScript · `systeminformation`。
