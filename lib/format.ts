// Client-safe formatting helpers (no Node imports).

/** 538_000 -> "538.0k", 1_240_000 -> "1.2m", 842 -> "842". */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

/** 72_300_000 ms -> "20h 5m"; under an hour -> "5m 12s". */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Seconds since an event -> "14s", "3m", "2h". */
export function formatIdle(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec / 3600)}h`;
}

/** 1435.05 -> "$1,435.05". */
export function formatUSD(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Local wall clock "21:01:40". */
export function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

/** Local date "2026-05-21". */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const mo = `${d.getMonth() + 1}`.padStart(2, "0");
  const da = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${mo}-${da}`;
}
