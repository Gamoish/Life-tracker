import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";

/** One free-text note per date — no rich formatting, no per-entry id. */
export async function getJournalEntry(date: string): Promise<string> {
  const rows = await db
    .select({ text: journalEntries.text })
    .from(journalEntries)
    .where(eq(journalEntries.date, date));
  return rows[0]?.text ?? "";
}

export type JournalRow = { date: string; text: string; updatedAt: Date };

export async function listJournalEntries(limit = 60): Promise<JournalRow[]> {
  return db
    .select({ date: journalEntries.date, text: journalEntries.text, updatedAt: journalEntries.updatedAt })
    .from(journalEntries)
    .orderBy(desc(journalEntries.date))
    .limit(limit);
}

/** Blank text clears the day's entry rather than storing an empty row. */
export async function upsertJournalEntry(date: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    await db.delete(journalEntries).where(eq(journalEntries.date, date));
    return;
  }
  await db
    .insert(journalEntries)
    .values({ date, text: trimmed })
    .onConflictDoUpdate({ target: journalEntries.date, set: { text: trimmed, updatedAt: new Date() } });
}
