import type { CodexStats } from "@/lib/types";
import { formatIdle, formatTokens } from "@/lib/format";
import TokensPerHourChart from "./TokensPerHourChart";

const rightAlign = { alignItems: "flex-end", textAlign: "right" } as const;

export default function CodexScreen({ stats }: { stats: CodexStats | null }) {
  const s = stats;
  const live = s ? s.latestAction.idleSeconds < 120 : false;

  return (
    <section className="screen">
      <header className="head">
        <div className="status">
          <span className="dot" style={{ background: live ? "var(--ink)" : "var(--ink-faint)" }} />
          {live ? "LIVE" : "IDLE"}
        </div>
        <h1 className="title">Codex Console</h1>
        <div className="subtitle">Agent Workspace</div>
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
            {s ? `${s.session.threads} recent / ${s.session.totalThreads} total` : ""}
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
          <LimitMeter label="7d Limit" data={s?.limits.weekly ?? null} />
          <LimitMeter
            label="Goals"
            data={
              s
                ? {
                    percent: Math.min(100, s.workspace.completedGoals * 10),
                    reset: `${s.workspace.activeGoals} active`,
                  }
                : null
            }
          />
        </div>
      </div>

      <div className="workshop">
        <div className="section-label">Today’s Codex</div>
        <div className="bigrow">
          <div className="big">
            <span className="icon">▣</span>
            <span className="num">{s ? formatTokens(s.today.tokens) : "—"}</span>
            <span className="caption">tokens used</span>
          </div>
          <div className="big">
            <span className="icon">⚙</span>
            <span className="num">{s ? s.today.toolCalls : "—"}</span>
            <span className="caption">tool calls</span>
          </div>
          <div className="big">
            <span className="icon">◈</span>
            <span className="num">{s ? s.today.threads : "—"}</span>
            <span className="caption">threads</span>
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
          <span className="value">◆ {s?.workspace.activeGoals ?? 0} active</span>
          <span className="caption">{s?.workspace.completedGoals ?? 0} goals completed</span>
        </div>
        <div className="stat" style={rightAlign}>
          <span className="value">⚠ {s?.workspace.errors ?? 0}</span>
          <span className="caption">event errors today</span>
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
        <span>2 / 3 · CODEX</span>
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
