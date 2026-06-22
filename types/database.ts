export type StoryCategory = "historia" | "legenda" | "muisto";

export type SuggestionStatus = "pending" | "approved" | "rejected";

// HUOM: nämä on määriteltävä `type`-aliaksina, EI `interface`-muodossa.
// Interface ei ole yhteensopiva Record<string, unknown>:n kanssa (ei implisiittistä
// index-signaturea), jolloin supabase-js:n GenericSchema-rajoite ei täyty ja
// taulutyypit resolvoituvat `never`:ksi.

export type GameBoard = {
  id: string;
  name: string;
  city: string | null;
  description: string | null;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  boundary: unknown | null;
  start_date: string | null;
  end_date: string | null;
  loot_title: string | null;
  loot_description: string | null;
  loot_image_url: string | null;
  created_at: string;
};

export type Story = {
  id: string;
  board_id: string;
  title: string;
  content: string;
  lat: number;
  lng: number;
  category: StoryCategory;
  xp_reward: number;
  discovery_radius_meters: number;
  image_url: string | null;
  external_link: string | null;
  video_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  distance_walked_meters: number;
  distance_cycled_meters: number;
  tutorial_seen: boolean;
  is_admin: boolean;
  created_at: string;
};

export type DiscoveredStory = {
  id: string;
  user_id: string;
  story_id: string;
  discovered_at: string;
};

export type StorySuggestion = {
  id: string;
  board_id: string;
  suggested_by: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: StoryCategory;
  image_url: string | null;
  video_url: string | null;
  image_urls: string[] | null;
  video_urls: string[] | null;
  xp_reward: number | null;
  discovery_radius_meters: number | null;
  status: SuggestionStatus;
  xp_bonus_given: boolean;
  created_at: string;
};

export type AreaSuggestion = {
  id: string;
  suggested_by: string;
  area_name: string;
  city: string;
  reason: string;
  status: SuggestionStatus;
  suggestion_count: number;
  created_at: string;
};

// --- Insert-tyypit ---

export type GameBoardInsert = {
  id?: string;
  name: string;
  city?: string | null;
  description?: string | null;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  boundary?: unknown | null;
  start_date?: string | null;
  end_date?: string | null;
  loot_title?: string | null;
  loot_description?: string | null;
  loot_image_url?: string | null;
  created_at?: string;
};

export type StoryInsert = {
  id?: string;
  board_id: string;
  title: string;
  content: string;
  lat: number;
  lng: number;
  category: StoryCategory;
  xp_reward: number;
  discovery_radius_meters: number;
  image_url?: string | null;
  external_link?: string | null;
  video_url?: string | null;
  created_by?: string | null;
  created_at?: string;
};

export type ProfileInsert = {
  id: string;
  username: string;
  avatar_url?: string | null;
  total_xp?: number;
  distance_walked_meters?: number;
  distance_cycled_meters?: number;
  tutorial_seen?: boolean;
  is_admin?: boolean;
  created_at?: string;
};

export type DiscoveredStoryInsert = {
  id?: string;
  user_id: string;
  story_id: string;
  discovered_at?: string;
};

export type StorySuggestionInsert = {
  id?: string;
  board_id: string;
  suggested_by: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: StoryCategory;
  image_url?: string | null;
  video_url?: string | null;
  image_urls?: string[] | null;
  video_urls?: string[] | null;
  xp_reward?: number | null;
  discovery_radius_meters?: number | null;
  status?: SuggestionStatus;
  xp_bonus_given?: boolean;
  created_at?: string;
};

export type AreaSuggestionInsert = {
  id?: string;
  suggested_by: string;
  area_name: string;
  city: string;
  reason: string;
  status?: SuggestionStatus;
  suggestion_count?: number;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      game_boards: {
        Row: GameBoard;
        Insert: GameBoardInsert;
        Update: Partial<GameBoardInsert>;
        Relationships: [];
      };
      stories: {
        Row: Story;
        Insert: StoryInsert;
        Update: Partial<StoryInsert>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      discovered_stories: {
        Row: DiscoveredStory;
        Insert: DiscoveredStoryInsert;
        Update: Partial<DiscoveredStoryInsert>;
        Relationships: [];
      };
      story_suggestions: {
        Row: StorySuggestion;
        Insert: StorySuggestionInsert;
        Update: Partial<StorySuggestionInsert>;
        Relationships: [];
      };
      area_suggestions: {
        Row: AreaSuggestion;
        Insert: AreaSuggestionInsert;
        Update: Partial<AreaSuggestionInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
