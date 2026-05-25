import type { ClaudeStats } from "@/lib/types";
import { formatIdle, formatTokens, formatUSD } from "@/lib/format";
import TokensPerHourChart from "./TokensPerHourChart";

const rightAlign = { alignItems: "flex-end", textAlign: "right" } as const;

export default function ConsoleScreen({ stats }: { stats: ClaudeStats | null }) {
  const s = stats;
  const live = s ? s.latestAction.idleSeconds < 120 : false;

  return (
    <section className="screen">
      <header className="head">
        <div className="status">
          <span className="dot" style={{ background: live ? "var(--ink)" : "var(--ink-faint)" }} />
          {live ? "LIVE" : "IDLE"}
        </div>
        <h1 className="title">Claude Console</h1>
        <div className="subtitle">Code Companion</div>
      </header>

      <div className="row">
        <div className="stat">
          <span className="label">⌗ Model</span>
          <span className="value">{s?.model ?? "—"}</span>
        </div>
        <div className="stat" style={rightAlign}>
          <span className="label">Session ⏱</span>
          <span className="value">{s?.session.duration ?? "—"}</span>
          <span className="caption">
            {s ? `${s.session.messages} msg / ${s.session.replies} reply` : ""}
          </span>
        </div>
      </div>

      <div className="usage">
        <div className="context">
          <span className="label">Context Window</span>
          <div className="pill" style={{ marginTop: "0.8cqh" }}>
            <div className="fill" style={{ width: `${s?.context.percent ?? 0}%` }} />
            <div className="pilltext">
              {s ? `${s.context.percent.toFixed(1)}% · ${formatTokens(s.context.tokens)}` : "—"}
            </div>
          </div>
        </div>
        <div className="limits">
          <LimitMeter label="5h Limit" data={s?.limits.fiveHour ?? null} />
          <LimitMeter label="7d Limit" data={s?.limits.sevenDay ?? null} />
        </div>
      </div>

      <div className="workshop">
      <div className="section-label">Today’s Workshop</div>
      <div className="bigrow">
        <div className="big">
          <span className="icon">❖</span>
          <span className="num">{s ? formatUSD(s.today.costUSD) : "—"}</span>
          <span className="caption">spent today</span>
        </div>
        <div className="big">
          <span className="icon">⚡</span>
          <span className="num">{s ? formatTokens(s.today.tokensOut) : "—"}</span>
          <span className="caption">tokens out</span>
        </div>
        <div className="big">
          <span className="icon">⚒</span>
          <span className="num">{s ? s.today.toolCalls : "—"}</span>
          <span className="caption">tool calls</span>
        </div>
      </div>
      </div>

      <div className="chartblock">
        <span className="label">Tokens / Hour · 24h</span>
        <div style={{ marginTop: "0.8cqh" }}>
          <TokensPerHourChart data={s?.tokensPerHour ?? Array.from({ length: 24 }, (_, hour) => ({ hour, tokens: 0 }))} />
        </div>
      </div>

      <div className="row">
        <div className="stat">
          <span className="value">⚡ {s ? s.speed.tokPerSec.toFixed(1) : "—"} tok/s</span>
          <span className="caption">
            avg model speed today · {s?.speed.filesTouched ?? 0} files touched
          </span>
        </div>
        <div className="stat" style={rightAlign}>
          <span className="value">⚠ {s?.speed.apiErrors ?? 0}</span>
          <span className="caption">api errors</span>
        </div>
      </div>

      <div className="latest">
        <hr className="rule" style={{ margin: "0 0 1.2cqh" }} />
        <div className="row">
          <span className="label">Latest Action</span>
          <span className="caption">{s ? `idle for ${formatIdle(s.latestAction.idleSeconds)}` : ""}</span>
        </div>
        <div className="action">
          <span style={{ color: "var(--ink-soft)" }}>→</span> {s?.latestAction.tool ?? "—"}
        </div>
        <div className="prompt">{s?.latestAction.prompt ?? ""}</div>
      </div>

      <div className="foot">
        <span>{s ? `Updated ${s.updatedAt} · ${s.date}` : "—"}</span>
        <span>1 / 2 · CLAUDE</span>
      </div>
    </section>
  );
}

function LimitMeter({
  label,
  data,
}: {
  label: string;
  data: { percent: number; reset: string } | null;
}) {
  return (
    <div className="lim">
      <div className="row">
        <span className="label">{label}</span>
        <span className="caption">
          {data ? `${data.percent}%${data.reset ? ` · ${data.reset}` : ""}` : "—"}
        </span>
      </div>
      <div className="minibar">
        <div className="mfill" style={{ width: `${data?.percent ?? 0}%` }} />
      </div>
    </div>
  );
}
