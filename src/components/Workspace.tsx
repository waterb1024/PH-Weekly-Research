"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import NoteList from "./NoteList";
import Editor from "./Editor";
import type { Note, NoteSummary, Notebook } from "@/lib/types";

export default function Workspace() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<number | "all">("all");
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  const refreshNotebooks = useCallback(async () => {
    const res = await fetch("/api/notebooks");
    const data = (await res.json()) as Notebook[];
    setNotebooks(data);
  }, []);

  const refreshNotes = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("notebookId", String(activeNotebookId));
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/notes?${params.toString()}`);
    const data = (await res.json()) as NoteSummary[];
    setNotes(data);
  }, [activeNotebookId, query]);

  useEffect(() => {
    (async () => {
      await refreshNotebooks();
      setLoaded(true);
    })();
  }, [refreshNotebooks]);

  useEffect(() => {
    refreshNotes();
  }, [refreshNotes]);

  useEffect(() => {
    if (activeNoteId == null) {
      setActiveNote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/notes/${activeNoteId}`);
      if (!res.ok) return;
      const data = (await res.json()) as Note;
      if (!cancelled) setActiveNote(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNoteId]);

  const handleCreateNotebook = useCallback(async () => {
    const name = prompt("새 노트북 이름");
    if (!name) return;
    await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await refreshNotebooks();
  }, [refreshNotebooks]);

  const handleRenameNotebook = useCallback(
    async (id: number, name: string) => {
      await fetch(`/api/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await refreshNotebooks();
    },
    [refreshNotebooks],
  );

  const handleDeleteNotebook = useCallback(
    async (id: number) => {
      if (!confirm("노트북과 그 안의 모든 노트가 삭제됩니다. 계속할까요?")) return;
      await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
      if (activeNotebookId === id) setActiveNotebookId("all");
      await refreshNotebooks();
      await refreshNotes();
    },
    [activeNotebookId, refreshNotebooks, refreshNotes],
  );

  const handleCreateNote = useCallback(
    async (templateId?: string) => {
      const body: { notebook_id?: number; template?: string } = {};
      if (activeNotebookId !== "all") body.notebook_id = activeNotebookId;
      if (templateId) body.template = templateId;
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const note = (await res.json()) as Note;
      await refreshNotes();
      await refreshNotebooks();
      setActiveNoteId(note.id);
    },
    [activeNotebookId, refreshNotes, refreshNotebooks],
  );

  const handleDeleteNote = useCallback(
    async (id: number) => {
      if (!confirm("이 노트를 삭제할까요?")) return;
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (activeNoteId === id) setActiveNoteId(null);
      await refreshNotes();
      await refreshNotebooks();
    },
    [activeNoteId, refreshNotes, refreshNotebooks],
  );

  const handleSaveNote = useCallback(
    async (
      id: number,
      patch: { title?: string; content?: string; plain_text?: string },
    ) => {
      await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setNotes((curr) =>
        curr.map((n) =>
          n.id === id
            ? {
                ...n,
                title: patch.title ?? n.title,
                plain_text: patch.plain_text ?? n.plain_text,
                updated_at: Math.floor(Date.now() / 1000),
              }
            : n,
        ),
      );
    },
    [],
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  const activeNotebookName = useMemo(() => {
    if (activeNotebookId === "all") return "모든 노트";
    return notebooks.find((n) => n.id === activeNotebookId)?.name ?? "노트";
  }, [activeNotebookId, notebooks]);

  if (!loaded) {
    return (
      <div className="h-screen grid place-items-center text-neutral-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      <Sidebar
        notebooks={notebooks}
        activeId={activeNotebookId}
        onSelect={(id) => {
          setActiveNotebookId(id);
          setActiveNoteId(null);
        }}
        onCreate={handleCreateNotebook}
        onRename={handleRenameNotebook}
        onDelete={handleDeleteNotebook}
        onLogout={handleLogout}
      />
      <NoteList
        notes={notes}
        title={activeNotebookName}
        query={query}
        onQueryChange={setQuery}
        activeId={activeNoteId}
        onSelect={setActiveNoteId}
        onCreate={handleCreateNote}
        onDelete={handleDeleteNote}
      />
      <Editor
        key={activeNote?.id ?? "none"}
        note={activeNote}
        onSave={handleSaveNote}
        notebooks={notebooks}
        onChangeNotebook={async (id, notebookId) => {
          await fetch(`/api/notes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notebook_id: notebookId }),
          });
          await refreshNotes();
          await refreshNotebooks();
          const res = await fetch(`/api/notes/${id}`);
          if (res.ok) setActiveNote((await res.json()) as Note);
        }}
      />
    </div>
  );
}
