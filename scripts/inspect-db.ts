/** Show stages with their coordinates and act counts. Read-only. */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types.ts";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const { data: stages } = await db
  .from("stages")
  .select("id, name, lat, lon")
  .order("id");

const rows = [];
for (const s of stages ?? []) {
  const { count } = await db
    .from("acts")
    .select("*", { count: "exact", head: true })
    .eq("stage_id", s.id);
  rows.push({ id: s.id, name: s.name, lat: s.lat, lon: s.lon, acts: count ?? 0 });
}
console.table(rows);
const { count: total } = await db
  .from("acts")
  .select("*", { count: "exact", head: true });
console.log("total acts:", total);
