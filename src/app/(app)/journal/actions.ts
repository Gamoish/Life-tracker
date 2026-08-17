"use server";

import { revalidatePath } from "next/cache";
import { upsertJournalEntry } from "./queries";
import { today } from "@/lib/date";

export type FormState = { error?: string; ok?: boolean };

function revalidateAll() {
  revalidatePath("/journal");
  revalidatePath("/"); // Today embeds the quick-entry widget.
}

/** Always writes today's date — the Today widget only ever edits "now". */
export async function saveTodayEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const text = String(formData.get("text") ?? "");
  await upsertJournalEntry(today(), text);
  revalidateAll();
  return { ok: true };
}

/** The history list edits entries from any past date, so the date travels with the form. */
export async function saveEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const date = String(formData.get("date") ?? "").trim();
  if (!date) return { error: "Missing date" };
  const text = String(formData.get("text") ?? "");
  await upsertJournalEntry(date, text);
  revalidateAll();
  return { ok: true };
}
