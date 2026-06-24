import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon
     * - the OwnTracks ingest endpoint (authenticated via HTTP Basic, not cookies)
     * - static asset files
     */
    "/((?!_next/static|_next/image|favicon.ico|api/owntracks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
