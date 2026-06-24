"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ShareLocationToggle({
  userId,
  initial,
}: {
  userId: string;
  initial: boolean;
}) {
  const supabase = createClient();
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ share_location: next })
      .eq("id", userId);
    setSaving(false);
    if (error) setOn(!next); // revert on failure
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-forest-800 p-4 ring-1 ring-cream/15">
      <div>
        <p className="text-sm font-medium text-cream">
          Down the Rabbit Hole gaan
        </p>
        <p className="text-xs text-cream/70">
          {on
            ? "Je konijn is vindbaar op de kaart."
            : "Je konijn is niet vindbaar op de kaart."}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={on}
        aria-label={
          on
            ? "Niet langer vindbaar zijn op de kaart"
            : "Vindbaar worden op de kaart"
        }
        className={`relative h-6 w-11 rounded-full transition ${
          on ? "bg-gold" : "bg-forest-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream transition ${
            on ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
