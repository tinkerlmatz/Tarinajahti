export type StoryCategory = "historia" | "legenda" | "muisto";

export type SuggestionStatus = "pending" | "approved" | "rejected";

export interface GameBoard {
  id: string;
  name: string;
  description: string | null;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  boundary: unknown | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Story {
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
  created_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  distance_walked_meters: number;
  distance_cycled_meters: number;
  tutorial_seen: boolean;
  created_at: string;
}

export interface DiscoveredStory {
  id: string;
  user_id: string;
  story_id: string;
  discovered_at: string;
}

export interface StorySuggestion {
  id: string;
  board_id: string;
  suggested_by: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: StoryCategory;
  status: SuggestionStatus;
  xp_bonus_given: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      game_boards: {
        Row: GameBoard;
        Insert: Omit<GameBoard, "id" | "created_at"> &
          Partial<Pick<GameBoard, "id" | "created_at">>;
        Update: Partial<GameBoard>;
      };
      stories: {
        Row: Story;
        Insert: Omit<Story, "id" | "created_at"> &
          Partial<Pick<Story, "id" | "created_at">>;
        Update: Partial<Story>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> &
          Partial<Pick<Profile, "created_at">>;
        Update: Partial<Profile>;
      };
      discovered_stories: {
        Row: DiscoveredStory;
        Insert: Omit<DiscoveredStory, "id" | "discovered_at"> &
          Partial<Pick<DiscoveredStory, "id" | "discovered_at">>;
        Update: Partial<DiscoveredStory>;
      };
      story_suggestions: {
        Row: StorySuggestion;
        Insert: Omit<StorySuggestion, "id" | "created_at" | "status" | "xp_bonus_given"> &
          Partial<Pick<StorySuggestion, "id" | "created_at" | "status" | "xp_bonus_given">>;
        Update: Partial<StorySuggestion>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
