import { NextResponse } from "next/server";
import { parseRevalidatePayload, revalidateForPayload, secretMatches } from "@/lib/revalidate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.ISR_SECRET) {
    return NextResponse.json({ error: "revalidation_failed" }, { status: 500 });
  }

  const secret = request.headers.get("x-revalidate-secret");
  if (!secretMatches(secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = parseRevalidatePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await revalidateForPayload(parsed.payload);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "revalidation_failed" }, { status: 500 });
  }
}
