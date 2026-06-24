/**
 * Apply the plattegrond-derived stages to the database (service role).
 *   node --env-file=.env.local scripts/apply-stages.ts
 * Aborts if acts already exist (deleting stages would cascade-delete them).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types.ts";
import { deriveStages } from "./stage-positions.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient<Database>(url, key, { auth: { persistSession: false } });

const { count } = await db
  .from("acts")
  .select("*", { count: "exact", head: true });
if (count && count > 0) {
  console.error(`Aborting: ${count} acts exist. Reposition stages manually instead.`);
  process.exit(1);
}

await db.from("stages").delete().gt("id", 0);
const { error } = await db.from("stages").insert(deriveStages());
if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}

const { data } = await db
  .from("stages")
  .select("name, lat, lon, sort_order")
  .order("sort_order");
console.log("Stages now in DB:");
console.table(data);
