import type { SystemStats } from "@/lib/types";
import { formatRate } from "@/lib/format";
import RingGauge from "./RingGauge";
import NetworkChart from "./NetworkChart";

const rightAlign = { alignItems: "flex-end", textAlign: "right" } as const;

export default function BridgeScreen({ stats }: { stats: SystemStats | null }) {
  const s = stats;
  const down = formatRate(s?.network.downKBs ?? 0);
  const up = formatRate(s?.network.upKBs ?? 0);

  return (
    <section className="screen">
      <header className="head">
        <div className="status">
          <span className="dot" />
          REAL STATUS
        </div>
        <h1 className="title">Bridge</h1>
        <div className="subtitle">System Telemetry</div>
      </header>

      <hr className="rule" />

      <div className="gauges">
        <RingGauge
          label="CPU"
          percent={s ? s.cpu.percent : null}
          sub={s ? `${s.cpu.busyCores} / ${s.cpu.cores} cores` : "—"}
        />
        <RingGauge
          label="GPU"
          percent={s ? s.gpu.percent : null}
          sub={s ? s.gpu.model ?? "no data" : "—"}
        />
        <RingGauge
          label="RAM"
          percent={s ? s.ram.percent : null}
          sub={s ? `${s.ram.usedGB.toFixed(1)} / ${Math.round(s.ram.totalGB)} GB` : "—"}
        />
      </div>

      <div className="section-label">Network</div>
      <div className="netnums">
        <div className="stat">
          <span className="label">↓ Download</span>
          <div>
            <span className="big-kb">{down.value}</span>
            <span className="unit">{down.unit}</span>
          </div>
        </div>
        <div className="stat" style={rightAlign}>
          <span className="label">↑ Upload</span>
          <div>
            <span className="big-kb">{up.value}</span>
            <span className="unit">{up.unit}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.2cqh" }}>
        <NetworkChart series={s?.network.series ?? []} max={s?.network.maxKBs ?? 1} />
        <div className="axis" style={{ justifyContent: "space-between" }}>
          <span>— down · ·· up</span>
          <span>sampler · 60 pts · 1s tick</span>
        </div>
      </div>

      <div className="row" style={{ marginTop: "auto", paddingBottom: "1cqh" }}>
        <div className="stat">
          <span className="label">Disk Free</span>
          <span className="value">
            {s?.disk.freeGB ?? "—"} <span style={{ fontSize: "2.2cqh", color: "var(--ink-soft)" }}>GB</span>
          </span>
        </div>
        <div className="stat" style={rightAlign}>
          <span className="label">Battery</span>
          <span className="value">
            {s
              ? s.battery.hasBattery
                ? `${s.battery.percent}%${s.battery.charging ? " ⚡" : ""}`
                : "AC ⚡"
              : "—"}
          </span>
        </div>
      </div>

      <div className="foot">
        <span>{s ? `Updated ${s.updatedAt}` : "—"}</span>
        <span>3 / 3 · BRIDGE</span>
      </div>
    </section>
  );
}
