export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          location: string | null;
          wechat_id: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          wechat_id?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          location?: string | null;
          wechat_id?: string | null;
          bio?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      places: {
        Row: {
          id: string;
          source: string;
          source_place_id: string | null;
          name: string;
          address: string | null;
          city: string;
          district: string | null;
          adcode: string | null;
          amap_lng: number | null;
          amap_lat: number | null;
          coordinate_system: string;
          poi_type: string | null;
          verification_status: string;
          raw_provider_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          source_place_id?: string | null;
          name: string;
          address?: string | null;
          city: string;
          district?: string | null;
          adcode?: string | null;
          amap_lng?: number | null;
          amap_lat?: number | null;
          coordinate_system?: string;
          poi_type?: string | null;
          verification_status?: string;
          raw_provider_data?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["places"]["Insert"]>;
        Relationships: [];
      };
      routes: {
        Row: {
          id: string;
          owner_id: string;
          explore_mode: string;
          title: string;
          city: string;
          route_date: string | null;
          start_time: string | null;
          end_time: string | null;
          status: string;
          visibility: string;
          theme_filters: Json;
          preferences: Json;
          generation_summary: Json | null;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          explore_mode: string;
          title: string;
          city: string;
          route_date?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          status?: string;
          visibility?: string;
          theme_filters?: Json;
          preferences?: Json;
          generation_summary?: Json | null;
          version?: number;
        };
        Update: Partial<Database["public"]["Tables"]["routes"]["Insert"]>;
        Relationships: [];
      };
      route_stops: {
        Row: {
          id: string;
          route_id: string;
          place_id: string | null;
          sort_order: number;
          arrival_time: string | null;
          stay_minutes: number;
          constraint_type: string;
          source_type: string;
          title_snapshot: string;
          note: Json;
          walking_from_previous: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          place_id?: string | null;
          sort_order: number;
          arrival_time?: string | null;
          stay_minutes?: number;
          constraint_type?: string;
          source_type?: string;
          title_snapshot: string;
          note?: Json;
          walking_from_previous?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["route_stops"]["Insert"]>;
        Relationships: [];
      };
      route_shares: {
        Row: {
          id: string;
          route_id: string;
          share_code: string;
          route_version: number;
          allow_copy: boolean;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          share_code?: string;
          route_version?: number;
          allow_copy?: boolean;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["route_shares"]["Insert"]>;
        Relationships: [];
      };
      route_snapshots: {
        Row: {
          id: string;
          route_id: string;
          version: number;
          snapshot: Json;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          route_id: string;
          version: number;
          snapshot: Json;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["route_snapshots"]["Insert"]
        >;
        Relationships: [];
      };
      route_ai_runs: {
        Row: {
          id: string;
          route_id: string | null;
          user_id: string;
          action: string;
          provider: string;
          model: string;
          prompt_version: string;
          schema_version: string;
          status: string;
          input_payload: Json;
          output_payload: Json | null;
          error_message: string | null;
          input_tokens: number;
          output_tokens: number;
          estimated_cost_cny: number;
          elapsed_ms: number;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          route_id?: string | null;
          user_id: string;
          action: string;
          provider: string;
          model: string;
          prompt_version: string;
          schema_version?: string;
          status?: string;
          input_payload?: Json;
          output_payload?: Json | null;
          error_message?: string | null;
          input_tokens?: number;
          output_tokens?: number;
          estimated_cost_cny?: number;
          elapsed_ms?: number;
          idempotency_key?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["route_ai_runs"]["Insert"]
        >;
        Relationships: [];
      };
      route_candidates: {
        Row: {
          id: string;
          route_id: string;
          place_id: string | null;
          generated_by_run_id: string | null;
          source: string;
          source_place_id: string | null;
          title_snapshot: string;
          candidate_place: Json;
          place_type: string;
          themes: Json;
          status: string;
          fit_band: string;
          score: number;
          insertion_index: number;
          detour_minutes: number;
          detour_meters: number;
          stay_minutes: number;
          reasons: Json;
          risks: Json;
          cache_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          place_id?: string | null;
          generated_by_run_id?: string | null;
          source: string;
          source_place_id?: string | null;
          title_snapshot: string;
          candidate_place?: Json;
          place_type: string;
          themes?: Json;
          status?: string;
          fit_band: string;
          score?: number;
          insertion_index?: number;
          detour_minutes?: number;
          detour_meters?: number;
          stay_minutes?: number;
          reasons?: Json;
          risks?: Json;
          cache_key: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["route_candidates"]["Insert"]
        >;
        Relationships: [];
      };
      route_checkin_photos: {
        Row: {
          id: string;
          route_id: string;
          stop_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          byte_size: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          route_id: string;
          stop_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          byte_size?: number;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["route_checkin_photos"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
