"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
        <div className="mt-3 grid grid-cols-2 gap-3">
          {breeds.map((b) => {
            const selected = b.id === breedId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBreedId(b.id)}
                aria-pressed={selected}
                className={`flex min-h-48 flex-col items-center rounded-xl p-4 text-center ring-2 transition ${
                  selected
                    ? "bg-gold/20 ring-gold"
                    : "bg-forest-800 ring-transparent hover:ring-cream/30"
                }`}
              >
                <Image
                  src={b.image_url}
                  alt={b.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0"
                />
                <span className="mt-2 font-display text-xs text-cream">
                  {b.name}
                </span>
                <span className="mt-2 text-xs leading-snug text-cream/70">
                  {b.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-gold-bright disabled:opacity-50"
      >
        {saving ? "Opslaan…" : "Opslaan en naar de kaart"}
      </button>
    </div>
  );
}
