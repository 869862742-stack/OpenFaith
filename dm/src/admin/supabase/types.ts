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
          continent: string | null
          country: string | null
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
          region: string | null
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
          continent?: string | null
          country?: string | null
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
          region?: string | null
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
          continent?: string | null
          country?: string | null
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
          region?: string | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
