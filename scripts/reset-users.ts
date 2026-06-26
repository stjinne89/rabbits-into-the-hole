/**
 * Clean slate: remove ALL members and their data.
 *   node --env-file=.env.local scripts/reset-users.ts
 *
 * Order matters: drink_rounds/selections have RESTRICT FKs to profiles, so they
 * go first; then deleting every auth user cascades profiles → locations,
 * candies, encounters, map_notes, user_act_selections and owntracks_devices.
 * Reference data (breeds, stages, acts, drink_items) is kept.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types.ts";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// 1. Clear drink rounds (selections cascade via round_id).
await db.from("drink_round_selections").delete().not("round_id", "is", null);
await db.from("drink_rounds").delete().not("id", "is", null);

// 2. Delete every auth user — cascades all per-user data.
let deleted = 0;
for (;;) {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    console.error("listUsers:", error.message);
    break;
  }
  if (!data.users.length) break;
  for (const u of data.users) {
    const { error: delErr } = await db.auth.admin.deleteUser(u.id);
    if (delErr) console.error(`delete ${u.id}: ${delErr.message}`);
    else deleted++;
  }
}

const counts: Record<string, number | null> = {};
for (const t of ["profiles", "locations", "candies", "encounters", "map_notes"] as const) {
  const { count } = await db.from(t).select("*", { count: "exact", head: true });
  counts[t] = count;
}
console.log(`Deleted ${deleted} users. Remaining:`, counts);
