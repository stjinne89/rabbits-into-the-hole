"use client";

import Image from "next/image";
import { useState } from "react";
import type { RabbitBreed } from "@/lib/database.types";

/**
 * Collapsed breed picker: shows the current choice as a button; the grid of
 * breeds (with their festival-goer descriptions) only opens when clicked.
 */
export default function BreedSelect({
  breeds,
  value,
  onChange,
}: {
  breeds: RabbitBreed[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = breeds.find((b) => b.id === value) ?? null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-lg bg-forest-800 px-3 py-2.5 text-left ring-1 ring-cream/15 transition hover:ring-cream/30"
      >
        {selected ? (
          <>
            <Image
              src={selected.image_url}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-sm text-cream">
                {selected.name}
              </span>
              {selected.description && (
                <span className="block truncate text-xs text-cream/60">
                  {selected.description}
                </span>
              )}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-cream/70">
            Kies je festivalkonijn…
          </span>
        )}
        <span className="text-cream/50">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {breeds.map((b) => {
            const isSel = b.id === value;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onChange(b.id);
                  setOpen(false);
                }}
                aria-pressed={isSel}
                className={`flex min-h-44 flex-col items-center rounded-xl p-4 text-center ring-2 transition ${
                  isSel
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
                {b.description && (
                  <span className="mt-2 text-xs leading-snug text-cream/70">
                    {b.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
