// Hand-maintained types mirroring supabase/migrations. Keep in sync with the SQL.

export type RabbitBreed = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  marker_color: string;
};

export type Profile = {
  id: string;
  display_name: string;
  rabbit_breed_id: number | null;
  avatar_url: string | null;
  share_location: boolean;
  created_at: string;
};

export type OwntracksDevice = {
  id: string;
  user_id: string;
  username: string;
  secret_hash: string;
  created_at: string;
};

export type LocationRow = {
  user_id: string;
  lat: number;
  lon: number;
  accuracy: number | null;
  battery: number | null;
  tst: number;
  updated_at: string;
};

export type Stage = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  color: string;
  sort_order: number;
};

export type Act = {
  id: number;
  stage_id: number;
  artist_name: string;
  start_time: string;
  end_time: string;
  clashfinder_id: string | null;
};

export type MapNote = {
  id: number;
  user_id: string;
  text: string;
  map_x: number;
  map_y: number;
  expires_at: string | null;
  created_at: string;
};

export type Encounter = {
  id: number;
  user_low: string;
  user_high: string;
  created_at: string;
};

export type Candy = {
  id: number;
  user_id: string;
  breed_id: number | null;
  source: string;
  encounter_id: number | null;
  created_at: string;
};

export type BreedScore = {
  id: number;
  name: string;
  image_url: string;
  marker_color: string;
  candies: number;
};

export type Database = {
  public: {
    Tables: {
      rabbit_breeds: {
        Row: RabbitBreed;
        Insert: Partial<RabbitBreed> & { name: string; image_url: string };
        Update: Partial<RabbitBreed>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; display_name: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      owntracks_devices: {
        Row: OwntracksDevice;
        Insert: Partial<OwntracksDevice> & {
          user_id: string;
          username: string;
          secret_hash: string;
        };
        Update: Partial<OwntracksDevice>;
        Relationships: [];
      };
      locations: {
        Row: LocationRow;
        Insert: Partial<LocationRow> & {
          user_id: string;
          lat: number;
          lon: number;
          tst: number;
        };
        Update: Partial<LocationRow>;
        Relationships: [];
      };
      stages: {
        Row: Stage;
        Insert: Partial<Stage> & { name: string; lat: number; lon: number };
        Update: Partial<Stage>;
        Relationships: [];
      };
      acts: {
        Row: Act;
        Insert: Partial<Act> & {
          stage_id: number;
          artist_name: string;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Act>;
        Relationships: [];
      };
      map_notes: {
        Row: MapNote;
        Insert: Partial<MapNote> & {
          user_id: string;
          text: string;
          map_x: number;
          map_y: number;
        };
        Update: Partial<MapNote>;
        Relationships: [];
      };
      encounters: {
        Row: Encounter;
        Insert: Partial<Encounter> & { user_low: string; user_high: string };
        Update: Partial<Encounter>;
        Relationships: [];
      };
      candies: {
        Row: Candy;
        Insert: Partial<Candy> & { user_id: string };
        Update: Partial<Candy>;
        Relationships: [];
      };
    };
    Views: {
      breed_scores: {
        Row: BreedScore;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
