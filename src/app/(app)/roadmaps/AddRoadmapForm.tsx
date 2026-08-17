"use client";

import { useActionState } from "react";
import { Button, Disclosure, Input } from "@/components/ui";
import { addRoadmap, type FormState } from "./actions";

/** Hand-made roadmaps land in the same tables as seeded ones. */
export default function AddRoadmapForm() {
  const [state, action] = useActionState<FormState, FormData>(addRoadmap, {});

  return (
    <Disclosure label="+ Add roadmap" className="mt-3">
      <form action={action} data-testid="add-roadmap-form" className="space-y-2">
        <div className="flex gap-2 sm:max-w-md">
          <Input name="name" required placeholder="e.g. Backend" />
          <Button type="submit" variant="primary" className="shrink-0">
            Create roadmap
          </Button>
        </div>
        <p className="text-2xs text-faint">The URL slug is derived from the name.</p>
        {state.error && (
          <p role="alert" className="text-xs text-warn">
            {state.error}
          </p>
        )}
      </form>
    </Disclosure>
  );
}
