"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { WeeklyReportSummary } from "@/lib/types";

function formatDate(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function daysAgo(unix: number): string {
  const diff = Math.floor((Date.now() / 1000 - unix) / 86400);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 30) return `${diff}일 전`;
  return `${Math.floor(diff / 7)}주 전`;
}

export default function Dashboard() {
  const [reports, setReports] = useState<WeeklyReportSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/reports");
    if (!res.ok) return;
    setReports((await res.json()) as WeeklyReportSummary[]);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const stats = useMemo(() => {
    if (!reports) return null;
    const total = reports.length;
    const lastDate = reports[0]?.report_date ?? null;
    const themeCounts = new Map<string, number>();
    for (const r of reports) {
      for (const t of r.topThemes) {
        const key = t.trim();
        if (!key) continue;
        themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1);
      }
    }
    const topThemes = [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));
    return { total, lastDate, topThemes };
  }, [reports]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  if (loading || !reports || !stats) {
    return (
      <div className="min-h-screen grid place-items-center text-neutral-400 text-sm bg-neutral-50">
        불러오는 중...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">🔬 PH Weekly Research</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              매주 자동 갱신되는 Product Hunt 상위 서비스 분석
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-500 hover:text-neutral-800 transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-neutral-200 px-5 py-4">
            <div className="text-xs text-neutral-500">총 리포트</div>
            <div className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 px-5 py-4">
            <div className="text-xs text-neutral-500">최신 리포트</div>
            <div className="text-xl font-semibold text-neutral-900 mt-1">
              {stats.lastDate ?? "—"}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 px-5 py-4">
            <div className="text-xs text-neutral-500">반복 등장 테마 (상위 5)</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.topThemes.length === 0 ? (
                <span className="text-xs text-neutral-400">아직 없음</span>
              ) : (
                stats.topThemes.map(({ theme, count }) => (
                  <span
                    key={theme}
                    className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded"
                  >
                    {theme} <span className="text-amber-600">×{count}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-neutral-700 mb-3">리포트</h2>
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">
              아직 리포트가 없어요. 매주 스케줄된 원격 에이전트가 리포트를 생성합니다.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/report/${r.id}`}
                className="bg-white rounded-lg border border-neutral-200 hover:border-emerald-400 hover:shadow-sm px-5 py-4 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-emerald-700">{r.report_date}</div>
                  <div className="text-[11px] text-neutral-400">{daysAgo(r.created_at)}</div>
                </div>
                <p className="text-sm text-neutral-800 mt-2 line-clamp-3">
                  {r.collectionSummary || "요약 없음"}
                </p>
                {r.topOpportunityTitle && (
                  <div className="mt-3 text-xs text-neutral-600">
                    🚀 1위 — {r.topOpportunityTitle}
                  </div>
                )}
                {r.topThemes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.topThemes.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-[10px] text-neutral-400">
                  생성 {formatDate(r.created_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
