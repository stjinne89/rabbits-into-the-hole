/**
 * Simulate members walking around the festival so you can watch the map update
 * live (via Supabase Realtime), as if OwnTracks phones were reporting.
 *
 *   node --env-file=.env.local scripts/simulate-movement.ts            # loop (Ctrl+C to stop)
 *   node --env-file=.env.local scripts/simulate-movement.ts --n=8 --interval=1500
 *   node --env-file=.env.local scripts/simulate-movement.ts --once     # one update + exit
 *   node --env-file=.env.local scripts/simulate-movement.ts --cleanup  # remove the sim users
 *
 * Creates throwaway auth users (sim-N@rabbits.sim) with a rabbit breed and
 * share_location=true. Locations wander within the stage area so the bunnies
 * appear on the plattegrond.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types.ts";

const arg = (k: string, d: number) => {
  const v = process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
  return v ? Number(v) : d;
};
const N = arg("n", 6);
const INTERVAL = arg("interval", 2000);
const ONCE = process.argv.includes("--once");
const CLEANUP = process.argv.includes("--cleanup");
const PREFIX = "sim-";
const DOMAIN = "@rabbits.sim";

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function listSimUsers() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return (data?.users ?? []).filter(
    (u) => u.email?.startsWith(PREFIX) && u.email?.endsWith(DOMAIN)
  );
}

if (CLEANUP) {
  const users = await listSimUsers();
  for (const u of users) await admin.auth.admin.deleteUser(u.id);
  console.log(`Removed ${users.length} sim users.`);
  process.exit(0);
}

const { data: breeds } = await admin.from("rabbit_breeds").select("id").order("id");
const { data: stages } = await admin.from("stages").select("lat, lon");
if (!breeds?.length || !stages?.length) {
  console.error("Need rabbit_breeds and stages seeded first.");
  process.exit(1);
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// Ensure N sim users exist.
let users = await listSimUsers();
for (let i = users.length; i < N; i++) {
  const email = `${PREFIX}${i + 1}${DOMAIN}`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
  });
  if (error) console.error(`create ${email}: ${error.message}`);
}
users = (await listSimUsers()).slice(0, N);

// Give each a breed, a name and enable sharing (profile row exists via trigger).
for (let i = 0; i < users.length; i++) {
  await admin
    .from("profiles")
    .update({
      display_name: `Sim Konijn ${i + 1}`,
      rabbit_breed_id: breeds[i % breeds.length].id,
      share_location: true,
    })
    .eq("id", users[i].id);
}

// Bunnies head to stages (and linger), so they actually gather within 10 m and
// earn candies. Targets are stage coordinates.
const pickStage = () => stages[Math.floor(Math.random() * stages.length)];

type Bunny = {
  id: string;
  lat: number;
  lon: number;
  tLat: number;
  tLon: number;
  linger: number;
};
const bunnies: Bunny[] = users.map((u) => {
  const s = pickStage();
  return { id: u.id, lat: s.lat, lon: s.lon, tLat: s.lat, tLon: s.lon, linger: 0 };
});

function step(b: Bunny) {
  const dLat = b.tLat - b.lat;
  const dLon = b.tLon - b.lon;
  const dist = Math.hypot(dLat, dLon);
  if (dist < 0.00006) {
    // Arrived at a stage: hang around a few ticks, then move on.
    if (b.linger > 0) {
      b.linger--;
      b.lat += rnd(-0.00002, 0.00002); // ~2 m shuffle
      b.lon += rnd(-0.00002, 0.00002);
    } else {
      const s = pickStage();
      b.tLat = s.lat;
      b.tLon = s.lon;
      b.linger = 5 + Math.floor(Math.random() * 10);
    }
    return;
  }
  const stepDeg = 0.00018; // ~15 m per tick
  b.lat += (dLat / dist) * Math.min(stepDeg, dist) + rnd(-0.00001, 0.00001);
  b.lon += (dLon / dist) * Math.min(stepDeg, dist) + rnd(-0.00001, 0.00001);
}

async function tick() {
  bunnies.forEach(step);
  const now = Math.floor(Date.now() / 1000);
  await admin.from("locations").upsert(
    bunnies.map((b) => ({
      user_id: b.id,
      lat: b.lat,
      lon: b.lon,
      tst: now,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id" }
  );
}

await tick();
if (ONCE) {
  console.log(`Placed ${bunnies.length} bunnies (one update).`);
  process.exit(0);
}

const iv = setInterval(() => tick().catch((e) => console.error(e)), INTERVAL);
process.on("SIGINT", () => {
  clearInterval(iv);
  console.log("\nStopped. Sim users kept — run with --cleanup to remove them.");
  process.exit(0);
});
console.log(
  `Simulating ${bunnies.length} bunnies every ${INTERVAL}ms. Open /map to watch. Ctrl+C to stop.`
);
