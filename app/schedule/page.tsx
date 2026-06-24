import Link from "next/link";
import { redirect } from "next/navigation";
import SchedulePlanner, {
  type SharedActSelection,
} from "@/components/Schedule/SchedulePlanner";
import DrinkRoundLink from "@/components/Drinks/DrinkRoundLink";
import { createClient } from "@/lib/supabase/server";
import { FESTIVAL_NAME } from "@/lib/festival-map";

const STAGE_ORDER = [
  "Hotot",
  "Teddy Widder",
  "Fuzzy Lop",
  "REX",
  "Bossa Nova",
  "Radiate VI",
  "Holding",
  "The Croque Madame",
  "The Bizarre",
];

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: breeds },
    { data: profiles },
    { data: stages },
    { data: acts },
    { data: picks },
  ] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, rabbit_breed_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("rabbit_breeds").select("id, image_url, marker_color"),
      supabase
        .from("profiles")
        .select("id, display_name, rabbit_breed_id"),
      supabase.from("stages").select("*").order("sort_order"),
      supabase.from("acts").select("*").order("start_time"),
      supabase.from("user_act_selections").select("user_id, act_id"),
  ]);

  if (!profile?.rabbit_breed_id) {
    redirect("/onboarding");
  }

  const rabbit = breeds?.find((breed) => breed.id === profile.rabbit_breed_id);
  if (!rabbit) redirect("/onboarding");

  const breedById = new Map((breeds ?? []).map((breed) => [breed.id, breed]));
  const profileById = new Map(
    (profiles ?? []).map((member) => [member.id, member])
  );
  const sharedSelections: SharedActSelection[] = (picks ?? []).flatMap(
    (pick) => {
      const member = profileById.get(pick.user_id);
      const memberBreed = member?.rabbit_breed_id
        ? breedById.get(member.rabbit_breed_id)
        : null;
      if (!member || !memberBreed) return [];
      return [
        {
          act_id: pick.act_id,
          rabbit: {
            user_id: pick.user_id,
            display_name: member.display_name,
            image_url: memberBreed.image_url,
            marker_color: memberBreed.marker_color,
          },
        },
      ];
    }
  );
  const allRabbits = (profiles ?? []).flatMap((member) => {
    const memberBreed = member.rabbit_breed_id
      ? breedById.get(member.rabbit_breed_id)
      : null;
    if (!memberBreed) return [];
    return [
      {
        user_id: member.id,
        display_name: member.display_name,
        image_url: memberBreed.image_url,
        marker_color: memberBreed.marker_color,
      },
    ];
  });

  const stageRank = new Map(
    STAGE_ORDER.map((stageName, index) => [stageName.toLowerCase(), index])
  );
  const sortedStages = [...(stages ?? [])].sort((a, b) => {
    const aRank = stageRank.get(a.name.toLowerCase()) ?? STAGE_ORDER.length;
    const bRank = stageRank.get(b.name.toLowerCase()) ?? STAGE_ORDER.length;
    return aRank - bRank || a.sort_order - b.sort_order;
  });

  return (
    <main className="min-h-dvh bg-forest-950 text-cream">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gold/20 bg-forest-950/95 px-4 py-2.5 backdrop-blur">
        <Link href="/map" className="font-display text-lg sm:text-xl">
          🐇 {FESTIVAL_NAME}
        </Link>
        <nav className="flex items-center gap-2">
          <DrinkRoundLink compact />
          <Link
            href="/map"
            className="rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-medium ring-1 ring-cream/15 transition hover:bg-forest-700"
          >
            Kaart
          </Link>
          <Link
            href="/settings"
            className="rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-medium ring-1 ring-cream/15 transition hover:bg-forest-700"
          >
            Profiel
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-[1600px] p-3 sm:p-5">
        <SchedulePlanner
          userId={user.id}
          acts={acts ?? []}
          stages={sortedStages}
          initialSelectedActIds={(picks ?? [])
            .filter((pick) => pick.user_id === user.id)
            .map((pick) => pick.act_id)}
          initialSharedSelections={sharedSelections}
          allRabbits={allRabbits}
          rabbit={rabbit}
          displayName={profile.display_name}
        />
      </div>
    </main>
  );
}
