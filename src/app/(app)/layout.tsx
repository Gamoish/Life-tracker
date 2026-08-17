import BottomNav from "@/components/BottomNav";
import MobileTopBar from "@/components/MobileTopBar";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { today } from "@/lib/date";
import { listActiveTasks, summarizeDueTasks } from "./tasks/queries";

/**
 * Wraps every authenticated screen. `/login` sits outside this route group so
 * it renders without the shell. The `(app)` group name is parenthesised, so it
 * does not appear in any URL — `/` is still Home.
 *
 * ONE tree drives both breakpoints:
 *   md+     a persistent sidebar in the first grid column, no tab bar
 *   mobile  the grid collapses to a single column, a fixed top bar (bell) and
 *           bottom tab bar (primary destinations + More) both return
 *
 * `minmax(0, 1fr)` on the content column matters — without it a wide child (the
 * DSA table, the heatmap) would blow the grid out instead of scrolling inside
 * its own container.
 *
 * `force-dynamic` because the sidebar's glance reads the database on every
 * render, and no database is reachable at image-build time.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Fetched once here, at the shell level, rather than inside
  // Sidebar/MobileTopBar separately — both render the same bell data, and a
  // single request per page load keeps the two chromes from ever disagreeing
  // on the count.
  const dueTasks = summarizeDueTasks(await listActiveTasks(), today());

  return (
    <ToastProvider>
      <div className="md:grid md:grid-cols-[15rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Sidebar dueTasks={dueTasks} />
        <main className="mx-auto w-full max-w-7xl px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] md:px-8 md:pb-16 md:pt-10 lg:px-12">
          {children}
        </main>
      </div>
      <MobileTopBar dueTasks={dueTasks} />
      <BottomNav />
    </ToastProvider>
  );
}
