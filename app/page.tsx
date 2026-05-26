"use client";

import { useEffect, useState } from "react";
import type { ClaudeStats, CodexStats, SystemStats } from "@/lib/types";
import ConsoleScreen from "@/components/ConsoleScreen";
import CodexScreen from "@/components/CodexScreen";
import BridgeScreen from "@/components/BridgeScreen";

const CLAUDE_MS = 30_000;
const SYSTEM_MS = 5_000;
const ROTATE_MS = 18_000;

function usePolled<T>(url: string, intervalMs: number): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    const fetchOnce = async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as T;
        if (alive) setData(json);
      } catch {
        /* keep last good data */
      }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [url, intervalMs]);
  return data;
}

function initialPage(): number {
  if (typeof window === "undefined") return 0;
  const s = new URLSearchParams(window.location.search).get("screen");
  if (s === "2" || s === "codex") return 1;
  if (s === "3" || s === "bridge") return 2;
  return 0;
}

export default function Page() {
  const claude = usePolled<ClaudeStats>("/api/claude", CLAUDE_MS);
  const codex = usePolled<CodexStats>("/api/codex", CLAUDE_MS);
  const system = usePolled<SystemStats>("/api/system", SYSTEM_MS);
  const [page, setPage] = useState(0);

  // Pin to a screen via ?screen=bridge|console (handy for a kiosk display).
  useEffect(() => setPage(initialPage()), []);

  // Keyboard paging.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(2, p + 1));
      else if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auto-rotate: advance to the next page ROTATE_MS after the last change.
  useEffect(() => {
    const id = setTimeout(() => setPage((p) => (p + 1) % 3), ROTATE_MS);
    return () => clearTimeout(id);
  }, [page]);

  return (
    <main className="frame">
      <div className="nav left" onClick={() => setPage(0)} aria-label="Claude Console" />
      <div className="nav right" onClick={() => setPage((p) => (p + 1) % 3)} aria-label="Next Screen" />

      <div className="track" style={{ transform: `translateX(-${page * (100 / 3)}%)` }}>
        <ConsoleScreen stats={claude} />
        <CodexScreen stats={codex} />
        <BridgeScreen stats={system} />
      </div>

      <div className="dots">
        <span className={page === 0 ? "on" : ""} />
        <span className={page === 1 ? "on" : ""} />
        <span className={page === 2 ? "on" : ""} />
      </div>
    </main>
  );
}
