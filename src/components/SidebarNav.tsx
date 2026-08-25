"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINATIONS, isActive } from "./nav-items";

/** The desktop destination list. Rendered only inside the `md:`+ sidebar. */
export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="px-3">
      <ul className="space-y-0.5">
        {DESTINATIONS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="pop-in absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  />
                )}
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
