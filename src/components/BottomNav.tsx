"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconMore, MOBILE_MORE, MOBILE_PRIMARY, isActive } from "./nav-items";

/**
 * Mobile only — `md:hidden` is `display: none`, which also removes it from the
 * accessibility tree, so the sidebar and this bar never expose two links with
 * the same name at the same time.
 *
 * Icon-only: no text labels, so `MOBILE_PRIMARY`'s five slots fit comfortably
 * at narrow phone widths without truncating. Each icon still carries an
 * `aria-label` so the row stays legible to a screen reader. Everything not in
 * `MOBILE_PRIMARY` lives behind the trailing "More" button instead of
 * crowding this row — see `nav-items.tsx` for why the list is split this way.
 */
export default function BottomNav() {
  const pathname = usePathname(ffffffffff);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE.some((d) => isActive(pathname, d.href));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center">
        {MOBILE_PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 px-0.5 py-3 transition-colors [&_svg]:h-[22px] [&_svg]:w-[22px] ${
                  active ? "text-accent" : "text-faint"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent"
                  />
                )}
                <Icon />
              </Link>
            </li>
          );
        })}

        <li className="relative min-w-0 flex-1">
          <button
            type="button"
            aria-label="More"
            aria-expanded={moreOpen}
            data-testid="more-menu-trigger"
            onClick={() => setMoreOpen((v) => !v)}
            className={`relative flex w-full flex-col items-center gap-0.5 px-0.5 py-3 transition-colors [&_svg]:h-[22px] [&_svg]:w-[22px] ${
              moreOpen || moreActive ? "text-accent" : "text-faint"
            }`}
          >
            {(moreOpen || moreActive) && (
              <span
                aria-hidden
                className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent"
              />
            )}
            <IconMore />
          </button>

          {moreOpen && (
            <>
              <button
                type="button"
                aria-label="Close"
                tabIndex={-1}
                onClick={() => setMoreOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />
              <div
                data-testid="more-menu-panel"
                className="absolute right-0 bottom-full z-40 mb-2 w-56 rounded-card border border-line bg-gradient-to-b from-raised/80 to-surface p-1.5 shadow-[0_20px_44px_-20px_rgba(0,0,0,0.7)]"
              >
                <ul className="space-y-0.5">
                  {MOBILE_MORE.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:h-[18px] [&_svg]:w-[18px] ${
                            active ? "bg-accent-soft text-accent" : "text-muted hover:bg-raised hover:text-ink"
                          }`}
                        >
                          <Icon />
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </li>
      </ul>
    </nav>
  );
}
