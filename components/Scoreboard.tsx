"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BreedScore } from "@/lib/database.types";

export default function Scoreboard({
  initialScores,
}: {
  initialScores: BreedScore[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [scores, setScores] = useState<BreedScore[]>(() =>
    [...initialScores].sort(
      (a, b) => b.candies - a.candies || a.name.localeCompare(b.name)
    )
  );
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("breed_scores").select("*");
    if (data) {
      setScores(
        [...data].sort((a, b) => b.candies - a.candies || a.name.localeCompare(b.name))
      );
    }
  }, [supabase]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("candies-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candies" },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(load, 300);
        }
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  const total = scores.reduce((s, b) => s + b.candies, 0);

  return (
    <div className="absolute right-3 top-3 z-[1000] w-56 overflow-hidden rounded-xl bg-forest-900/92 text-cream shadow-xl ring-1 ring-gold/25 backdrop-blur">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 font-display text-base"
      >
        <span>🍬 Snoepjes per ras</span>
        <span className="text-cream/60">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ul className="max-h-[60vh] overflow-y-auto px-2 pb-2">
          {scores.map((b, i) => (
            <li
              key={b.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            >
              <span className="w-4 text-right text-xs text-cream/50">
                {i + 1}
              </span>
              <Image
                src={b.image_url}
                alt={b.name}
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <span className="flex-1 truncate text-sm">{b.name}</span>
              <span className="font-semibold tabular-nums">{b.candies}</span>
            </li>
          ))}
          {total === 0 && (
            <li className="px-2 py-2 text-xs text-cream/60">
              Nog geen snoepjes — laat konijnen samenkomen (&lt;10 m)!
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
