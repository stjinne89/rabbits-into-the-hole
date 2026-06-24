"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      }}
      className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-medium text-cream ring-1 ring-cream/15 transition hover:bg-forest-700"
    >
      Uitloggen
    </button>
  );
}
