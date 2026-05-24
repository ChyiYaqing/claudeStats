# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000).
- `npm run build` — production build **and** the only type-check / verification step. There is no `lint` or `test` script, so run `build` before considering a change done.
- `npm start` — serve a production build (requires `npm run build` first).

`AGENTS.md` holds the contributor conventions (style, naming, commit/PR format); follow it. This file documents the architecture.

## What this is

A single-page **e-ink desktop dashboard** ("Claude Console") that renders two rotating portrait screens:
1. **Console** (`components/ConsoleScreen.tsx`) — Claude Code usage: model, active session, context window, today's cost/tokens/tool-calls, tokens-per-hour, latest action.
2. **Bridge** (`components/BridgeScreen.tsx`) — local system telemetry: CPU/GPU/RAM gauges, network sampler, disk, battery.

`app/page.tsx` is a client component that polls both API routes, handles paging (click zones, arrow keys, `?screen=bridge|console`), and auto-rotates between the two screens.

## Data flow

```
client (app/page.tsx, polls)
  ├─ GET /api/claude  → lib/claude-stats.getClaudeStats()   reads ~/.claude transcripts
  └─ GET /api/system  → lib/system-stats.getSystemStats()   reads OS via systeminformation
```

The two `lib/types.ts` interfaces (`ClaudeStats`, `SystemStats`) are the contract between server and client — change a shape there and update both the producing `lib/` function and the consuming component.

## Architecture notes (the non-obvious parts)

- **Server/client split is load-bearing.** `lib/claude-stats.ts` and `lib/system-stats.ts` import Node APIs (`fs`, `systeminformation`) and must only run in the `app/api/*` routes. `lib/format.ts` is deliberately Node-free so client components can import it. Don't pull Node imports into client code or vice-versa.
- **API routes are pinned to Node + dynamic.** Both routes set `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"` because they touch the filesystem/OS at request time. Keep these when adding routes that read local data.
- **Claude stats come from parsing local transcripts.** `getClaudeStats()` scans `~/.claude/projects/**/*.jsonl`, but only files modified within `RECENT_MS` (2 days), then parses each line as a JSON event (`assistant` / `user` / `last-prompt`). Aggregates (session, today, tokens-per-hour, tok/s) are derived here. Results are memoized for `CACHE_TTL_MS` (10s).
- **Cost is ESTIMATED, not logged.** Transcripts don't store per-message cost, so `lib/pricing.ts` multiplies token counts by an editable per-MTok rate table (`RATES`). If numbers look off, that table is the knob — not a bug in the aggregation.
- **The network chart is a background sampler.** `system-stats.ts` starts a 1s `setInterval` that pushes points into a ring buffer stashed on `globalThis` (`__netSeries`), so it survives dev hot-reloads instead of spawning a new interval each reload. A single `GET /api/system` returns the rolling 60-point series, not an instantaneous reading.

## Styling

All visual design lives in `app/globals.css` — a monochrome "paper" e-ink system (cream ground, near-black ink, serif type, hairline rules, no shadows/gradients). The `.frame` is a **CSS container** locked to 3:4 portrait, and nearly every size uses container-query units (`cqh`/`cqw`), so the whole UI scales with the frame. Components carry almost no styling of their own; prefer adding classes in `globals.css` over inline styles.

`misc/images/` holds the two design mockups that are the canonical visual target — `code-companion.png` for the Console screen and `system-telemetry.png` for the Bridge screen. These are the "reference screenshots" the CSS header comment refers to; compare against them when adjusting the UI.
