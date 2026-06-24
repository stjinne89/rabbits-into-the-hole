import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OwntracksConfig from "@/components/OwntracksConfig";

export default async function OwntracksSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: device } = await supabase
    .from("owntracks_devices")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const endpoint = `${base.replace(/\/$/, "")}/api/owntracks`;

  return (
    <main className="flex flex-1 justify-center bg-forest-950 px-4 py-10 text-cream">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl">OwnTracks</h1>
          <Link
            href="/settings"
            className="text-sm text-gold hover:text-gold-bright"
          >
            ← Instellingen
          </Link>
        </div>
        <div className="rounded-2xl bg-forest-900 p-6 ring-1 ring-gold/20">
          <OwntracksConfig hasDevice={!!device} endpoint={endpoint} />
        </div>
      </div>
    </main>
  );
}
