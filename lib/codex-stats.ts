import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { formatClock, formatDate, formatDuration, formatReset } from "./format";
import type { CodexStats } from "./types";

const CODEX_DIR = path.join(os.homedir(), ".codex");
const STATE_DB = path.join(CODEX_DIR, "state_5.sqlite");
const GOALS_DB = path.join(CODEX_DIR, "goals_1.sqlite");
const SESSIONS_DIR = path.join(CODEX_DIR, "sessions");
const RECENT_MS = 2 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 10_000;

interface ThreadRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  tokens: number;
  title: string;
}

interface RolloutRec {
  ts: number;
  tool?: string;
  tokens?: number;
  contextTokens?: number;
  contextLimit?: number;
  limitPercent?: number;
  limitReset?: string;
  isError?: boolean;
}

let cache: { data: CodexStats; ts: number } | null = null;

export function getCodexStats(): CodexStats {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
  const data = compute();
  cache = { data, ts: Date.now() };
  return data;
}

function query(db: string, sql: string): string[][] {
  if (!fs.existsSync(db)) return [];
  try {
    const out = execFileSync("sqlite3", ["-batch", "-noheader", "-separator", "\t", db, sql], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("\t"));
  } catch {
    return [];
  }
}

function readThreads(): ThreadRow[] {
  return query(
    STATE_DB,
    "select id, coalesce(created_at_ms, created_at * 1000), coalesce(updated_at_ms, updated_at * 1000), coalesce(model, ''), tokens_used, coalesce(title, '') from threads",
  ).map(([id, createdAt, updatedAt, model, tokens, title]) => ({
    id,
    createdAt: Number(createdAt) || 0,
    updatedAt: Number(updatedAt) || 0,
    model: model || "—",
    tokens: Number(tokens) || 0,
    title: title || "—",
  }));
}

function readGoals(): CodexStats["workspace"] {
  const rows = query(GOALS_DB, "select status, count(*) from thread_goals group by status");
  let activeGoals = 0;
  let completedGoals = 0;
  for (const [status, count] of rows) {
    const n = Number(count) || 0;
    if (status === "active") activeGoals += n;
    if (status === "complete") completedGoals += n;
  }
  return { activeGoals, completedGoals, errors: 0 };
}

function listRecentRollouts(): string[] {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  const out: string[] = [];
  const cutoff = Date.now() - RECENT_MS;
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const fp = path.join(dir, name);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fp);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(fp);
      else if (name.endsWith(".jsonl") && stat.mtimeMs >= cutoff) out.push(fp);
    }
  };
  walk(SESSIONS_DIR);
  return out;
}

function readRollouts(): RolloutRec[] {
  const out: RolloutRec[] = [];
  for (const fp of listRecentRollouts()) {
    let text: string;
    try {
      text = fs.readFileSync(fp, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let o: any;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      const ts = o.timestamp ? Date.parse(o.timestamp) : NaN;
      if (Number.isNaN(ts)) continue;
      const payload = o.payload ?? {};
      if (o.type === "response_item" && payload.type === "function_call") {
        out.push({ ts, tool: payload.name ?? "tool" });
      } else if (o.type === "event_msg" && payload.type === "token_count") {
        const usage = payload.info?.total_token_usage ?? {};
        const last = payload.info?.last_token_usage ?? {};
        const limit = Number(payload.info?.model_context_window) || 0;
        const contextTokens = Number(usage.total_tokens) || 0;
        const primary = payload.rate_limits?.primary;
        out.push({
          ts,
          tokens: Number(last.total_tokens) || 0,
          contextTokens,
          contextLimit: limit,
          limitPercent: typeof primary?.used_percent === "number" ? primary.used_percent : undefined,
          limitReset: typeof primary?.resets_at === "number" ? formatReset(primary.resets_at * 1000 - Date.now()) : "",
        });
      } else if (o.type === "event_msg" && payload.type === "error") {
        out.push({ ts, isError: true });
      }
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}

function formatModel(id: string): string {
  const m = id.match(/^gpt-(\d+)(?:\.(\d+))?/i);
  if (!m) return id || "—";
  return `GPT-${m[1]}${m[2] ? `.${m[2]}` : ""}`;
}

function compute(): CodexStats {
  const now = new Date();
  const todayStr = formatDate(now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const threads = readThreads().sort((a, b) => a.updatedAt - b.updatedAt);
  const rollouts = readRollouts();
  const latestThread = threads[threads.length - 1];
  const latestUsage = [...rollouts].reverse().find((r) => r.contextTokens !== undefined);
  const latestLimit = [...rollouts].reverse().find((r) => r.limitPercent !== undefined);
  const latestTool = [...rollouts].reverse().find((r) => r.tool);
  const todayThreads = threads.filter((t) => t.updatedAt >= todayStart);
  const todayRollouts = rollouts.filter((r) => r.ts >= todayStart);
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, tokens: 0 }));

  for (const r of todayRollouts) {
    if (r.tokens) buckets[new Date(r.ts).getHours()].tokens += r.tokens;
  }
  if (buckets.every((b) => b.tokens === 0)) {
    for (const t of todayThreads) buckets[new Date(t.updatedAt).getHours()].tokens += t.tokens;
  }

  const activeSession = latestThread
    ? threads.filter((t) => t.updatedAt >= latestThread.updatedAt - 24 * 60 * 60 * 1000)
    : [];
  const sessionStart = activeSession.length ? Math.min(...activeSession.map((t) => t.createdAt)) : 0;
  const sessionEnd = activeSession.length ? Math.max(...activeSession.map((t) => t.updatedAt)) : 0;
  const lastActivityTs = Math.max(latestThread?.updatedAt ?? 0, rollouts[rollouts.length - 1]?.ts ?? 0);
  const contextTokens = latestUsage?.contextTokens ?? latestThread?.tokens ?? 0;
  const contextLimit = latestUsage?.contextLimit || 258_400;
  const workspace = readGoals();

  return {
    model: formatModel(latestThread?.model ?? ""),
    session: {
      duration: sessionStart ? formatDuration(sessionEnd - sessionStart) : "0s",
      threads: activeSession.length,
      totalThreads: threads.length,
    },
    context: {
      percent: contextLimit ? Math.min(100, (contextTokens / contextLimit) * 100) : 0,
      tokens: contextTokens,
      limit: contextLimit,
    },
    today: {
      tokens: todayThreads.reduce((sum, t) => sum + t.tokens, 0),
      toolCalls: todayRollouts.filter((r) => r.tool).length,
      threads: todayThreads.length,
    },
    tokensPerHour: buckets,
    workspace: {
      ...workspace,
      errors: todayRollouts.filter((r) => r.isError).length,
    },
    latestAction: {
      tool: latestTool?.tool ?? "—",
      prompt: latestThread?.title ?? "—",
      idleSeconds: lastActivityTs ? Math.max(0, (Date.now() - lastActivityTs) / 1000) : 0,
    },
    limits: {
      weekly:
        latestLimit?.limitPercent === undefined
          ? null
          : { percent: Math.round(latestLimit.limitPercent), reset: latestLimit.limitReset ?? "" },
    },
    updatedAt: formatClock(now),
    date: todayStr,
  };
}
