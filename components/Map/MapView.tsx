"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { fetchMembers, type MapMember } from "@/lib/members";
import {
  fetchMapNotes,
  type MapNoteWithAuthor,
} from "@/lib/map-notes";
import { computeStageStatuses } from "@/lib/schedule";
import {
  fetchScheduleAttendees,
  type PlannedRabbit,
} from "@/lib/schedule-attendees";
import type { Act, Stage } from "@/lib/database.types";
import StagePanel from "@/components/NowPlaying/StagePanel";
import { LOCATION_FRESH_MS, PLATTEGROND_IMAGE } from "@/lib/festival-map";
import { IMAGE_BOUNDS, gpsToImageLatLng } from "@/lib/plattegrond";

function memberIcon(member: MapMember, isSelf: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<div class="rabbit-marker ${
      isSelf ? "rabbit-marker--self" : ""
    }" style="--c:${member.marker_color}">
        <img src="${member.image_url}" alt="" />
        <span class="rabbit-label">${escapeHtml(member.display_name)}</span>
      </div>`,
  });
}

function stageIcon(color: string, plannedRabbits: PlannedRabbit[]) {
  const visible = plannedRabbits.slice(0, 4);
  const remaining = plannedRabbits.length - visible.length;
  return L.divIcon({
    className: "",
    iconSize: [62, 46],
    iconAnchor: [31, 35],
    html: `<div class="stage-plan-marker">
      ${
        plannedRabbits.length > 0
          ? `<div class="stage-plan-rabbits">
              ${visible
                .map(
                  (rabbit) =>
                    `<img src="${rabbit.image_url}" alt="" style="--rabbit-color:${rabbit.marker_color}" />`
                )
                .join("")}
              ${remaining > 0 ? `<span>+${remaining}</span>` : ""}
            </div>`
          : ""
      }
      <div class="stage-marker" style="--c:${color}"></div>
    </div>`,
  });
}

function noteIcon(note: MapNoteWithAuthor) {
  const temporary = note.expires_at !== null;
  return L.divIcon({
    className: "",
    iconSize: [38, 46],
    iconAnchor: [19, 43],
    popupAnchor: [0, -40],
    html: `<div class="note-marker ${
      temporary ? "note-marker--temporary" : ""
    }" style="--c:${note.marker_color}">
      <img src="${note.image_url}" alt="" />
      <span>${temporary ? "⏳" : "✦"}</span>
    </div>`,
  });
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!
  );
}

function MapClickHandler({
  active,
  onPick,
}: {
  active: boolean;
  onPick: (position: { map_x: number; map_y: number }) => void;
}) {
  useMapEvents({
    click(event) {
      if (active) {
        onPick({ map_x: event.latlng.lng, map_y: event.latlng.lat });
      }
    },
  });
  return null;
}

function toDateTimeLocal(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Fit to the plattegrond and lock panning/zoom-out to its bounds. */
function FitToImage() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(IMAGE_BOUNDS);
    map.setMinZoom(map.getBoundsZoom(IMAGE_BOUNDS));
    map.setMaxBounds(IMAGE_BOUNDS);
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  return null;
}

export default function MapView({
  currentUserId,
  stages,
  acts,
  initialMembers,
  initialMapNotes,
  initialScheduleAttendees,
}: {
  currentUserId: string;
  stages: Stage[];
  acts: Act[];
  initialMembers: MapMember[];
  initialMapNotes: MapNoteWithAuthor[];
  initialScheduleAttendees: PlannedRabbit[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState<MapMember[]>(initialMembers);
  const [mapNotes, setMapNotes] =
    useState<MapNoteWithAuthor[]>(initialMapNotes);
  const [scheduleAttendees, setScheduleAttendees] = useState<PlannedRabbit[]>(
    initialScheduleAttendees
  );
  const [now, setNow] = useState<Date>(() => new Date());
  const [placing, setPlacing] = useState(false);
  const [position, setPosition] = useState<{
    map_x: number;
    map_y: number;
  } | null>(null);
  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState<"permanent" | "temporary">(
    "permanent"
  );
  const [expiresLocal, setExpiresLocal] = useState(() =>
    toDateTimeLocal(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Tick every second for the countdowns.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Live-update member locations via Supabase Realtime.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetchMembers(supabase).then(setMembers);
      }, 250);
    };
    const channel = supabase
      .channel("locations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        refresh
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Live-update rabbits that plan to attend acts.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetchScheduleAttendees(supabase).then(setScheduleAttendees);
      }, 250);
    };
    const channel = supabase
      .channel("map-schedule-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_act_selections",
        },
        refresh
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Live-update shared map notes.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetchMapNotes(supabase).then(setMapNotes);
      }, 250);
    };
    const channel = supabase
      .channel("map-notes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "map_notes" },
        refresh
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const freshMembers = members.filter(
    (m) => now.getTime() - m.tst * 1000 < LOCATION_FRESH_MS
  );

  const activeMapNotes = mapNotes.filter(
    (note) =>
      note.expires_at === null ||
      new Date(note.expires_at).getTime() > now.getTime()
  );

  const statuses = useMemo(
    () => computeStageStatuses(stages, acts, now),
    [stages, acts, now]
  );

  function startPlacing() {
    setPlacing(true);
    setPosition(null);
    setNoteError(null);
  }

  function cancelPlacing() {
    setPlacing(false);
    setPosition(null);
    setText("");
    setNoteError(null);
  }

  async function saveNote() {
    const trimmedText = text.trim();
    if (!position || !trimmedText) {
      setNoteError("Kies een plek en vul een tekst in.");
      return;
    }

    let expiresAt: string | null = null;
    if (noteType === "temporary") {
      const date = new Date(expiresLocal);
      if (
        !expiresLocal ||
        Number.isNaN(date.getTime()) ||
        date.getTime() <= Date.now()
      ) {
        setNoteError("Kies een moment in de toekomst.");
        return;
      }
      expiresAt = date.toISOString();
    }

    setSavingNote(true);
    setNoteError(null);
    const { error } = await supabase.from("map_notes").insert({
      user_id: currentUserId,
      text: trimmedText,
      map_x: position.map_x,
      map_y: position.map_y,
      expires_at: expiresAt,
    });
    setSavingNote(false);

    if (error) {
      setNoteError(error.message);
      return;
    }

    setMapNotes(await fetchMapNotes(supabase));
    cancelPlacing();
  }

  async function deleteNote(id: number) {
    const { error } = await supabase
      .from("map_notes")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUserId);
    if (!error) {
      setMapNotes((notes) => notes.filter((note) => note.id !== id));
    }
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={IMAGE_BOUNDS}
        maxBounds={IMAGE_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={-5}
        maxZoom={4}
        className={`h-full w-full ${placing && !position ? "cursor-crosshair" : ""}`}
      >
        <FitToImage />
        <MapClickHandler
          active={placing && position === null}
          onPick={setPosition}
        />
        <ImageOverlay url={PLATTEGROND_IMAGE} bounds={IMAGE_BOUNDS} />

        {statuses.map((status) => {
          const plannedRabbits = status.current
            ? scheduleAttendees.filter(
                (rabbit) => rabbit.act_id === status.current!.id
              )
            : [];
          const nextPlannedRabbits = status.next
            ? scheduleAttendees.filter(
                (rabbit) => rabbit.act_id === status.next!.id
              )
            : [];
          return (
            <Marker
              key={status.stage.id}
              position={gpsToImageLatLng(status.stage.lat, status.stage.lon)}
              icon={stageIcon(status.stage.color, plannedRabbits)}
            >
              <Popup>
                <StagePanel
                  status={status}
                  now={now}
                  plannedRabbits={plannedRabbits}
                  nextPlannedRabbits={nextPlannedRabbits}
                />
              </Popup>
            </Marker>
          );
        })}

        {activeMapNotes.map((note) => (
          <Marker
            key={`note-${note.id}`}
            position={[note.map_y, note.map_x]}
            icon={noteIcon(note)}
            zIndexOffset={500}
          >
            <Popup>
              <div className="min-w-44 text-zinc-900">
                <div className="flex items-center gap-2">
                  <Image
                    src={note.image_url}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full"
                  />
                  <p className="font-semibold">{note.display_name}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{note.text}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {note.expires_at
                    ? `Verdwijnt ${new Date(note.expires_at).toLocaleString(
                        "nl-NL",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}`
                    : "Permanente marker"}
                </p>
                {note.user_id === currentUserId && (
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900"
                  >
                    Marker verwijderen
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {position && (
          <Marker
            position={[position.map_y, position.map_x]}
            icon={L.divIcon({
              className: "",
              iconSize: [28, 36],
              iconAnchor: [14, 33],
              html: '<div class="note-marker note-marker--draft">+</div>',
            })}
            zIndexOffset={1500}
          />
        )}

        {freshMembers.map((m) => (
          <Marker
            key={m.user_id}
            position={gpsToImageLatLng(m.lat, m.lon)}
            icon={memberIcon(m, m.user_id === currentUserId)}
            zIndexOffset={m.user_id === currentUserId ? 1000 : 0}
          >
            <Popup>
              <div className="text-zinc-900">
                <p className="font-semibold">{m.display_name}</p>
                <p className="text-xs text-zinc-500">
                  Laatst gezien{" "}
                  {new Date(m.tst * 1000).toLocaleTimeString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!placing ? (
        <button
          type="button"
          onClick={startPlacing}
          className="absolute bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-forest-950 shadow-xl transition hover:bg-gold-bright"
        >
          + Marker plaatsen
        </button>
      ) : (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] mx-auto max-w-md rounded-2xl bg-forest-950/95 p-4 text-cream shadow-2xl ring-1 ring-gold/30 backdrop-blur">
          {!position ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm">Tik op de kaart waar je marker moet komen.</p>
              <button
                type="button"
                onClick={cancelPlacing}
                className="text-xs text-cream/70 hover:text-cream"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base">Nieuwe marker</h2>
                <button
                  type="button"
                  onClick={cancelPlacing}
                  className="text-xs text-cream/70 hover:text-cream"
                >
                  Annuleren
                </button>
              </div>

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={280}
                rows={3}
                autoFocus
                placeholder="Wat wil je hier achterlaten?"
                className="w-full resize-none rounded-lg bg-forest-800 px-3 py-2 text-sm outline-none ring-1 ring-cream/15 placeholder:text-cream/40 focus:ring-gold"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={noteType === "permanent"}
                  onClick={() => setNoteType("permanent")}
                  className={`rounded-lg px-3 py-2 text-xs ring-1 transition ${
                    noteType === "permanent"
                      ? "bg-gold/20 text-gold-bright ring-gold"
                      : "bg-forest-800 text-cream/70 ring-cream/15"
                  }`}
                >
                  ✦ Permanent
                </button>
                <button
                  type="button"
                  aria-pressed={noteType === "temporary"}
                  onClick={() => setNoteType("temporary")}
                  className={`rounded-lg px-3 py-2 text-xs ring-1 transition ${
                    noteType === "temporary"
                      ? "bg-gold/20 text-gold-bright ring-gold"
                      : "bg-forest-800 text-cream/70 ring-cream/15"
                  }`}
                >
                  ⏳ Verdwijnend
                </button>
              </div>

              {noteType === "temporary" && (
                <label className="block text-xs text-cream/70">
                  Verdwijnt op
                  <input
                    type="datetime-local"
                    value={expiresLocal}
                    min={toDateTimeLocal(
                      new Date(now.getTime() + 60_000)
                    )}
                    onChange={(event) => setExpiresLocal(event.target.value)}
                    className="mt-1 w-full rounded-lg bg-forest-800 px-3 py-2 text-sm text-cream outline-none ring-1 ring-cream/15 focus:ring-gold"
                  />
                </label>
              )}

              {noteError && (
                <p className="text-xs text-red-300">{noteError}</p>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPosition(null)}
                  className="text-xs text-cream/70 hover:text-cream"
                >
                  Andere plek kiezen
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={savingNote || !text.trim()}
                  className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-forest-950 transition hover:bg-gold-bright disabled:opacity-50"
                >
                  {savingNote ? "Plaatsen…" : "Marker plaatsen"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
