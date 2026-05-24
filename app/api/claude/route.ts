import { NextResponse } from "next/server";
import { getClaudeStats } from "@/lib/claude-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(getClaudeStats());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to read claude stats" },
      { status: 500 },
    );
  }
}
