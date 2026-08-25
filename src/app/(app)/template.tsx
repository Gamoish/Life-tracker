/**
 * Unlike `layout.tsx`, a `template.tsx` remounts fresh on every navigation —
 * exactly what a one-shot entrance animation needs, with no client-side
 * pathname tracking required. The persistent chrome (Sidebar, nav bars) lives
 * in `layout.tsx` above this and never re-animates; only the routed page
 * content does.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="fade-up-in">{children}</div>;
}
