/**
 * Reconcile stages with the canonical plattegrond positions WITHOUT touching
 * acts: updates coordinates by name (or inserts), then removes leftover stages
 * that have no acts (e.g. old placeholders / duplicates).
 *   node --env-file=.env.local scripts/reconcile-stages.ts
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types.ts";
import { deriveStages } from "./stage-positions.ts";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const canonical = deriveStages();
const canonicalNames = new Set(canonical.map((s) => s.name));

// 1. Upsert canonical stages by name (preserves stage id + attached acts).
for (const s of canonical) {
  const { data: existing } = await db
    .from("stages")
    .select("id")
    .eq("name", s.name)
    .maybeSingle();
  if (existing) {
    await db
      .from("stages")
      .update({ lat: s.lat, lon: s.lon, color: s.color, sort_order: s.sort_order })
      .eq("id", existing.id);
  } else {
    await db.from("stages").insert(s);
  }
}

// 2. Remove leftover stages not in the canonical set — but only if empty.
const { data: all } = await db.from("stages").select("id, name");
for (const st of all ?? []) {
  if (canonicalNames.has(st.name)) continue;
  const { count } = await db
    .from("acts")
    .select("*", { count: "exact", head: true })
    .eq("stage_id", st.id);
  if ((count ?? 0) === 0) {
    await db.from("stages").delete().eq("id", st.id);
    console.log(`removed empty stage "${st.name}"`);
  } else {
    console.warn(`kept "${st.name}" — has ${count} acts (not in canonical list)`);
  }
}

console.log("done");
