export default function DrinksLoading() {
  return (
    <main className="min-h-dvh bg-forest-950 p-5 text-cream">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-28 rounded-2xl bg-forest-900" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[65dvh] rounded-2xl bg-forest-900" />
          <div className="h-80 rounded-2xl bg-forest-900" />
        </div>
      </div>
    </main>
  );
}
