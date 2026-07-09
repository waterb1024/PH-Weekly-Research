import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ProductHuntResearchData } from "@/lib/types";

type IngestBody = Partial<ProductHuntResearchData> & { report_date?: string };

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalize(body: IngestBody): ProductHuntResearchData {
  return {
    collectionSummary: body.collectionSummary ?? "",
    serviceList: Array.isArray(body.serviceList) ? body.serviceList : [],
    commonalities: Array.isArray(body.commonalities) ? body.commonalities : [],
    marketSize: body.marketSize ?? "",
    top5Opportunities: Array.isArray(body.top5Opportunities)
      ? body.top5Opportunities
      : [],
    notes: body.notes ?? "",
  };
}

export async function POST(req: Request) {
  const expected = process.env.INGEST_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "ingest_disabled", message: "INGEST_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const reportDate = body.report_date && isValidDate(body.report_date) ? body.report_date : todayYmd();
  const data = normalize(body);
  const dataJson = JSON.stringify(data);

  const result = await db.execute({
    sql: `INSERT INTO weekly_reports (report_date, data)
          VALUES (?, ?)
          RETURNING id, report_date, created_at, updated_at`,
    args: [reportDate, dataJson],
  });

  const row = result.rows[0];
  return NextResponse.json({
    id: Number(row.id),
    report_date: String(row.report_date),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  });
}
