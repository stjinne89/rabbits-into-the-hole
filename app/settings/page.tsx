import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RabbitPicker from "@/components/RabbitPicker";
import ShareLocationToggle from "@/components/ShareLocationToggle";
import SignOutButton from "@/components/SignOutButton";
import DrinkRoundLink from "@/components/Drinks/DrinkRoundLink";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: breeds }, { data: profile }] = await Promise.all([
    supabase.from("rabbit_breeds").select("*").order("id"),
    supabase
      .from("profiles")
      .select("display_name, rabbit_breed_id, share_location")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return (
    <main className="flex flex-1 justify-center bg-forest-950 px-4 py-10 text-cream">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="w-full font-display text-3xl sm:mr-auto sm:w-auto">
            Instellingen
          </h1>
          <DrinkRoundLink />
          <Link
            href="/schedule"
            className="text-sm text-gold hover:text-gold-bright"
          >
            Programma
          </Link>
          <Link href="/map" className="text-sm text-gold hover:text-gold-bright">
            ← Kaart
          </Link>
        </div>

        <section className="rounded-2xl bg-forest-900 p-6 ring-1 ring-gold/20">
          <h2 className="mb-4 font-display text-xl">Profiel</h2>
          <RabbitPicker
            userId={user.id}
            breeds={breeds ?? []}
            initialName={profile?.display_name ?? ""}
            initialBreedId={profile?.rabbit_breed_id ?? null}
            redirectTo="/settings"
          />
        </section>

        <section className="space-y-4">
          <ShareLocationToggle
            userId={user.id}
            initial={profile?.share_location ?? true}
          />
          <Link
            href="/settings/owntracks"
            className="flex items-center justify-between rounded-xl bg-forest-800 p-4 ring-1 ring-cream/15 transition hover:bg-forest-700"
          >
            <div>
              <p className="text-sm font-medium text-cream">
                OwnTracks koppelen
              </p>
              <p className="text-xs text-cream/70">
                Verbind je telefoon zodat je locatie live wordt gedeeld.
              </p>
            </div>
            <span className="text-cream/50">→</span>
          </Link>
        </section>

        <div className="flex justify-end">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
