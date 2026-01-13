export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_goals: {
        Row: {
          achieved_minutes: number | null
          created_at: string | null
          date: string
          id: string
          target_minutes: number
          updated_at: string | null
          user_id: string
          videos_completed: number | null
        }
        Insert: {
          achieved_minutes?: number | null
          created_at?: string | null
          date?: string
          id?: string
          target_minutes: number
          updated_at?: string | null
          user_id: string
          videos_completed?: number | null
        }
        Update: {
          achieved_minutes?: number | null
          created_at?: string | null
          date?: string
          id?: string
          target_minutes?: number
          updated_at?: string | null
          user_id?: string
          videos_completed?: number | null
        }
        Relationships: []
      }
      playlists: {
        Row: {
          created_at: string | null
          custom_intent: string | null
          id: string
          intent: Database["public"]["Enums"]["video_intent"] | null
          thumbnail_url: string | null
          title: string
          total_videos: number | null
          updated_at: string | null
          user_id: string
          youtube_playlist_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_intent?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["video_intent"] | null
          thumbnail_url?: string | null
          title: string
          total_videos?: number | null
          updated_at?: string | null
          user_id: string
          youtube_playlist_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_intent?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["video_intent"] | null
          thumbnail_url?: string | null
          title?: string
          total_videos?: number | null
          updated_at?: string | null
          user_id?: string
          youtube_playlist_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          browser_notifications_enabled: boolean | null
          created_at: string | null
          daily_goal_minutes: number | null
          display_name: string | null
          exit_friction_enabled: boolean | null
          id: string
          silent_mode: boolean | null
          theme_preference: string | null
          updated_at: string | null
        }
        Insert: {
          browser_notifications_enabled?: boolean | null
          created_at?: string | null
          daily_goal_minutes?: number | null
          display_name?: string | null
          exit_friction_enabled?: boolean | null
          id: string
          silent_mode?: boolean | null
          theme_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          browser_notifications_enabled?: boolean | null
          created_at?: string | null
          daily_goal_minutes?: number | null
          display_name?: string | null
          exit_friction_enabled?: boolean | null
          id?: string
          silent_mode?: boolean | null
          theme_preference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skipped_sessions: {
        Row: {
          completed_minutes: number | null
          id: string
          planned_minutes: number | null
          reason: string | null
          skipped_at: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          completed_minutes?: number | null
          id?: string
          planned_minutes?: number | null
          reason?: string | null
          skipped_at?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          completed_minutes?: number | null
          id?: string
          planned_minutes?: number | null
          reason?: string | null
          skipped_at?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skipped_sessions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          channel_name: string | null
          completed_at: string | null
          created_at: string | null
          current_position_seconds: number | null
          custom_intent: string | null
          duration_seconds: number
          id: string
          intent: Database["public"]["Enums"]["video_intent"] | null
          playlist_id: string | null
          playlist_order: number | null
          status: Database["public"]["Enums"]["video_status"] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
          youtube_video_id: string
        }
        Insert: {
          channel_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_position_seconds?: number | null
          custom_intent?: string | null
          duration_seconds?: number
          id?: string
          intent?: Database["public"]["Enums"]["video_intent"] | null
          playlist_id?: string | null
          playlist_order?: number | null
          status?: Database["public"]["Enums"]["video_status"] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          youtube_video_id: string
        }
        Update: {
          channel_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          current_position_seconds?: number | null
          custom_intent?: string | null
          duration_seconds?: number
          id?: string
          intent?: Database["public"]["Enums"]["video_intent"] | null
          playlist_id?: string | null
          playlist_order?: number | null
          status?: Database["public"]["Enums"]["video_status"] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_playlist_fk"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_sessions: {
        Row: {
          actual_minutes: number | null
          committed_minutes: number
          end_position_seconds: number | null
          ended_at: string | null
          exit_reason: string | null
          id: string
          start_position_seconds: number | null
          started_at: string | null
          user_id: string
          video_id: string
          was_completed: boolean | null
        }
        Insert: {
          actual_minutes?: number | null
          committed_minutes: number
          end_position_seconds?: number | null
          ended_at?: string | null
          exit_reason?: string | null
          id?: string
          start_position_seconds?: number | null
          started_at?: string | null
          user_id: string
          video_id: string
          was_completed?: boolean | null
        }
        Update: {
          actual_minutes?: number | null
          committed_minutes?: number
          end_position_seconds?: number | null
          ended_at?: string | null
          exit_reason?: string | null
          id?: string
          start_position_seconds?: number | null
          started_at?: string | null
          user_id?: string
          video_id?: string
          was_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_sessions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      video_intent: "learning" | "career" | "curiosity" | "leisure" | "custom"
      video_status: "not_started" | "in_progress" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      video_intent: ["learning", "career", "curiosity", "leisure", "custom"],
      video_status: ["not_started", "in_progress", "completed"],
    },
  },
} as const
