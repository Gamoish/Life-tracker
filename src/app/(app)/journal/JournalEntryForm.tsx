"use client";

import { useActionState } from "react";
import { Button, Textarea } from "@/components/ui";
import { saveTodayEntry, type FormState } from "./actions";

/**
 * Today's entry — one free-text note, no rich formatting. Same
 * `saveTodayEntry` action and `journal-today`/`journal-save` testids this
 * widget carried when it lived on the Today dashboard; only the location
 * changed, not the behavior.
 */
export default function JournalEntryForm({ text }: { text: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveTodayEntry, {});

  return (
    <div data-testid="journal-today">
      <form action={action} className="space-y-3">
        <Textarea
          name="text"
          defaultValue={text}
          rows={6}
          placeholder="Write freely — what happened, what you're grateful for, what's on your mind."
          aria-label="Today's journal entry"
          className="text-[0.9375rem] leading-relaxed"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-2xs text-faint">
            {state.ok ? "Saved." : "Autosaves are off — press Save when you're done."}
          </span>
          <Button type="submit" variant="primary" data-testid="journal-save">
            Save entry
          </Button>
        </div>
      </form>
    </div>
  );
}
