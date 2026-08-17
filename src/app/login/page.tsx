import LoginForm from "./LoginForm";

export const metadata = { title: "Unlock · Tracker" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <Mark />
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
          Tracker
        </h1>
        <p className="mt-1 text-sm text-muted">Enter your password to continue.</p>
      </div>

      <LoginForm next={next ?? "/"} />
    </main>
  );
}

/** Same monogram as the sidebar — nine cells on the heat ramp. */
function Mark() {
  const lit = [0, 2, 4, 1, 3, 2, 4, 1, 3];
  return (
    <span
      aria-hidden
      className="inline-grid grid-cols-3 gap-[3px] rounded-lg border border-line bg-surface p-1.5"
    >
      {lit.map((level, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-[2px]"
          style={{ backgroundColor: `var(--c-heat-${level})` }}
        />
      ))}
    </span>
  );
}
