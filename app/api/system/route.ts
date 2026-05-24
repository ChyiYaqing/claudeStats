import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/system-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getSystemStats());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to read system stats" },
      { status: 500 },
    );
  }
}
