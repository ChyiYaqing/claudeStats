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

## 局域网 / 多设备访问

这是一个**中心化看板**:任何设备打开它,看到的都是**运行服务那台主机**的数据 —— Console 屏显示那台主机的 Claude Code 用量,Bridge 屏显示那台主机的系统状态(不是正在看的这台设备的)。

让局域网内其他设备能访问:

1. **用生产模式运行**(常驻展示推荐):
   ```bash
   npm run build
   npm run start:lan   # = next start -H 0.0.0.0
   ```
2. **在其他设备上**用主机的局域网地址访问,例如 `http://192.168.50.73:3000` —— 不要用 `localhost`。

小贴士:

- 为避免 DHCP 换 IP,给主机设一个保留 IP,或用 mDNS 主机名访问:`http://<主机名>.local:3000`。
- **跨设备用 `npm run dev`?** Next.js 会对非 `localhost` 来源拦截它的开发专用资源(HMR、浮层字体),返回 `403`。把每个访问方的 IP 加进 `next.config.ts` 的 `allowedDevOrigins` 再重启即可;生产模式(`start`)没有这个限制。

### 电子墨水设备(Kindle 等)

老的电子墨水浏览器(如 Kindle「体验版浏览器」)跑不动主仪表盘依赖的 React 客户端和容器查询 CSS,所以 `/` 在上面会空白/错乱。请改用 **`/e`** —— 一个服务端渲染、**无 JavaScript** 的页面:数据直接写进 HTML,每 60 秒自动刷新,并在 Console 和 Bridge 两屏之间轮播。例如:`http://192.168.50.73:3000/e`。

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
