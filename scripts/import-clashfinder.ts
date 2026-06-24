/**
 * Import a festival schedule into the stages/acts tables from a Clashfinder
 * data export (JSON).
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-clashfinder.ts path/to/export.json
 *
 * Get the export by opening the clashfinder and using Export → JSON, or the
 * data endpoint (the API now requires an account: https://clashfinder.com/pages/api/).
 *
 * Expected shape (tolerant — common Clashfinder/ClashfinderML export):
 *   { "locations": [ { "name": "Main Stage",
 *       "events": [ { "name": "Artist", "start": "...", "end": "..." } ] } ] }
 * `start`/`end` may be ISO datetimes, "YYYY-MM-DD HH:mm", or UNIX seconds.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types.ts";
import { MAP_CENTER } from "../lib/festival-map.ts";

type CfEvent = { name?: string; start?: string | number; end?: string | number };
type CfLocation = { name?: string; events?: CfEvent[] };
type CfExport = { locations?: CfLocation[] };

function parseTime(v: string | number | undefined): string | null {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v * 1000).toISOString();
  // "YYYY-MM-DD HH:mm" → ISO-ish; let Date handle the rest.
  const d = new Date(v.includes("T") ? v : v.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: import-clashfinder.ts <export.json>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const data: CfExport = JSON.parse(readFileSync(file, "utf8"));
  const locations = data.locations ?? [];
  if (locations.length === 0) {
    console.error("No `locations` found in export.");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });

  let stageCount = 0;
  let actCount = 0;

  for (const loc of locations) {
    const stageName = loc.name?.trim();
    if (!stageName) continue;

    // Match an existing stage case-insensitively so e.g. "REX" attaches to the
    // positioned "REX" marker instead of creating a duplicate.
    const { data: existing } = await supabase
      .from("stages")
      .select("id")
      .ilike("name", stageName)
      .maybeSingle();

    let stageId = existing?.id;
    if (!stageId) {
      // Unknown stage: drop it at the map centre so its acts still show; you can
      // position it later in scripts/stage-positions.ts + reconcile-stages.ts.
      const { data: inserted, error } = await supabase
        .from("stages")
        .insert({ name: stageName, lat: MAP_CENTER[0], lon: MAP_CENTER[1] })
        .select("id")
        .single();
      if (error) {
        console.error(`Stage "${stageName}" insert failed: ${error.message}`);
        continue;
      }
      stageId = inserted.id;
    }
    stageCount++;

    const acts = (loc.events ?? [])
      .map((ev) => {
        const start = parseTime(ev.start);
        const end = parseTime(ev.end);
        if (!ev.name || !start || !end) return null;
        return {
          stage_id: stageId!,
          artist_name: ev.name.trim(),
          start_time: start,
          end_time: end,
          clashfinder_id: `${stageName}|${ev.name.trim()}|${start}`,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    if (acts.length > 0) {
      const { error } = await supabase
        .from("acts")
        .upsert(acts, { onConflict: "clashfinder_id" });
      if (error) {
        console.error(`Acts for "${stageName}" failed: ${error.message}`);
        continue;
      }
      actCount += acts.length;
    }
  }

  console.log(`Imported ${actCount} acts across ${stageCount} stages.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
