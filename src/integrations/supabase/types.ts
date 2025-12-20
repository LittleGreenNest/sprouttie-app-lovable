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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      daily_flashing_sessions: {
        Row: {
          cards_introduced: number | null
          cards_retired: number | null
          created_at: string | null
          id: string
          notes: string | null
          session_date: string
          session_occurred: boolean
          user_id: string
        }
        Insert: {
          cards_introduced?: number | null
          cards_retired?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          session_date: string
          session_occurred?: boolean
          user_id: string
        }
        Update: {
          cards_introduced?: number | null
          cards_retired?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          session_date?: string
          session_occurred?: boolean
          user_id?: string
        }
        Relationships: []
      }
      daily_tracking: {
        Row: {
          created_at: string | null
          date: string
          engagement: number | null
          flashcard_id: string
          flashed_at: string | null
          flashed_by: string | null
          id: string
          notes: string | null
          status: string
          time_of_day: string | null
          timezone: string | null
          user_id: string
          user_local_date: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          engagement?: number | null
          flashcard_id: string
          flashed_at?: string | null
          flashed_by?: string | null
          id?: string
          notes?: string | null
          status: string
          time_of_day?: string | null
          timezone?: string | null
          user_id: string
          user_local_date?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          engagement?: number | null
          flashcard_id?: string
          flashed_at?: string | null
          flashed_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          time_of_day?: string | null
          timezone?: string | null
          user_id?: string
          user_local_date?: string | null
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          active_day_count: number | null
          back: string
          card_status: string | null
          card_type: string
          created_at: string | null
          date_introduced: string | null
          date_retired: string | null
          folder: string | null
          front: string
          id: string
          last_reviewed_at: string | null
          mastery_level: number | null
          phrase_group: string | null
          review_count: number | null
          set_number: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_day_count?: number | null
          back: string
          card_status?: string | null
          card_type?: string
          created_at?: string | null
          date_introduced?: string | null
          date_retired?: string | null
          folder?: string | null
          front: string
          id?: string
          last_reviewed_at?: string | null
          mastery_level?: number | null
          phrase_group?: string | null
          review_count?: number | null
          set_number?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_day_count?: number | null
          back?: string
          card_status?: string | null
          card_type?: string
          created_at?: string | null
          date_introduced?: string | null
          date_retired?: string | null
          folder?: string | null
          front?: string
          id?: string
          last_reviewed_at?: string | null
          mastery_level?: number | null
          phrase_group?: string | null
          review_count?: number | null
          set_number?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          current_streak: number | null
          email: string
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          email: string
          id: string
          last_activity_date?: string | null
          longest_streak?: number | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          email?: string
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pronunciations: {
        Row: {
          audio_url: string | null
          created_at: string
          example_sentence: string | null
          id: string
          is_ai_generated: boolean
          is_free: boolean
          language: string
          phonetic: string | null
          updated_at: string
          word_id: string | null
          word_text: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          example_sentence?: string | null
          id?: string
          is_ai_generated?: boolean
          is_free?: boolean
          language: string
          phonetic?: string | null
          updated_at?: string
          word_id?: string | null
          word_text: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          example_sentence?: string | null
          id?: string
          is_ai_generated?: boolean
          is_free?: boolean
          language?: string
          phonetic?: string | null
          updated_at?: string
          word_id?: string | null
          word_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "pronunciations_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      spoken_words: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          started_saying_at: string
          user_id: string
          video_url: string | null
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          started_saying_at?: string
          user_id: string
          video_url?: string | null
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          started_saying_at?: string
          user_id?: string
          video_url?: string | null
          word?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          consent: boolean | null
          created_at: string | null
          email: string
          id: string
          source: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          consent?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          consent?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      word_plans: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          notes: string | null
          pinyin: string | null
          planned_date: string | null
          planned_week_start: string
          theme: string | null
          updated_at: string
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          notes?: string | null
          pinyin?: string | null
          planned_date?: string | null
          planned_week_start: string
          theme?: string | null
          updated_at?: string
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          notes?: string | null
          pinyin?: string | null
          planned_date?: string | null
          planned_week_start?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_streak: {
        Args: { user_timezone?: string; user_uuid: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
