"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps server-rendered "today" views aligned with the user's calendar while
 * the app is left open. It checks on focus/visibility changes as well as once
 * a minute, but only refreshes when the browser's local date actually rolls
 * over, so normal use does not cause unnecessary requests.
 */
function browserDay(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function DayRollover({ timeZone }: { timeZone: string }) {
  const router = useRouter();

  useEffect(() => {
    let displayedDay = browserDay(timeZone);

    const refreshIfNewDay = () => {
      const currentDay = browserDay(timeZone);
      if (currentDay !== displayedDay) {
        displayedDay = currentDay;
        router.refresh();
      }
    };

    const interval = window.setInterval(refreshIfNewDay, 60_000);
    window.addEventListener("focus", refreshIfNewDay);
    document.addEventListener("visibilitychange", refreshIfNewDay);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfNewDay);
      document.removeEventListener("visibilitychange", refreshIfNewDay);
    };
  }, [router, timeZone]);

  return null;
}
