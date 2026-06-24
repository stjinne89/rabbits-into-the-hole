import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchMembers } from "@/lib/members";
import { fetchMapNotes } from "@/lib/map-notes";
import MapClient from "@/components/Map/MapClient";
import Scoreboard from "@/components/Scoreboard";
import { FESTIVAL_NAME } from "@/lib/festival-map";

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rabbit_breed_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.rabbit_breed_id) redirect("/onboarding");

  const [{ data: stages }, { data: acts }, { data: scores }, members, mapNotes] =
    await Promise.all([
      supabase.from("stages").select("*").order("sort_order"),
      supabase.from("acts").select("*").order("start_time"),
      supabase.from("breed_scores").select("*"),
      fetchMembers(supabase),
      fetchMapNotes(supabase),
    ]);

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-gold/20 bg-forest-950 px-4 py-2.5 text-cream">
        <span className="font-display text-xl">🐇 {FESTIVAL_NAME}</span>
        <Link
          href="/settings"
          className="rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-medium ring-1 ring-cream/15 transition hover:bg-forest-700"
        >
          Profiel & instellingen
        </Link>
      </header>
      <div className="relative min-h-0 flex-1">
        <MapClient
          currentUserId={user.id}
          stages={stages ?? []}
          acts={acts ?? []}
          initialMembers={members}
          initialMapNotes={mapNotes}
        />
        <Scoreboard initialScores={scores ?? []} />
      </div>
    </main>
  );
}
