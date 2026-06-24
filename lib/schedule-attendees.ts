import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type PlannedRabbit = {
  act_id: number;
  user_id: string;
  display_name: string;
  image_url: string;
  marker_color: string;
};

type Row = {
  act_id: number;
  user_id: string;
  profiles: {
    display_name: string;
    rabbit_breeds: {
      image_url: string;
      marker_color: string;
    } | null;
  } | null;
};

export async function fetchScheduleAttendees(
  supabase: SupabaseClient<Database>
): Promise<PlannedRabbit[]> {
  const { data, error } = await supabase
    .from("user_act_selections")
    .select(
      "act_id, user_id, profiles!inner(display_name, rabbit_breeds!inner(image_url, marker_color))"
    )
    .overrideTypes<Row[]>();

  if (error || !data) return [];

  return data
    .filter((row) => row.profiles?.rabbit_breeds)
    .map((row) => ({
      act_id: row.act_id,
      user_id: row.user_id,
      display_name: row.profiles!.display_name,
      image_url: row.profiles!.rabbit_breeds!.image_url,
      marker_color: row.profiles!.rabbit_breeds!.marker_color,
    }));
}
