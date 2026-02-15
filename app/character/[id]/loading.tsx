export default function CharacterLoading() {
  return (
    <main className="space-y-4">
      <section className="relative h-[calc(100dvh-7.5rem)] min-h-[560px] overflow-hidden rounded-2xl border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70" />
        <div className="relative z-10 flex h-full min-h-0 flex-col p-4 md:p-6">
          <header className="mb-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
            <div className="h-6 w-40 animate-pulse rounded bg-white/20" />
            <div className="mt-2 h-4 w-28 animate-pulse rounded bg-white/20" />
          </header>
          <div className="mb-4 min-h-0 flex-1 rounded-2xl border border-white/15 bg-black/15 p-3 md:p-4">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/10" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
            <div className="h-11 animate-pulse rounded bg-white/15" />
          </div>
        </div>
      </section>
    </main>
  );
}
