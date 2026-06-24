"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DrinkRoundStatus } from "@/lib/database.types";

export default function DrinkRoundLink({
  compact = false,
}: {
  compact?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<DrinkRoundStatus | null>(null);

  const loadStatus = useCallback(async () => {
    const { data } = await supabase
      .from("drink_rounds")
      .select("status")
      .in("status", ["open", "collecting"])
      .maybeSingle();
    setStatus(data?.status ?? null);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("drink-round-navigation")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drink_rounds" },
        loadStatus
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          void loadStatus();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStatus, supabase]);

  const activeLabel = status === "collecting" ? "Wordt gehaald" : "Open";

  return (
    <Link
      href="/drinks"
      className={
        compact
          ? "relative rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-medium ring-1 ring-cream/15 transition hover:bg-forest-700"
          : "relative text-sm text-gold transition hover:text-gold-bright"
      }
      aria-label={status ? `Rondje: ${activeLabel}` : "Rondje halen"}
    >
      Rondje
      {status && (
        <span
          className={`absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full ring-2 ring-forest-950 ${
            status === "collecting"
              ? "animate-pulse bg-amber-300"
              : "bg-emerald-400"
          }`}
          title={activeLabel}
        >
          <span className="sr-only">{activeLabel}</span>
        </span>
      )}
    </Link>
  );
}
