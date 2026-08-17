"use client";

import { startTransition, useState } from "react";
import { Button, TextButton } from "@/components/ui";
import { deleteRoadmap } from "./actions";

/**
 * Deleting a roadmap cascades to its topics but only NULLs `roadmap_id` on any
 * goal tracking it — goals survive and fall back to manual progress.
 */
export default function DeleteRoadmapButton({
  roadmapId,
  name,
}: {
  roadmapId: number;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <TextButton
        data-testid="delete-roadmap"
        onClick={() => setConfirming(true)}
        tone="neutral"
      >
        Delete roadmap
      </TextButton>
    );
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs text-muted">
        Delete “{name}” and all its topics?
      </span>
      <Button
        data-testid="delete-roadmap-confirm"
        variant="danger"
        size="sm"
        onClick={() => startTransition(() => deleteRoadmap(roadmapId))}
      >
        Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
    </span>
  );
}
