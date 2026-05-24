import fs from "fs";
import path from "path";
import os from "os";
import { costForUsage, type Usage } from "./pricing";
import { formatClock, formatDate, formatDuration } from "./format";
import type { ClaudeStats } from "./types";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");

// Only read transcripts touched recently — enough to cover "today" plus the
// active session, while skipping months of old logs.
const RECENT_MS = 2 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 10_000;
const FILE_TOOLS = new Set(["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"]);

interface AssistantRec {
  ts: number;
  sessionId: string;
  model: string;
  usage: Usage;
  toolUses: { name: string; filePath?: string }[];
  isError: boolean;
}
interface UserRec {
  ts: number;
  sessionId: string;
  prompt: string | null; // string content only (real prompt, not tool_result)
}

let cache: { data: ClaudeStats; ts: number } | null = null;

export function getClaudeStats(): ClaudeStats {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
  const data = compute();
  cache = { data, ts: Date.now() };
  return data;
}

function listRecentTranscripts(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  const out: string[] = [];
  const cutoff = Date.now() - RECENT_MS;
  for (const proj of fs.readdirSync(PROJECTS_DIR)) {
    const dir = path.join(PROJECTS_DIR, proj);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(dir);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".jsonl")) continue;
      const fp = path.join(dir, f);
      try {
        if (fs.statSync(fp).mtimeMs >= cutoff) out.push(fp);
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

function formatModel(id: string): string {
  const m = id.match(/(opus|sonnet|haiku)-(\d+)-(\d+)/);
  if (!m) return id;
  const fam = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return `${fam} ${m[2]}.${m[3]}`;
}

function compute(): ClaudeStats {
  const now = new Date();
  const todayStr = formatDate(now);
  const assistants: AssistantRec[] = [];
  const users: UserRec[] = [];
  let latestPrompt: { ts: number; text: string } | null = null;

  for (const fp of listRecentTranscripts()) {
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
      const type = o.type;
      if (type === "last-prompt" && typeof o.lastPrompt === "string") {
        const t = Number.isNaN(ts) ? Date.now() : ts;
        if (!latestPrompt || t >= latestPrompt.ts) latestPrompt = { ts: t, text: o.lastPrompt };
        continue;
      }
      if (Number.isNaN(ts)) continue;
      const msg = o.message;
      if (type === "assistant" && msg && typeof msg === "object") {
        const toolUses: AssistantRec["toolUses"] = [];
        for (const b of msg.content ?? []) {
          if (b && b.type === "tool_use") {
            const input = b.input ?? {};
            toolUses.push({ name: b.name, filePath: input.file_path ?? input.notebook_path });
          }
        }
        assistants.push({
          ts,
          sessionId: o.sessionId ?? "",
          model: msg.model ?? "",
          usage: msg.usage ?? {},
          toolUses,
          isError: o.isApiErrorMessage === true,
        });
      } else if (type === "user" && msg && typeof msg === "object") {
        const c = msg.content;
        const prompt = typeof c === "string" ? c : null;
        users.push({ ts, sessionId: o.sessionId ?? "", prompt });
        if (prompt && (!latestPrompt || ts >= latestPrompt.ts)) latestPrompt = { ts, text: prompt };
      }
    }
  }

  // --- context window + model (from the latest assistant message) ---
  assistants.sort((a, b) => a.ts - b.ts);
  const last = assistants[assistants.length - 1];
  const ctxOf = (u: Usage) =>
    (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  const maxCtx = assistants.reduce((mx, a) => Math.max(mx, ctxOf(a.usage)), 0);
  const limit = maxCtx > 200_000 ? 1_000_000 : 200_000;
  const modelBase = last ? formatModel(last.model) : "—";
  const model = last ? `${modelBase}${limit === 1_000_000 ? " [1m]" : ""}` : "—";
  const ctxTokens = last ? ctxOf(last.usage) : 0;

  // --- active session ---
  const activeSession = last?.sessionId ?? "";
  const sessAssist = assistants.filter((a) => a.sessionId === activeSession);
  const sessUsers = users.filter((u) => u.sessionId === activeSession);
  const sessTs = [...sessAssist.map((a) => a.ts), ...sessUsers.map((u) => u.ts)];
  const duration = sessTs.length
    ? formatDuration(Math.max(...sessTs) - Math.min(...sessTs))
    : "0s";

  // --- today aggregates ---
  const today = assistants.filter((a) => formatDate(new Date(a.ts)) === todayStr);
  const tokensOut = today.reduce((s, a) => s + (a.usage.output_tokens ?? 0), 0);
  const toolCalls = today.reduce((s, a) => s + a.toolUses.length, 0);
  const costUSD = today.reduce((s, a) => s + costForUsage(a.model, a.usage), 0);
  const apiErrors = today.filter((a) => a.isError).length;

  const filesTouched = new Set<string>();
  for (const a of today)
    for (const t of a.toolUses)
      if (FILE_TOOLS.has(t.name) && t.filePath) filesTouched.add(t.filePath);

  // --- tokens per hour (today, hour-of-day buckets) ---
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, tokens: 0 }));
  for (const a of today) buckets[new Date(a.ts).getHours()].tokens += a.usage.output_tokens ?? 0;

  // --- best-effort tok/s: output tokens / wall-clock active time today.
  // The logs carry no per-request latency, so we approximate "active" time as
  // the sum of gaps under 5 min across the merged event timeline (excludes
  // long idle stretches). It's effective throughput, not raw decode speed. ---
  const timeline = [...assistants.map((a) => a.ts), ...users.map((u) => u.ts)].sort((a, b) => a - b);
  let activeMs = 0;
  for (let i = 1; i < timeline.length; i++) {
    if (formatDate(new Date(timeline[i])) !== todayStr) continue;
    const gap = timeline[i] - timeline[i - 1];
    if (gap > 0 && gap < 300_000) activeMs += gap;
  }
  const tokPerSec = activeMs > 0 ? (tokensOut * 1000) / activeMs : 0;

  // --- latest action ---
  let latestTool = "—";
  for (let i = assistants.length - 1; i >= 0 && latestTool === "—"; i--) {
    const tu = assistants[i].toolUses;
    if (tu.length) latestTool = tu[tu.length - 1].name;
  }
  const lastActivityTs = Math.max(
    last?.ts ?? 0,
    users.length ? users[users.length - 1].ts : 0,
    latestPrompt?.ts ?? 0,
  );
  const idleSeconds = lastActivityTs ? Math.max(0, (Date.now() - lastActivityTs) / 1000) : 0;

  return {
    model,
    session: { duration, messages: sessUsers.filter((u) => u.prompt).length, replies: sessAssist.length },
    context: {
      percent: limit ? Math.min(100, (ctxTokens / limit) * 100) : 0,
      tokens: ctxTokens,
      limit,
    },
    today: { costUSD, tokensOut, toolCalls },
    tokensPerHour: buckets,
    speed: { tokPerSec, filesTouched: filesTouched.size, apiErrors },
    latestAction: {
      tool: latestTool,
      prompt: latestPrompt?.text ?? "—",
      idleSeconds,
    },
    updatedAt: formatClock(now),
    date: todayStr,
  };
}
