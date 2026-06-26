"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BreedSelect from "@/components/BreedSelect";
import type { RabbitBreed } from "@/lib/database.types";

/** No-login entry: pick a nickname + rabbit, get an anonymous session, go. */
export default function EntryForm({ breeds }: { breeds: RabbitBreed[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [breedId, setBreedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || breedId == null) {
      setError("Vul een nickname in en kies een konijn.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: authErr } = await supabase.auth.signInAnonymously();
    if (authErr || !data.user) {
      setLoading(false);
      setError(
        "Binnenkomen lukte niet. Staat 'Anonymous sign-ins' aan in Supabase?"
      );
      return;
    }

    const { error: pErr } = await supabase.from("profiles").upsert({
      id: data.user.id,
      display_name: name.trim(),
      rabbit_breed_id: breedId,
    });
    setLoading(false);
    if (pErr) return setError(pErr.message);

    router.replace("/map");
    router.refresh();
  }

  return (
    <form onSubmit={enter} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm text-cream/70">Nickname</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hoe noemen je vrienden je?"
          maxLength={40}
          className="mt-1 w-full rounded-lg bg-forest-800 px-3 py-2 text-sm outline-none ring-1 ring-cream/15 focus:ring-gold"
        />
      </div>

      <div>
        <label className="block text-sm text-cream/70">Jouw konijn</label>
        <div className="mt-1">
          <BreedSelect breeds={breeds} value={breedId} onChange={setBreedId} />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-gold-bright disabled:opacity-50"
      >
        {loading ? "Bezig…" : "Naar binnen"}
      </button>
    </form>
  );
}
