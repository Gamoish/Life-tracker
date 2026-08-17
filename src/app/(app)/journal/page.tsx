import { PageHeader } from "@/components/ui";
import { today, formatShort } from "@/lib/date";
import { listJournalEntries } from "./queries";
import JournalHistory from "./JournalHistory";

export const dynamic = "force-dynamic";

/**
 * Reachable only via the Today widget's "History →" link — deliberately not
 * in `DESTINATIONS`. See the nav-layout note in the PR/report for why.
 */
export default async function JournalPage() {
  const entries = await listJournalEntries(60);

  return (
    <>
      <PageHeader title="Journal" subtitle={formatShort(today())} />
      <JournalHistory entries={entries} />
    </>
  );
}
