import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { getRoadmapTopics, listRoadmaps } from "@/lib/roadmap-queries";
import RoadmapView, { type TopicNode } from "./RoadmapView";
import AddRoadmapForm from "./AddRoadmapForm";
import DeleteRoadmapButton from "./DeleteRoadmapButton";

export const dynamic = "force-dynamic";

export default async function RoadmapsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r } = await searchParams;
  const all = await listRoadmaps();

  if (all.length === 0) {
    return (
      <>
        <PageHeader title="Roadmaps" />
        <EmptyState
          title="No roadmaps yet"
          hint={
            <>
              Add one below, or drop a JSON file in{" "}
              <code className="font-mono text-xs text-muted">seeds/roadmaps/</code>{" "}
              and run the seed.
            </>
          }
        />
        <AddRoadmapForm />
      </>
    );
  }

  // With one roadmap, land straight on it; the picker only earns its space
  // once there's a choice to make.
  const selected = all.find((x) => x.slug === r) ?? all[0];

  const rows = await getRoadmapTopics(selected.id);
  const topics: TopicNode[] = rows.map((t) => ({
    id: t.id,
    parentId: t.parentId,
    title: t.title,
    kind: t.kind,
    status: t.status,
    resourceLink: t.resourceLink,
  }));

  return (
    <>
      <PageHeader
        title={selected.name}
        subtitle="Roadmap"
        action={<DeleteRoadmapButton roadmapId={selected.id} name={selected.name} />}
      />

      {all.length > 1 && (
        <nav aria-label="Roadmaps" className="mb-6 flex flex-wrap gap-2">
          {all.map((rm) => {
            const current = rm.id === selected.id;
            return (
              <Link
                key={rm.id}
                href={`/roadmaps?r=${rm.slug}`}
                aria-current={current ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  current
                    ? "bg-accent text-accent-ink"
                    : "border border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {rm.name}
              </Link>
            );
          })}
        </nav>
      )}

      <RoadmapView roadmapId={selected.id} topics={topics} />

      <AddRoadmapForm />
    </>
  );
}
