// Shared data shapes returned by the API routes and consumed by the client.

export interface ClaudeStats {
  model: string; // e.g. "Opus 4.7 [1m]"
  session: {
    duration: string; // "20h 5m"
    messages: number; // user turns in the active session
    replies: number; // assistant turns in the active session
  };
  context: {
    percent: number; // 0..100, share of the model context window in use
    tokens: number; // absolute tokens in the latest context
    limit: number; // model context window size
  };
  today: {
    costUSD: number; // estimated, from the price table
    tokensOut: number; // sum of output tokens today
    toolCalls: number; // sum of tool_use blocks today
  };
  tokensPerHour: { hour: number; tokens: number }[]; // 24 buckets, hour-of-day
  speed: {
    tokPerSec: number; // best-effort average output speed
    filesTouched: number; // distinct files read/edited/written today
    apiErrors: number; // api error messages today
  };
  latestAction: {
    tool: string; // most recent tool used, e.g. "Bash"
    prompt: string; // latest user prompt text
    idleSeconds: number; // seconds since last activity
  };
  updatedAt: string; // "21:01:40"
  date: string; // "2026-05-21"
}

export interface SystemStats {
  cpu: { percent: number; busyCores: number; cores: number };
  gpu: { percent: number | null; model: string | null }; // percent null => no utilization data
  ram: { percent: number; usedGB: number; totalGB: number };
  network: {
    downKBs: number;
    upKBs: number;
    maxKBs: number;
    series: { down: number; up: number }[]; // up to 60 points, oldest first
  };
  disk: { freeGB: number };
  battery: { percent: number; charging: boolean; hasBattery: boolean };
  updatedAt: string; // "21:05:23"
}
