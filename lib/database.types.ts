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

export type UserActSelection = {
  user_id: string;
  act_id: number;
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

export type DrinkItem = {
  id: number;
  name: string;
  category: string;
  sort_order: number;
  active: boolean;
};

export type DrinkRoundStatus = "open" | "collecting" | "completed";

export type DrinkRound = {
  id: string;
  collector_id: string;
  status: DrinkRoundStatus;
  created_at: string;
  collecting_at: string | null;
  completed_at: string | null;
};

export type DrinkRoundSelection = {
  round_id: string;
  recipient_id: string;
  drink_item_id: number;
  quantity: number;
  updated_by: string;
  updated_at: string;
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
      user_act_selections: {
        Row: UserActSelection;
        Insert: Partial<UserActSelection> & {
          user_id: string;
          act_id: number;
        };
        Update: Partial<UserActSelection>;
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
      drink_items: {
        Row: DrinkItem;
        Insert: Partial<DrinkItem> & {
          name: string;
          category: string;
        };
        Update: Partial<DrinkItem>;
        Relationships: [];
      };
      drink_rounds: {
        Row: DrinkRound;
        Insert: Partial<DrinkRound> & { collector_id: string };
        Update: Partial<DrinkRound>;
        Relationships: [];
      };
      drink_round_selections: {
        Row: DrinkRoundSelection;
        Insert: Partial<DrinkRoundSelection> & {
          round_id: string;
          recipient_id: string;
          drink_item_id: number;
          quantity: number;
          updated_by: string;
        };
        Update: Partial<DrinkRoundSelection>;
        Relationships: [];
      };
    };
    Views: {
      breed_scores: {
        Row: BreedScore;
        Relationships: [];
      };
    };
    Functions: {
      start_drink_round: {
        Args: Record<PropertyKey, never>;
        Returns: DrinkRound;
      };
      change_drink_quantity: {
        Args: {
          p_round_id: string;
          p_recipient_id: string;
          p_drink_item_id: number;
          p_delta: number;
        };
        Returns: number;
      };
      advance_drink_round: {
        Args: { p_round_id: string };
        Returns: DrinkRound;
      };
      add_drink_item: {
        Args: {
          p_name: string;
          p_category: string;
        };
        Returns: DrinkItem;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
