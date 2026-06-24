import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type MapNoteWithAuthor = {
  id: number;
  user_id: string;
  text: string;
  map_x: number;
  map_y: number;
  expires_at: string | null;
  created_at: string;
  display_name: string;
  image_url: string;
  marker_color: string;
};

type Row = {
  id: number;
  user_id: string;
  text: string;
  map_x: number;
  map_y: number;
  expires_at: string | null;
  created_at: string;
  profiles: {
    display_name: string;
    rabbit_breeds: {
      image_url: string;
      marker_color: string;
    } | null;
  } | null;
};

export async function fetchMapNotes(
  supabase: SupabaseClient<Database>
): Promise<MapNoteWithAuthor[]> {
  const { data, error } = await supabase
    .from("map_notes")
    .select(
      "id, user_id, text, map_x, map_y, expires_at, created_at, profiles!inner(display_name, rabbit_breeds!inner(image_url, marker_color))"
    )
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .overrideTypes<Row[]>();

  if (error || !data) return [];

  return data
    .filter((note) => note.profiles?.rabbit_breeds)
    .map((note) => ({
      id: note.id,
      user_id: note.user_id,
      text: note.text,
      map_x: note.map_x,
      map_y: note.map_y,
      expires_at: note.expires_at,
      created_at: note.created_at,
      display_name: note.profiles!.display_name,
      image_url: note.profiles!.rabbit_breeds!.image_url,
      marker_color: note.profiles!.rabbit_breeds!.marker_color,
    }));
}
