import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseBasicAuth, verifySecret } from "@/lib/owntracks-auth";

// OwnTracks posts JSON; never cache.
export const dynamic = "force-dynamic";

const UNAUTHORIZED = NextResponse.json(
  { error: "unauthorized" },
  { status: 401, headers: { "WWW-Authenticate": 'Basic realm="owntracks"' } }
);

export async function POST(request: NextRequest) {
  const creds = parseBasicAuth(request.headers.get("authorization"));
  if (!creds) return UNAUTHORIZED;

  const admin = createAdminClient();
  const { data: device } = await admin
    .from("owntracks_devices")
    .select("user_id, secret_hash")
    .eq("username", creds.username)
    .maybeSingle();

  if (!device || !verifySecret(creds.password, device.secret_hash)) {
    return UNAUTHORIZED;
  }

  const payload = await request.json().catch(() => null);

  // Only persist location reports; acknowledge everything else with [].
  if (
    payload &&
    payload._type === "location" &&
    typeof payload.lat === "number" &&
    typeof payload.lon === "number"
  ) {
    await admin.from("locations").upsert(
      {
        user_id: device.user_id,
        lat: payload.lat,
        lon: payload.lon,
        accuracy: typeof payload.acc === "number" ? payload.acc : null,
        battery: typeof payload.batt === "number" ? payload.batt : null,
        tst:
          typeof payload.tst === "number"
            ? payload.tst
            : Math.floor(Date.now() / 1000),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  // OwnTracks expects a JSON array (of friend cards/locations) in response.
  return NextResponse.json([]);
}
