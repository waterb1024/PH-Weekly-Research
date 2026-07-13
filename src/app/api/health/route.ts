import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ingestKey = process.env.INGEST_API_KEY;
  const tursoUrl = process.env.TURSO_URL;
  const tursoToken = process.env.TURSO_TOKEN;
  return NextResponse.json(
    {
      ok: true,
      env: {
        INGEST_API_KEY: ingestKey ? `set (len=${ingestKey.length})` : "MISSING",
        TURSO_URL: tursoUrl ? "set" : "MISSING",
        TURSO_TOKEN: tursoToken ? "set" : "MISSING",
      },
    },
    { status: 200 },
  );
}
