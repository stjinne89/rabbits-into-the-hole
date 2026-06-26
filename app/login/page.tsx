import { createAdminClient } from "@/lib/supabase/server";
import EntryForm from "@/components/EntryForm";

export const dynamic = "force-dynamic";

// No login — just a nickname + rabbit. Breeds are loaded server-side (the
// visitor has no session yet, so we read them with the service-role client).
export default async function EntryPage() {
  const admin = createAdminClient();
  const { data: breeds } = await admin
    .from("rabbit_breeds")
    .select("*")
    .order("id");

  return (
    <main className="flex flex-1 items-center justify-center bg-forest-950 px-4 py-10 text-cream">
      <div className="w-full max-w-sm rounded-2xl bg-forest-900 p-8 shadow-xl ring-1 ring-gold/20">
        <div className="text-center">
          <h1 className="font-display text-4xl leading-[0.92]">
            Rabbits
            <br />
            into the Hole
          </h1>
          <p className="mt-3 text-sm normal-case tracking-normal text-cream/70">
            Kies een nickname en je festivalkonijn — en je bent binnen.
          </p>
        </div>

        <EntryForm breeds={breeds ?? []} />
      </div>
    </main>
  );
}
