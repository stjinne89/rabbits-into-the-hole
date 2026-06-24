import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateSecret, hashSecret } from "@/lib/owntracks-auth";

export const dynamic = "force-dynamic";

/** (Re)generate OwnTracks HTTP credentials for the logged-in user. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const username = `rabbit_${randomBytes(4).toString("hex")}`;
  const secret = generateSecret();

  const admin = createAdminClient();
  const { error } = await admin.from("owntracks_devices").upsert(
    {
      user_id: user.id,
      username,
      secret_hash: hashSecret(secret),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The plaintext secret is returned only here — never stored or shown again.
  return NextResponse.json({ username, secret });
}
