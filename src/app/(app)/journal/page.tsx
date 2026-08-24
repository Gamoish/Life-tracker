import { PageHeader } from "@/components/ui";
import { today, formatShort } from "@/lib/date";
import { getJournalEntry, listJournalEntries } from "./queries";
import JournalEntryForm from "./JournalEntryForm";
import JournalHistory from "./JournalHistory";

export const dynamic = "force-dynamic";

/** A full nav destination: today's entry to write, and every earlier one to browse. */
export default async function JournalPage() {
  const day = today();
  const [text, entries] = await Promise.all([getJournalEntry(day), listJournalEntries(60)]);

  // Today's own row lives in the entry form above, not the history list below.
  const earlier = entries.filter((e) => e.date !== day);

  return (
    <>
      <PageHeader title="How was today?" subtitle={formatShort(day)} />
      <JournalEntryForm text={text} />

      <h2 className="mb-2.5 mt-8 text-2xs font-semibold uppercase tracking-[0.14em] text-faint">
        Earlier entries
      </h2>
      <JournalHistory entries={earlier} />
    </>
  );
}
