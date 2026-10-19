import { db, databaseConfigured } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!databaseConfigured || !db) {
    // App still works (data lives in the browser); report the optional DB as not configured.
    return Response.json({ ok: true, database: "not_configured" });
  }
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "ok" });
  } catch {
    return Response.json({ ok: false, database: "error" }, { status: 500 });
  }
}
