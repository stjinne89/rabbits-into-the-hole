import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type MapMember = {
  user_id: string;
  display_name: string;
  lat: number;
  lon: number;
  tst: number;
  image_url: string;
  marker_color: string;
};

type Row = {
  user_id: string;
  lat: number;
  lon: number;
  tst: number;
  profiles: {
    display_name: string;
    rabbit_breeds: { image_url: string; marker_color: string } | null;
  } | null;
};

/**
 * Fetch every shareable member location with their profile + breed avatar.
 * RLS already restricts `locations` to rows the viewer is allowed to see.
 */
export async function fetchMembers(
  supabase: SupabaseClient<Database>
): Promise<MapMember[]> {
  const { data, error } = await supabase
    .from("locations")
    .select(
      "user_id, lat, lon, tst, profiles!inner(display_name, rabbit_breeds!inner(image_url, marker_color))"
    )
    .overrideTypes<Row[]>();

  if (error || !data) return [];

  return data
    .filter((r) => r.profiles?.rabbit_breeds)
    .map((r) => ({
      user_id: r.user_id,
      lat: r.lat,
      lon: r.lon,
      tst: r.tst,
      display_name: r.profiles!.display_name,
      image_url: r.profiles!.rabbit_breeds!.image_url,
      marker_color: r.profiles!.rabbit_breeds!.marker_color,
    }));
}
