import Link from "next/link";
import { redirect } from "next/navigation";
import DrinkRoundClient, {
  type DrinkMember,
} from "@/components/Drinks/DrinkRoundClient";
import { createClient } from "@/lib/supabase/server";
import { FESTIVAL_NAME } from "@/lib/festival-map";

export default async function DrinksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: profiles },
    { data: breeds },
    { data: items },
    { data: activeRound },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("rabbit_breed_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, display_name, rabbit_breed_id")
      .order("display_name"),
    supabase.from("rabbit_breeds").select("id, image_url, marker_color"),
    supabase
      .from("drink_items")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("drink_rounds")
      .select("*")
      .in("status", ["open", "collecting"])
      .maybeSingle(),
  ]);

  if (!profile?.rabbit_breed_id) redirect("/onboarding");

  const breedById = new Map((breeds ?? []).map((breed) => [breed.id, breed]));
  const members: DrinkMember[] = (profiles ?? []).flatMap((member) => {
    const breed = member.rabbit_breed_id
      ? breedById.get(member.rabbit_breed_id)
      : null;
    if (!breed) return [];
    return [
      {
        user_id: member.id,
        display_name: member.display_name,
        image_url: breed.image_url,
        marker_color: breed.marker_color,
      },
    ];
  });

  const { data: selections } = activeRound
    ? await supabase
        .from("drink_round_selections")
        .select("*")
        .eq("round_id", activeRound.id)
    : { data: [] };

  return (
    <main className="min-h-dvh bg-forest-950 text-cream">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gold/20 bg-forest-950/95 px-4 py-2.5 backdrop-blur">
        <Link href="/map" className="font-display text-lg sm:text-xl">
          🐇 {FESTIVAL_NAME}
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/map"
            className="rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-medium ring-1 ring-cream/15 transition hover:bg-forest-700"
          >
            Kaart
          </Link>
          <Link
            href="/schedule"
            className="rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-medium ring-1 ring-cream/15 transition hover:bg-forest-700"
          >
            Programma
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-7xl p-3 sm:p-5">
        <DrinkRoundClient
          userId={user.id}
          members={members}
          items={items ?? []}
          initialRound={activeRound}
          initialSelections={selections ?? []}
        />
      </div>
    </main>
  );
}
