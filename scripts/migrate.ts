import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;
  if (!url || !authToken) {
    throw new Error("TURSO_URL and TURSO_TOKEN must be set in .env");
  }
  const db = createClient({ url, authToken });

  const statements = [
    `CREATE TABLE IF NOT EXISTS notebooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notebook_id INTEGER REFERENCES notebooks(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      plain_text TEXT NOT NULL DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id, updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC)`,
    `CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_weekly_reports_date ON weekly_reports(report_date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_weekly_reports_created ON weekly_reports(created_at DESC)`,
  ];

  for (const sql of statements) {
    process.stdout.write(`> ${sql.split("\n")[0].slice(0, 60)}...\n`);
    await db.execute(sql);
  }

  const { rows: notebooks } = await db.execute("SELECT COUNT(*) as c FROM notebooks");
  if (Number(notebooks[0].c) === 0) {
    await db.execute({
      sql: "INSERT INTO notebooks (name) VALUES (?)",
      args: ["내 노트북"],
    });
    process.stdout.write("> seeded default notebook\n");
  }

  process.stdout.write("done.\n");
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(1);
});
