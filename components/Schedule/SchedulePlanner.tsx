"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Act, Stage } from "@/lib/database.types";

const TIME_ZONE = "Europe/Amsterdam";
const DAY_CUTOFF_HOURS = 6;
const HOUR_HEIGHT = 84;

type Rabbit = {
  image_url: string;
  marker_color: string;
};

export type ScheduleRabbit = Rabbit & {
  user_id: string;
  display_name: string;
};

export type SharedActSelection = {
  act_id: number;
  rabbit: ScheduleRabbit;
};

function festivalDayKey(iso: string) {
  const shifted = new Date(
    new Date(iso).getTime() - DAY_CUTOFF_HOURS * 60 * 60 * 1000
  );
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

function dayLabel(key: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${key}T12:00:00Z`));
}

function timeLabel(value: string | number) {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function overlaps(a: Act, b: Act) {
  return (
    new Date(a.start_time).getTime() < new Date(b.end_time).getTime() &&
    new Date(b.start_time).getTime() < new Date(a.end_time).getTime()
  );
}

export default function SchedulePlanner({
  userId,
  acts,
  stages,
  initialSelectedActIds,
  initialSharedSelections,
  allRabbits,
  rabbit,
  displayName,
}: {
  userId: string;
  acts: Act[];
  stages: Stage[];
  initialSelectedActIds: number[];
  initialSharedSelections: SharedActSelection[];
  allRabbits: ScheduleRabbit[];
  rabbit: Rabbit;
  displayName: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(initialSelectedActIds)
  );
  const [pendingIds, setPendingIds] = useState(() => new Set<number>());
  const [sharedSelections, setSharedSelections] = useState(
    initialSharedSelections
  );
  const [onlyMine, setOnlyMine] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rabbitByUserId = useMemo(
    () => new Map(allRabbits.map((member) => [member.user_id, member])),
    [allRabbits]
  );

  useEffect(() => {
    const channel = supabase
      .channel("shared-schedule-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_act_selections",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as { user_id: string; act_id: number };
            const member = rabbitByUserId.get(row.user_id);
            if (!member) return;
            setSharedSelections((current) => {
              const exists = current.some(
                (selection) =>
                  selection.act_id === row.act_id &&
                  selection.rabbit.user_id === row.user_id
              );
              return exists
                ? current
                : [...current, { act_id: row.act_id, rabbit: member }];
            });
          }

          if (payload.eventType === "DELETE") {
            const row = payload.old as { user_id: string; act_id: number };
            setSharedSelections((current) =>
              current.filter(
                (selection) =>
                  selection.act_id !== row.act_id ||
                  selection.rabbit.user_id !== row.user_id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rabbitByUserId, supabase]);

  const days = useMemo(
    () =>
      [...new Set(acts.map((act) => festivalDayKey(act.start_time)))].sort(),
    [acts]
  );
  const [activeDay, setActiveDay] = useState(() => days[0] ?? "");

  const selectedActs = useMemo(
    () => acts.filter((act) => selectedIds.has(act.id)),
    [acts, selectedIds]
  );
  const conflictIds = useMemo(() => {
    const conflicts = new Set<number>();
    for (let i = 0; i < selectedActs.length; i++) {
      for (let j = i + 1; j < selectedActs.length; j++) {
        if (overlaps(selectedActs[i], selectedActs[j])) {
          conflicts.add(selectedActs[i].id);
          conflicts.add(selectedActs[j].id);
        }
      }
    }
    return conflicts;
  }, [selectedActs]);

  const allActsForDay = acts.filter(
    (act) => festivalDayKey(act.start_time) === activeDay
  );
  const visibleActs = allActsForDay.filter(
    (act) => !onlyMine || selectedIds.has(act.id)
  );
  const stageIds = new Set(allActsForDay.map((act) => act.stage_id));
  const dayStages = stages.filter((stage) => stageIds.has(stage.id));

  const dayStart =
    allActsForDay.length > 0
      ? Math.floor(
          Math.min(
            ...allActsForDay.map((act) => new Date(act.start_time).getTime())
          ) /
            (60 * 60 * 1000)
        ) *
        60 *
        60 *
        1000
      : 0;
  const dayEnd =
    allActsForDay.length > 0
      ? Math.ceil(
          Math.max(
            ...allActsForDay.map((act) => new Date(act.end_time).getTime())
          ) /
            (60 * 60 * 1000)
        ) *
        60 *
        60 *
        1000
      : 0;
  const totalHours = Math.max(1, (dayEnd - dayStart) / (60 * 60 * 1000));
  const timelineHeight = totalHours * HOUR_HEIGHT;

  async function toggleAct(actId: number) {
    if (pendingIds.has(actId)) return;

    const wasSelected = selectedIds.has(actId);
    setError(null);
    setPendingIds((current) => new Set(current).add(actId));
    setSelectedIds((current) => {
      const next = new Set(current);
      if (wasSelected) next.delete(actId);
      else next.add(actId);
      return next;
    });
    setSharedSelections((current) => {
      if (wasSelected) {
        return current.filter(
          (selection) =>
            selection.act_id !== actId || selection.rabbit.user_id !== userId
        );
      }
      return [
        ...current,
        {
          act_id: actId,
          rabbit: {
            user_id: userId,
            display_name: displayName,
            image_url: rabbit.image_url,
            marker_color: rabbit.marker_color,
          },
        },
      ];
    });

    const result = wasSelected
      ? await supabase
          .from("user_act_selections")
          .delete()
          .eq("user_id", userId)
          .eq("act_id", actId)
      : await supabase
          .from("user_act_selections")
          .insert({ user_id: userId, act_id: actId });

    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(actId);
      return next;
    });

    if (result.error) {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (wasSelected) next.add(actId);
        else next.delete(actId);
        return next;
      });
      setSharedSelections((current) => {
        if (wasSelected) {
          return [
            ...current,
            {
              act_id: actId,
              rabbit: {
                user_id: userId,
                display_name: displayName,
                image_url: rabbit.image_url,
                marker_color: rabbit.marker_color,
              },
            },
          ];
        }
        return current.filter(
          (selection) =>
            selection.act_id !== actId || selection.rabbit.user_id !== userId
        );
      });
      setError("Je keuze kon niet worden opgeslagen. Probeer het nog eens.");
    }
  }

  if (acts.length === 0) {
    return (
      <div className="rounded-2xl bg-forest-900 p-8 text-center ring-1 ring-gold/20">
        <p className="font-display text-xl">Nog geen blokkenschema</p>
        <p className="mt-2 text-sm text-cream/65">
          Importeer eerst de Clashfinder-data om je programma samen te stellen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-forest-900 p-4 ring-1 ring-gold/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gold-bright">
              Het blokkenschema
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl">
              Zet je konijn bij je favoriete acts
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-forest-800 px-3 py-2 text-sm ring-1 ring-cream/10">
              <span className="font-semibold text-gold-bright">
                {selectedIds.size}
              </span>{" "}
              gekozen
            </div>
            <button
              type="button"
              aria-pressed={onlyMine}
              onClick={() => setOnlyMine((current) => !current)}
              className={`rounded-xl px-3 py-2 text-sm ring-1 transition ${
                onlyMine
                  ? "bg-gold text-forest-950 ring-gold"
                  : "bg-forest-800 text-cream ring-cream/15 hover:ring-gold/70"
              }`}
            >
              {onlyMine ? "Mijn programma" : "Alle acts"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm capitalize transition ${
                activeDay === day
                  ? "bg-gold font-semibold text-forest-950"
                  : "bg-forest-800 text-cream/70 hover:text-cream"
              }`}
            >
              {dayLabel(day)}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {conflictIds.size > 0 && (
          <p className="mt-3 text-xs text-amber-200">
            ⚠ {conflictIds.size} gekozen acts overlappen met een andere keuze.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl bg-forest-900 ring-1 ring-gold/20">
        <div className="max-h-[calc(100dvh-15rem)] min-h-[32rem] overflow-auto">
          <div
            className="min-w-max"
            style={{ width: 76 + dayStages.length * 220 }}
          >
            <div className="sticky top-0 z-30 flex h-16 border-b border-cream/10 bg-forest-950/95 backdrop-blur">
              <div className="sticky left-0 z-40 w-[76px] shrink-0 border-r border-cream/10 bg-forest-950" />
              {dayStages.map((stage) => (
                <div
                  key={stage.id}
                  className="flex w-[220px] shrink-0 items-center gap-2 border-r border-cream/10 px-3"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-cream/70"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="truncate font-display text-sm">
                    {stage.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex">
              <div
                className="sticky left-0 z-20 w-[76px] shrink-0 border-r border-cream/10 bg-forest-950/95"
                style={{ height: timelineHeight }}
              >
                {Array.from({ length: totalHours + 1 }, (_, index) => (
                  <span
                    key={index}
                    className="absolute right-3 -translate-y-1/2 text-xs tabular-nums text-cream/55"
                    style={{ top: index * HOUR_HEIGHT }}
                  >
                    {timeLabel(dayStart + index * 60 * 60 * 1000)}
                  </span>
                ))}
              </div>

              {dayStages.map((stage) => (
                <div
                  key={stage.id}
                  className="relative w-[220px] shrink-0 border-r border-cream/10"
                  style={{
                    height: timelineHeight,
                    backgroundImage:
                      "linear-gradient(to bottom, rgba(244,236,218,.09) 1px, transparent 1px)",
                    backgroundSize: `100% ${HOUR_HEIGHT}px`,
                  }}
                >
                  {visibleActs
                    .filter((act) => act.stage_id === stage.id)
                    .map((act) => {
                      const selected = selectedIds.has(act.id);
                      const pending = pendingIds.has(act.id);
                      const conflict = conflictIds.has(act.id);
                      const top =
                        ((new Date(act.start_time).getTime() - dayStart) /
                          (60 * 60 * 1000)) *
                        HOUR_HEIGHT;
                      const duration =
                        (new Date(act.end_time).getTime() -
                          new Date(act.start_time).getTime()) /
                        (60 * 60 * 1000);
                      const height = Math.max(56, duration * HOUR_HEIGHT - 4);
                      const attending = sharedSelections.filter(
                        (selection) => selection.act_id === act.id
                      );

                      return (
                        <button
                          key={act.id}
                          type="button"
                          aria-pressed={selected}
                          aria-label={`${act.artist_name}: ${
                            selected
                              ? "verwijder je konijn"
                              : "zet je konijn bij deze act"
                          }`}
                          disabled={pending}
                          onClick={() => toggleAct(act.id)}
                          className={`absolute left-1.5 right-1.5 overflow-hidden rounded-xl border p-2 text-left shadow-lg transition ${
                            selected
                              ? conflict
                                ? "border-amber-300 bg-amber-100 text-forest-950 ring-2 ring-amber-300/60"
                                : "border-gold bg-cream text-forest-950 ring-2 ring-gold/55"
                              : "border-cream/10 bg-forest-800/95 text-cream hover:border-gold/60 hover:bg-forest-700"
                          } ${pending ? "opacity-60" : ""}`}
                          style={{ top, height }}
                        >
                          <div className="h-full min-w-0">
                              <p className="text-[10px] font-semibold leading-none tabular-nums opacity-65">
                                {timeLabel(act.start_time)}–
                                {timeLabel(act.end_time)}
                              </p>
                              <p
                                className="mt-1 line-clamp-2 break-words text-[13px] font-semibold leading-[1.05]"
                                title={act.artist_name}
                              >
                                {act.artist_name}
                              </p>
                              {conflict && selected && (
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                  ⚠ Overlap
                                </p>
                              )}
                              {attending.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {attending.map((selection) => (
                                    <span
                                      key={selection.rabbit.user_id}
                                      title={selection.rabbit.display_name}
                                      className="block h-6 w-6 rounded-full bg-cream shadow-sm ring-2"
                                      style={{
                                        color:
                                          selection.rabbit.marker_color,
                                        boxShadow:
                                          "0 1px 3px rgba(0,0,0,.25)",
                                      }}
                                    >
                                      <Image
                                        src={selection.rabbit.image_url}
                                        alt={selection.rabbit.display_name}
                                        width={24}
                                        height={24}
                                        className="h-full w-full rounded-full ring-2 ring-current"
                                      />
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
