import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";
import { dbCircuitStats } from "@/lib/seg/db-circuit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const dbOk = await pingDb();
  const circuito = dbCircuitStats();
  return NextResponse.json(
    { ok: dbOk, db: dbOk, circuito },
    { status: dbOk ? 200 : 503 }
  );
}
