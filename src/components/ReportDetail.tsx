"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WeeklyReport } from "@/lib/types";

type Props = { id: number };

export default function ReportDetail({ id }: Props) {
  const router = useRouter();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/reports/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "리포트를 찾을 수 없습니다." : `오류 (${res.status})`);
        return;
      }
      setReport((await res.json()) as WeeklyReport);
    })();
  }, [id]);

  const handleDelete = useCallback(async () => {
    if (!confirm("이 리포트를 삭제할까요?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    router.push("/");
  }, [id, router]);

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center bg-neutral-50">
        <div className="text-sm text-neutral-500">
          {error} <Link href="/" className="text-emerald-700 underline ml-2">돌아가기</Link>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen grid place-items-center text-neutral-400 text-sm bg-neutral-50">
        불러오는 중...
      </main>
    );
  }

  const { data } = report;

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← 대시보드
          </Link>
          <button
            onClick={handleDelete}
            className="text-xs text-neutral-400 hover:text-red-500 transition"
          >
            삭제
          </button>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <div className="text-xs font-medium text-emerald-700">{report.report_date}</div>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">
            주간 Product Hunt 리서치
          </h1>
        </div>

        <Section title="📥 수집 요약">
          <p className="whitespace-pre-line">{data.collectionSummary || "—"}</p>
        </Section>

        <Section title="🚀 1인 개발자용 미개척 상위 5">
          {data.top5Opportunities.length === 0 ? (
            <p className="text-neutral-400">—</p>
          ) : (
            <ol className="space-y-4">
              {data.top5Opportunities.map((o) => (
                <li
                  key={o.rank}
                  className="bg-white border border-neutral-200 rounded-lg px-5 py-4"
                >
                  <div className="text-xs text-emerald-700 font-medium">{o.rank}위</div>
                  <div className="text-lg font-semibold text-neutral-900 mt-0.5">{o.title}</div>
                  <p className="text-sm text-neutral-700 mt-2 whitespace-pre-line">
                    <strong>왜:</strong> {o.rationale}
                  </p>
                  <p className="text-sm text-neutral-600 mt-1.5 whitespace-pre-line">
                    <strong>구현 난이도:</strong> {o.difficultyNotes}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="🧩 문제의 공통점">
          {data.commonalities.length === 0 ? (
            <p className="text-neutral-400">—</p>
          ) : (
            <ul className="list-disc list-inside space-y-1">
              {data.commonalities.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="📊 시장 규모">
          <p className="whitespace-pre-line">{data.marketSize || "—"}</p>
        </Section>

        <Section title="🔍 수집된 서비스">
          {data.serviceList.length === 0 ? (
            <p className="text-neutral-400">—</p>
          ) : (
            <ul className="space-y-2">
              {data.serviceList.map((s, i) => (
                <li key={i} className="bg-white border border-neutral-200 rounded px-4 py-2.5">
                  <div className="text-sm font-semibold text-neutral-900">{s.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{s.tagline}</div>
                  <div className="text-xs text-neutral-700 mt-1.5">
                    <span className="text-neutral-500">문제:</span> {s.problem}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {data.notes && (
          <Section title="📝 메모">
            <p className="whitespace-pre-line text-sm text-neutral-600">{data.notes}</p>
          </Section>
        )}
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-neutral-700 mb-3">{title}</h2>
      <div className="text-sm text-neutral-800 leading-relaxed">{children}</div>
    </section>
  );
}
