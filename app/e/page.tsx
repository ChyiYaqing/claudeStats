// E-ink / Kindle mode: a no-JavaScript, server-rendered view for old browsers
// (the Kindle "Experimental Browser" can't run the React client or CSS
// container queries the main dashboard relies on). Data is rendered straight
// into the HTML; the page auto-reloads via <meta refresh>, and each screen
// points the next refresh at the other, so Console/Bridge alternate with no
// client state. CSS is kept to widely-supported features (no cq* units, no
// aspect-ratio, no flex gap) and sized in vh/vw so it fills any screen.

import { getClaudeStats } from "@/lib/claude-stats";
import { getSystemStats } from "@/lib/system-stats";
import { formatTokens, formatUSD, formatIdle, formatRate } from "@/lib/format";
import type { ClaudeStats, SystemStats } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REFRESH = 60; // seconds between full-page reloads (one e-ink flash each)

export default async function EinkPage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>;
}) {
  const { screen } = await searchParams;
  const isBridge = screen === "bridge" || screen === "2";
  const next = isBridge ? "/e?screen=console" : "/e?screen=bridge";

  return (
    <>
      <meta httpEquiv="refresh" content={`${REFRESH}; url=${next}`} />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="eink">
        {isBridge ? <Bridge stats={await getSystemStats()} /> : <Console stats={getClaudeStats()} />}
      </div>
    </>
  );
}

function Console({ stats: s }: { stats: ClaudeStats }) {
  const max = Math.max(1, ...s.tokensPerHour.map((b) => b.tokens));
  return (
    <div className="page">
      <div className="hd">
        <div className="title">Claude Console</div>
        <div className="sub">Code Companion</div>
      </div>
      <hr className="rule" />

      <div className="row2">
        <div className="cell">
          <div className="lbl">⌗ Model</div>
          <div className="val">{s.model}</div>
        </div>
        <div className="cell r">
          <div className="lbl">Session</div>
          <div className="val">{s.session.duration}</div>
          <div className="cap">
            {s.session.messages} msg / {s.session.replies} reply
          </div>
        </div>
      </div>

      <div className="blk">
        <div className="lbl">Context Window</div>
        <div className="pill">
          <div className="fill" style={{ width: `${s.context.percent}%` }} />
        </div>
        <div className="cap">
          {s.context.percent.toFixed(1)}% · {formatTokens(s.context.tokens)} /{" "}
          {formatTokens(s.context.limit)}
        </div>
      </div>

      <div className="row2">
        <div className="cell">
          <div className="lbl">5h Limit</div>
          <div className="val">
            {s.limits.fiveHour ? `${s.limits.fiveHour.percent}%` : "—"}
            {s.limits.fiveHour?.reset ? <span className="unit"> · {s.limits.fiveHour.reset}</span> : null}
          </div>
        </div>
        <div className="cell r">
          <div className="lbl">7d Limit</div>
          <div className="val">
            {s.limits.sevenDay ? `${s.limits.sevenDay.percent}%` : "—"}
            {s.limits.sevenDay?.reset ? <span className="unit"> · {s.limits.sevenDay.reset}</span> : null}
          </div>
        </div>
      </div>

      <div className="seclbl">Today’s Workshop</div>
      <div className="row3">
        <div className="big">
          <div className="num">{formatUSD(s.today.costUSD)}</div>
          <div className="cap">spent today</div>
        </div>
        <div className="big">
          <div className="num">{formatTokens(s.today.tokensOut)}</div>
          <div className="cap">tokens out</div>
        </div>
        <div className="big">
          <div className="num">{s.today.toolCalls}</div>
          <div className="cap">tool calls</div>
        </div>
      </div>

      <div className="blk">
        <div className="lbl">Tokens / Hour · 24h</div>
        <Bars values={s.tokensPerHour.map((b) => b.tokens)} max={max} />
      </div>

      <div className="row2">
        <div className="cell">
          <div className="val">⚡ {s.speed.tokPerSec.toFixed(1)} tok/s</div>
          <div className="cap">avg speed · {s.speed.filesTouched} files touched</div>
        </div>
        <div className="cell r">
          <div className="val">⚠ {s.speed.apiErrors}</div>
          <div className="cap">api errors</div>
        </div>
      </div>

      <hr className="rule" />
      <div className="blk">
        <div className="row2">
          <span className="cell lbl">Latest Action</span>
          <span className="cell cap r">idle for {formatIdle(s.latestAction.idleSeconds)}</span>
        </div>
        <div className="val">→ {s.latestAction.tool}</div>
        <div className="cap prompt">{s.latestAction.prompt}</div>
      </div>

      <div className="ft">
        <span>
          Updated {s.updatedAt} · {s.date}
        </span>
        <span className="r2">1 / 2 · CONSOLE</span>
      </div>
    </div>
  );
}

function Bridge({ stats: s }: { stats: SystemStats }) {
  const netMax = s.network.maxKBs || 1;
  const down = formatRate(s.network.downKBs);
  const up = formatRate(s.network.upKBs);
  return (
    <div className="page">
      <div className="hd">
        <div className="title">Bridge</div>
        <div className="sub">System Telemetry</div>
      </div>
      <hr className="rule" />

      <div className="row3">
        <Gauge label="CPU" pct={s.cpu.percent} sub={`${s.cpu.busyCores} / ${s.cpu.cores} cores`} />
        <Gauge label="GPU" pct={s.gpu.percent} sub={s.gpu.model ?? "no data"} />
        <Gauge
          label="RAM"
          pct={s.ram.percent}
          sub={`${s.ram.usedGB.toFixed(1)} / ${Math.round(s.ram.totalGB)} GB`}
        />
      </div>

      <div className="seclbl">Network</div>
      <div className="row2">
        <div className="cell">
          <div className="lbl">↓ Download</div>
          <div className="val">
            {down.value} <span className="unit">{down.unit}</span>
          </div>
        </div>
        <div className="cell r">
          <div className="lbl">↑ Upload</div>
          <div className="val">
            {up.value} <span className="unit">{up.unit}</span>
          </div>
        </div>
      </div>

      <div className="blk">
        <NetChart series={s.network.series} max={netMax} />
        <div className="row2 axis">
          <span className="cell cap">— down · ·· up</span>
          <span className="cell cap r">sampler · 60 pts · 1s tick</span>
        </div>
      </div>

      <div className="row2">
        <div className="cell">
          <div className="lbl">Disk Free</div>
          <div className="val">
            {s.disk.freeGB} <span className="unit">GB</span>
          </div>
        </div>
        <div className="cell r">
          <div className="lbl">Battery</div>
          <div className="val">
            {s.battery.hasBattery
              ? `${s.battery.percent}%${s.battery.charging ? " ⚡" : ""}`
              : "AC ⚡"}
          </div>
        </div>
      </div>

      <div className="ft">
        <span>Updated {s.updatedAt}</span>
        <span className="r2">2 / 2 · BRIDGE</span>
      </div>
    </div>
  );
}

function Gauge({ label, pct, sub }: { label: string; pct: number | null; sub: string }) {
  return (
    <div className="big">
      <div className="lbl">{label}</div>
      <div className="gval">{pct === null ? "—" : `${pct}%`}</div>
      <div className="gbar">
        <div className="gfill" style={{ width: `${pct ?? 0}%` }} />
      </div>
      <div className="cap">{sub}</div>
    </div>
  );
}

// Vertical bars (tokens/hour). Fixed-layout table so columns distribute evenly
// for any count; heights in vh so they always stay inside the chart box.
function Bars({ values, max }: { values: number[]; max: number }) {
  return (
    <div className="chart">
      {values.map((v, i) => (
        <div key={i} className="col">
          <div className="bar" style={{ height: `${(Math.max(0, v) / max) * 11}vh` }} />
        </div>
      ))}
    </div>
  );
}

// Network history as an SVG line chart — download filled area + solid line,
// upload as a dashed line. SVG (unlike CSS container queries) renders on the
// old Kindle browser; colors are literal hex since var() may be unsupported.
function NetChart({ series, max }: { series: { down: number; up: number }[]; max: number }) {
  const W = 100;
  const H = 30;
  const pts = series.length ? series : [{ down: 0, up: 0 }, { down: 0, up: 0 }];
  const n = Math.max(pts.length, 2);
  const scale = Math.max(1, max);
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - (Math.min(v, scale) / scale) * (H - 1);
  const downLine = pts.map((p, i) => `${x(i).toFixed(2)},${y(p.down).toFixed(2)}`).join(" ");
  const downArea = `M0,${H} L ${pts
    .map((p, i) => `${x(i).toFixed(2)},${y(p.down).toFixed(2)}`)
    .join(" L ")} L ${W},${H} Z`;
  const upLine = pts.map((p, i) => `${x(i).toFixed(2)},${y(p.up).toFixed(2)}`).join(" ");
  return (
    <svg className="netchart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <line x1="0" y1={H - 0.4} x2={W} y2={H - 0.4} stroke="#cfc9ba" strokeWidth="0.4" />
      <path d={downArea} fill="#cfc9ba" opacity="0.6" />
      <polyline points={downLine} fill="none" stroke="#15140f" strokeWidth="0.6" />
      <polyline points={upLine} fill="none" stroke="#5c574b" strokeWidth="0.6" strokeDasharray="1.4 1.2" />
    </svg>
  );
}

const CSS = `
.eink{position:fixed;top:0;left:0;right:0;bottom:0;background:#f3f0e7;color:#15140f;
  font-family:Georgia,"Iowan Old Style","Times New Roman","Songti SC",serif;overflow:hidden;}
.eink .page{padding:3vh 5vw 9vh;height:100%;box-sizing:border-box;}
.eink .hd{text-align:center;}
.eink .title{font-size:6vh;font-weight:400;}
.eink .sub{font-size:2.1vh;letter-spacing:0.3em;text-transform:uppercase;color:#5c574b;margin-top:0.5vh;}
.eink .rule{border:0;border-top:1px solid #cfc9ba;margin:1.5vh 0;}
.eink .lbl{font-size:1.9vh;letter-spacing:0.18em;text-transform:uppercase;color:#5c574b;}
.eink .seclbl{text-align:center;font-size:2vh;letter-spacing:0.26em;text-transform:uppercase;color:#5c574b;margin:2.2vh 0 1.2vh;}
.eink .val{font-size:3.8vh;line-height:1.1;}
.eink .cap{font-size:1.7vh;color:#989284;margin-top:0.4vh;}
.eink .unit{font-size:2vh;color:#5c574b;}
.eink .blk{margin-top:1.4vh;}
.eink .row2{display:table;width:100%;table-layout:fixed;margin-top:1.4vh;}
.eink .row2 .cell{display:table-cell;vertical-align:top;}
.eink .cell.r{text-align:right;}
.eink .row3{display:table;width:100%;table-layout:fixed;margin-top:1vh;}
.eink .big{display:table-cell;text-align:center;width:33.33%;vertical-align:top;}
.eink .big .num{font-size:5.6vh;line-height:1;}
.eink .pill{position:relative;height:3vh;border:1px solid #9c9684;border-radius:999px;overflow:hidden;background:#f3f0e7;margin:1vh 0 0.6vh;}
.eink .pill .fill{position:absolute;top:0;bottom:0;left:0;background:#1f1d16;}
.eink .chart{display:table;table-layout:fixed;width:100%;height:13vh;margin-top:1vh;border-bottom:1px solid #cfc9ba;border-collapse:separate;border-spacing:2px 0;overflow:hidden;}
.eink .chart .col{display:table-cell;vertical-align:bottom;}
.eink .chart .bar{background:#15140f;}
.eink .netchart{display:block;width:100%;height:14vh;margin-top:1vh;}
.eink .axis{margin-top:0.4vh;}
.eink .gval{font-size:5vh;line-height:1.2;}
.eink .gbar{width:70%;height:1.2vh;margin:1vh auto 0;background:#cfc9ba;border-radius:999px;overflow:hidden;}
.eink .gbar .gfill{height:100%;background:#15140f;}
.eink .prompt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.eink .ft{position:absolute;left:0;right:0;bottom:2.5vh;padding:0 5vw;display:table;width:100%;box-sizing:border-box;
  font-size:1.6vh;letter-spacing:0.1em;text-transform:uppercase;color:#989284;}
.eink .ft span{display:table-cell;}
.eink .ft .r2{text-align:right;}
`;
