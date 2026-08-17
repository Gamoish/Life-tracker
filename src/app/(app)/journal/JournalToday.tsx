"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Card, Textarea } from "@/components/ui";
import { IconJournal } from "@/components/icons";
import { saveTodayEntry, type FormState } from "./actions";

/**
 * Today's journal, embedded directly on the dashboard rather than living
 * behind its own nav destination — one free-text note, no rich formatting,
 * just a textarea and a save button. `/journal` still exists for the
 * history list; this widget only ever touches today's entry.
 */
export default function JournalToday({ text }: { text: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveTodayEntry, {});

  return (
    <Card className="p-4" data-testid="journal-today">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight">
          <IconJournal className="h-4 w-4 text-faint" />
          Journal
        </h3>
        <Link href="/journal" className="text-2xs text-accent underline underline-offset-4">
          History →
        </Link>
      </div>
      <form action={action} className="space-y-2">
        <Textarea
          name="text"
          defaultValue={text}
          rows={3}
          placeholder="How did today go?"
          aria-label="Today's journal entry"
        />
        <Button type="submit" variant="primary" size="sm" data-testid="journal-save">
          Save
        </Button>
        {state.ok && <span className="ml-2 text-2xs text-done">Saved.</span>}
      </form>
    </Card>
  );
}
