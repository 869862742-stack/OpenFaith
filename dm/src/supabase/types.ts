export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          password_hash: string
          role: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash: string
          role?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          password_hash?: string
          role?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          admin_id: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_words: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          level: string | null
          word: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          word: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          word?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          chapters: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          religion: string
        }
        Insert: {
          chapters?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          religion: string
        }
        Update: {
          chapters?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          religion?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          ai_flag_reason: string | null
          content: string
          created_at: string | null
          id: string
          is_ai_flagged: boolean | null
          likes: number | null
          parent_id: string | null
          post_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_flag_reason?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_ai_flagged?: boolean | null
          likes?: number | null
          parent_id?: string | null
          post_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_flag_reason?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_ai_flagged?: boolean | null
          likes?: number | null
          parent_id?: string | null
          post_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exp_logs: {
        Row: {
          action: string
          created_at: string | null
          exp_gained: number
          id: string
          new_level: number | null
          old_level: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          exp_gained: number
          id?: string
          new_level?: number | null
          old_level?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          exp_gained?: number
          id?: string
          new_level?: number | null
          old_level?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exp_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_tag_requests: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tag_name: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tag_name: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tag_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_tag_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_tag_requests_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_resets: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          ai_flag_reason: string | null
          comments: number | null
          content: string | null
          cover_image: string | null
          created_at: string | null
          hot_score: number | null
          id: string
          images: string[] | null
          is_ai_flagged: boolean | null
          likes: number | null
          share_count: number | null
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          ai_flag_reason?: string | null
          comments?: number | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          hot_score?: number | null
          id?: string
          images?: string[] | null
          is_ai_flagged?: boolean | null
          likes?: number | null
          share_count?: number | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          ai_flag_reason?: string | null
          comments?: number | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          hot_score?: number | null
          id?: string
          images?: string[] | null
          is_ai_flagged?: boolean | null
          likes?: number | null
          share_count?: number | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          background_url: string | null
          bio: string | null
          created_at: string | null
          downloads_count: number | null
          email: string
          experience: number | null
          exposure_cards: number | null
          faith_tag: string
          followers_count: number | null
          following_count: number | null
          groups_created: number | null
          heat_count: number | null
          hot_points: number | null
          id: string
          is_animated_avatar: boolean | null
          is_vip: boolean | null
          level: number | null
          likes_count: number | null
          sticky_cards: number | null
          tag_last_modified_at: string | null
          theme_color: string | null
          theme_mode: string | null
          updated_at: string | null
          username: string
          vip_exp_multiplier: number | null
        }
        Insert: {
          avatar_url?: string | null
          background_url?: string | null
          bio?: string | null
          created_at?: string | null
          downloads_count?: number | null
          email: string
          experience?: number | null
          exposure_cards?: number | null
          faith_tag: string
          followers_count?: number | null
          following_count?: number | null
          groups_created?: number | null
          heat_count?: number | null
          hot_points?: number | null
          id: string
          is_animated_avatar?: boolean | null
          is_vip?: boolean | null
          level?: number | null
          likes_count?: number | null
          sticky_cards?: number | null
          tag_last_modified_at?: string | null
          theme_color?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          username: string
          vip_exp_multiplier?: number | null
        }
        Update: {
          avatar_url?: string | null
          background_url?: string | null
          bio?: string | null
          created_at?: string | null
          downloads_count?: number | null
          email?: string
          experience?: number | null
          exposure_cards?: number | null
          faith_tag?: string
          followers_count?: number | null
          following_count?: number | null
          groups_created?: number | null
          heat_count?: number | null
          hot_points?: number | null
          id?: string
          is_animated_avatar?: boolean | null
          is_vip?: boolean | null
          level?: number | null
          likes_count?: number | null
          sticky_cards?: number | null
          tag_last_modified_at?: string | null
          theme_color?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          username?: string
          vip_exp_multiplier?: number | null
        }
        Relationships: []
      }
      religions: {
        Row: {
          classics: string | null
          core_belief: string | null
          created_at: string | null
          distribution: string | null
          doctrines: string | null
          famous_figures: string | null
          festivals: string | null
          followers_scale: string | null
          history: string | null
          id: string
          introduction: string | null
          is_active: boolean | null
          name: string
          origin_place: string | null
          origin_time: string | null
          rituals: string | null
          sacred_sites: string | null
          taboos: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          classics?: string | null
          core_belief?: string | null
          created_at?: string | null
          distribution?: string | null
          doctrines?: string | null
          famous_figures?: string | null
          festivals?: string | null
          followers_scale?: string | null
          history?: string | null
          id?: string
          introduction?: string | null
          is_active?: boolean | null
          name: string
          origin_place?: string | null
          origin_time?: string | null
          rituals?: string | null
          sacred_sites?: string | null
          taboos?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          classics?: string | null
          core_belief?: string | null
          created_at?: string | null
          distribution?: string | null
          doctrines?: string | null
          famous_figures?: string | null
          festivals?: string | null
          followers_scale?: string | null
          history?: string | null
          id?: string
          introduction?: string | null
          is_active?: boolean | null
          name?: string
          origin_place?: string | null
          origin_time?: string | null
          rituals?: string | null
          sacred_sites?: string | null
          taboos?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_id: string | null
          admin_note: string | null
          created_at: string | null
          description: string | null
          id: string
          processed_at: string | null
          reason: string
          reporter_id: string | null
          status: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          admin_id?: string | null
          admin_note?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          processed_at?: string | null
          reason: string
          reporter_id?: string | null
          status?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          admin_id?: string | null
          admin_note?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          processed_at?: string | null
          reason?: string
          reporter_id?: string | null
          status?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scriptures: {
        Row: {
          book_id: string | null
          chapter: number
          content: string
          created_at: string | null
          id: string
          translation: string | null
          verse: number
        }
        Insert: {
          book_id?: string | null
          chapter: number
          content: string
          created_at?: string | null
          id?: string
          translation?: string | null
          verse: number
        }
        Update: {
          book_id?: string | null
          chapter?: number
          content?: string
          created_at?: string | null
          id?: string
          translation?: string | null
          verse?: number
        }
        Relationships: [
          {
            foreignKeyName: "scriptures_book_id_fkey"
            columns: ["book_id"]
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          post_count: number | null
          requires_review: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          post_count?: number | null
          requires_review?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          post_count?: number | null
          requires_review?: boolean | null
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          admin_id: string | null
          content: string
          created_at: string | null
          id: string
          is_from_admin: boolean | null
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_from_admin?: boolean | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_from_admin?: boolean | null
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_replies_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          admin_id: string | null
          category: string
          content: string
          created_at: string | null
          id: string
          is_vip_priority: boolean | null
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_vip_priority?: boolean | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_vip_priority?: boolean | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_rdsvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      rds_float_normalize_i16: {
        Args: { "": unknown }
        Returns: unknown
      }
      rds_vector_norm: {
        Args: { "": string }
        Returns: number
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
