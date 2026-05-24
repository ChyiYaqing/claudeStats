import si from "systeminformation";
import { formatClock } from "./format";
import type { SystemStats } from "./types";

const MAX_POINTS = 60; // matches the screenshot's "60 pts · 1s tick"
const GiB = 1024 ** 3;

// Survive Next.js dev hot-reloads: keep the sampler + buffer on globalThis so
// we don't spawn a new interval on every module re-evaluation.
const g = globalThis as unknown as {
  __netSeries?: { down: number; up: number }[];
  __netStarted?: boolean;
};
g.__netSeries ??= [];

function startSampler() {
  if (g.__netStarted) return;
  g.__netStarted = true;
  const tick = async () => {
    try {
      const nets = await si.networkStats();
      let rx = 0;
      let tx = 0;
      for (const n of nets) {
        rx += Math.max(0, n.rx_sec || 0);
        tx += Math.max(0, n.tx_sec || 0);
      }
      g.__netSeries!.push({ down: rx / 1024, up: tx / 1024 });
      if (g.__netSeries!.length > MAX_POINTS) g.__netSeries!.shift();
    } catch {
      /* transient probe failure — skip this tick */
    }
  };
  void tick();
  const id = setInterval(tick, 1000);
  // Don't keep the process alive solely for sampling.
  (id as unknown as { unref?: () => void }).unref?.();
}

export async function getSystemStats(): Promise<SystemStats> {
  startSampler();
  const [load, cpu, mem, gfx, fsSize, battery] = await Promise.all([
    si.currentLoad(),
    si.cpu(),
    si.mem(),
    si.graphics(),
    si.fsSize(),
    si.battery(),
  ]);

  const cores = cpu.cores || cpu.physicalCores || 1;
  const cpuPercent = Math.round(load.currentLoad || 0);

  const ramUsed = mem.active || mem.used || 0;
  const ramTotal = mem.total || 1;

  const gpuCtrl = gfx.controllers.find(
    (c) => typeof c.utilizationGpu === "number" && !Number.isNaN(c.utilizationGpu),
  );
  // Prefer the controller we read utilization from; otherwise fall back to the
  // first controller that reports a model name (utilization is often missing
  // for AMD/Intel GPUs on macOS, but the model is still detected).
  const namedCtrl = gpuCtrl ?? gfx.controllers.find((c) => c.model && c.model.trim());
  const gpuModel = namedCtrl?.model?.trim() || null;

  const series = g.__netSeries!.slice();
  const latest = series[series.length - 1] ?? { down: 0, up: 0 };
  const maxKBs = series.reduce((mx, p) => Math.max(mx, p.down, p.up), 0);

  const root = fsSize.find((f) => f.mount === "/") ?? fsSize[0];
  const freeGB = root ? root.available / GiB : 0;

  return {
    cpu: {
      percent: cpuPercent,
      busyCores: Math.round((cpuPercent / 100) * cores),
      cores,
    },
    gpu: {
      percent: gpuCtrl ? Math.round(gpuCtrl.utilizationGpu as number) : null,
      model: gpuModel,
    },
    ram: {
      percent: Math.round((ramUsed / ramTotal) * 100),
      usedGB: ramUsed / GiB,
      totalGB: ramTotal / GiB,
    },
    network: {
      downKBs: Math.round(latest.down),
      upKBs: Math.round(latest.up),
      maxKBs: Math.round(maxKBs),
      series,
    },
    disk: { freeGB: Math.round(freeGB) },
    battery: {
      percent: Math.round(battery.percent || 0),
      charging: !!battery.isCharging,
      hasBattery: !!battery.hasBattery,
    },
    updatedAt: formatClock(new Date()),
  };
}
