"use client";

import type { NoteSummary } from "@/lib/types";
import { NOTE_TEMPLATES } from "@/lib/templates";

type Props = {
  notes: NoteSummary[];
  title: string;
  query: string;
  onQueryChange: (q: string) => void;
  activeId: number | null;
  onSelect: (id: number) => void;
  onCreate: (templateId?: string) => void;
  onDelete: (id: number) => void;
};

function formatDate(unix: number): string {
  const d = new Date(unix * 1000);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function preview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

export default function NoteList({
  notes,
  title,
  query,
  onQueryChange,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  return (
    <section className="w-80 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-neutral-800 truncate">{title}</h2>
          <div className="flex items-center gap-1.5 shrink-0">
            {NOTE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onCreate(tpl.id)}
                title={`템플릿에서 새 노트: ${tpl.label}`}
                className="border border-emerald-600 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-md hover:bg-emerald-50 transition"
              >
                + {tpl.label}
              </button>
            ))}
            <button
              onClick={() => onCreate()}
              className="bg-emerald-600 text-white text-xs font-medium px-2.5 py-1 rounded-md hover:bg-emerald-700 transition"
            >
              + 새 노트
            </button>
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="검색..."
          className="mt-3 w-full bg-neutral-100 border border-transparent focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-md px-3 py-1.5 text-sm outline-none"
        />
        <div className="mt-2 text-xs text-neutral-400">{notes.length}개의 노트</div>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {notes.map((n) => {
          const isActive = activeId === n.id;
          return (
            <li
              key={n.id}
              onClick={() => onSelect(n.id)}
              className={`group cursor-pointer border-b border-neutral-100 px-4 py-3 ${
                isActive ? "bg-emerald-50/60" : "hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm text-neutral-800 truncate">
                  {n.pinned ? "📌 " : ""}
                  {n.title || "제목 없음"}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-xs text-neutral-400 hover:text-red-500"
                  title="삭제"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs text-neutral-500 mt-1 line-clamp-2">
                {preview(n.plain_text) || "내용 없음"}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1.5">
                {formatDate(n.updated_at)}
              </div>
            </li>
          );
        })}
        {notes.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-neutral-400">
            노트가 없어요. 우측 상단의 + 새 노트를 눌러보세요.
          </li>
        )}
      </ul>
    </section>
  );
}
