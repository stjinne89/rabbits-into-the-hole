"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BreedSelect from "@/components/BreedSelect";
import type { RabbitBreed } from "@/lib/database.types";

type Props = {
  userId: string;
  breeds: RabbitBreed[];
  initialName: string;
  initialBreedId: number | null;
  redirectTo?: string;
};

export default function RabbitPicker({
  userId,
  breeds,
  initialName,
  initialBreedId,
  redirectTo = "/map",
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [breedId, setBreedId] = useState<number | null>(initialBreedId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || breedId == null) {
      setError("Kies een naam én een konijnenras.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), rabbit_breed_id: breedId })
      .eq("id", userId);
    setSaving(false);
    if (error) return setError(error.message);
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div>
        <label className="block text-sm text-cream/70">Weergavenaam</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hoe heet je?"
          className="mt-1 w-full rounded-lg bg-forest-800 px-3 py-2 text-sm outline-none ring-1 ring-cream/15 focus:ring-gold"
        />
      </div>

      <div>
        <p className="text-sm text-cream/70">Welk festivalkonijn ben jij?</p>
        <div className="mt-2">
          <BreedSelect breeds={breeds} value={breedId} onChange={setBreedId} />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-gold-bright disabled:opacity-50"
      >
        {saving ? "Opslaan…" : "Opslaan"}
      </button>
    </div>
  );
}
