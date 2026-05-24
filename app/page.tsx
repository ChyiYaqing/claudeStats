"use client";

import { useEffect, useState } from "react";
import type { ClaudeStats, SystemStats } from "@/lib/types";
import ConsoleScreen from "@/components/ConsoleScreen";
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
  return s === "2" || s === "bridge" ? 1 : 0;
}

export default function Page() {
  const claude = usePolled<ClaudeStats>("/api/claude", CLAUDE_MS);
  const system = usePolled<SystemStats>("/api/system", SYSTEM_MS);
  const [page, setPage] = useState(0);

  // Pin to a screen via ?screen=bridge|console (handy for a kiosk display).
  useEffect(() => setPage(initialPage()), []);

  // Keyboard paging.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPage(1);
      else if (e.key === "ArrowLeft") setPage(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Auto-rotate: flip to the other page ROTATE_MS after the last change.
  useEffect(() => {
    const id = setTimeout(() => setPage((p) => (p === 0 ? 1 : 0)), ROTATE_MS);
    return () => clearTimeout(id);
  }, [page]);

  return (
    <main className="frame">
      <div className="nav left" onClick={() => setPage(0)} aria-label="Claude Console" />
      <div className="nav right" onClick={() => setPage(1)} aria-label="Bridge" />

      <div className="track" style={{ transform: `translateX(-${page * 50}%)` }}>
        <ConsoleScreen stats={claude} />
        <BridgeScreen stats={system} />
      </div>

      <div className="dots">
        <span className={page === 0 ? "on" : ""} />
        <span className={page === 1 ? "on" : ""} />
      </div>
    </main>
  );
}
