import { NextResponse } from "next/server";
import { getCodexStats } from "@/lib/codex-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(getCodexStats());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to read codex stats" },
      { status: 500 },
    );
  }
}
