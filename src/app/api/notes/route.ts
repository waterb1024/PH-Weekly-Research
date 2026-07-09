import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findTemplate, htmlToPlain } from "@/lib/templates";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const notebookId = url.searchParams.get("notebookId");
  const q = url.searchParams.get("q")?.trim();
  const archived = url.searchParams.get("archived") === "1";

  const where: string[] = ["archived = ?"];
  const args: (string | number)[] = [archived ? 1 : 0];

  if (notebookId && notebookId !== "all") {
    where.push("notebook_id = ?");
    args.push(Number(notebookId));
  }
  if (q) {
    where.push("(title LIKE ? OR plain_text LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }

  const { rows } = await db.execute({
    sql: `
      SELECT id, notebook_id, title, plain_text, pinned, created_at, updated_at
      FROM notes
      WHERE ${where.join(" AND ")}
      ORDER BY pinned DESC, updated_at DESC
      LIMIT 500
    `,
    args,
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    notebook_id?: number;
    template?: string;
  };
  let notebookId = body.notebook_id;
  if (!notebookId) {
    const nb = await db.execute(
      "SELECT id FROM notebooks ORDER BY created_at ASC LIMIT 1",
    );
    notebookId = Number(nb.rows[0]?.id);
    if (!notebookId) {
      const created = await db.execute({
        sql: "INSERT INTO notebooks (name) VALUES (?) RETURNING id",
        args: ["내 노트북"],
      });
      notebookId = Number(created.rows[0].id);
    }
  }

  const template = body.template ? findTemplate(body.template) : undefined;
  const title = template ? template.buildTitle(new Date()) : "";
  const content = template ? template.content : "";
  const plainText = template ? htmlToPlain(template.content) : "";

  const result = await db.execute({
    sql: `INSERT INTO notes (notebook_id, title, content, plain_text)
          VALUES (?, ?, ?, ?)
          RETURNING id, notebook_id, title, content, plain_text, pinned, archived, created_at, updated_at`,
    args: [notebookId, title, content, plainText],
  });
  return NextResponse.json(result.rows[0]);
}
