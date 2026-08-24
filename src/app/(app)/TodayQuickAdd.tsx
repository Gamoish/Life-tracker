"use client";

import Link from "next/link";
import { startTransition } from "react";
import { IconAdd, IconDroplet, IconFlame } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { logWaterBottle } from "./health/actions";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-raised px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent/40 [&_svg]:h-3.5 [&_svg]:w-3.5";

/**
 * Today's "Quick add" row — the mockup's Log water / Log food / Add task
 * pills. Water logs in one tap (same `logWaterBottle` action `HealthToday`'s
 * bottle button uses); food and tasks route to their own quick-add forms
 * rather than duplicating them here.
 */
export default function TodayQuickAdd({ bottleSizeMl }: { bottleSizeMl: number }) {
  const toast = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={PILL}
        onClick={() =>
          startTransition(async () => {
            await logWaterBottle(bottleSizeMl);
            toast(`Logged a bottle · ${bottleSizeMl}ml`, "accent");
          })
        }
      >
        <IconDroplet filled />
        Log water
      </button>
      <Link href="/health" className={PILL}>
        <IconFlame />
        Log food
      </Link>
      <Link href="/tasks" className={PILL}>
        <IconAdd className="h-3.5 w-3.5" />
        Add task
      </Link>
    </div>
  );
}
