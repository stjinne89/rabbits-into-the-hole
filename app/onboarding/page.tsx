import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RabbitPicker from "@/components/RabbitPicker";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: breeds }, { data: profile }] = await Promise.all([
    supabase.from("rabbit_breeds").select("*").order("id"),
    supabase
      .from("profiles")
      .select("display_name, rabbit_breed_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return (
    <main className="flex flex-1 items-center justify-center bg-forest-950 px-4 py-10 text-cream">
      <div className="w-full max-w-lg rounded-2xl bg-forest-900 p-8 shadow-xl ring-1 ring-gold/20">
        <h1 className="font-display text-3xl">Welkom in het konijnenhol 🐇</h1>
        <p className="mt-2 mb-6 text-sm text-cream/70">
          Stel je profiel in zodat je vrienden je herkennen op de kaart.
        </p>
        <RabbitPicker
          userId={user.id}
          breeds={breeds ?? []}
          initialName={profile?.display_name ?? ""}
          initialBreedId={profile?.rabbit_breed_id ?? null}
        />
      </div>
    </main>
  );
}
