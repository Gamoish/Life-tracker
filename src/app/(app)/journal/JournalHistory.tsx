"use client";

import { useActionState, useState } from "react";
import { Button, Card, EmptyState, Pill, Textarea, TextButton } from "@/components/ui";
import { IconJournal } from "@/components/icons";
import { formatShort } from "@/lib/date";
import { saveEntry, type FormState } from "./actions";
import type { JournalRow } from "./queries";

export default function JournalHistory({ entries }: { entries: JournalRow[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<IconJournal />}
        title="No earlier entries yet"
        hint="Come back tomorrow — today's note moves down here once a new day starts."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <EntryRow key={entry.date} entry={entry} />
      ))}
    </ul>
  );
}

function EntryRow({ entry }: { entry: JournalRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(saveEntry, {});

  return (
    <Card className="p-3.5" data-testid="journal-history-row" data-date={entry.date}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <Pill tone="neutral">{formatShort(entry.date)}</Pill>
        <TextButton onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</TextButton>
      </div>

      {editing ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="date" value={entry.date} />
          <Textarea name="text" defaultValue={entry.text} rows={3} aria-label="Journal entry" />
          <Button type="submit" variant="primary" size="sm">
            Save
          </Button>
          {state.error && (
            <p role="alert" className="text-xs text-warn">
              {state.error}
            </p>
          )}
        </form>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-muted">{entry.text}</p>
      )}
    </Card>
  );
}
