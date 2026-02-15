export default function DashboardLoading() {
  return (
    <main className="space-y-4">
      <section className="rounded border border-zinc-800 p-4">
        <div className="mb-3 h-7 w-28 animate-pulse rounded bg-zinc-800" />
        <div className="mb-4 h-10 w-24 animate-pulse rounded bg-zinc-800" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="h-52 animate-pulse bg-zinc-800" />
              <div className="space-y-3 p-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-800" />
                <div className="flex gap-2">
                  <div className="h-9 w-20 animate-pulse rounded bg-zinc-800" />
                  <div className="h-9 w-16 animate-pulse rounded bg-zinc-800" />
                  <div className="h-9 w-16 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
