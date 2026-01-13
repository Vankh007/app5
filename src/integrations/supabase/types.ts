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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ad_analytics: {
        Row: {
          ad_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          ad_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_analytics_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_frequency_settings: {
        Row: {
          cooldown_period_minutes: number
          created_at: string
          enable_frequency_control: boolean
          id: string
          max_shows_per_session: number
          min_interval_seconds: number
          placement: string
          updated_at: string
        }
        Insert: {
          cooldown_period_minutes?: number
          created_at?: string
          enable_frequency_control?: boolean
          id?: string
          max_shows_per_session?: number
          min_interval_seconds?: number
          placement: string
          updated_at?: string
        }
        Update: {
          cooldown_period_minutes?: number
          created_at?: string
          enable_frequency_control?: boolean
          id?: string
          max_shows_per_session?: number
          min_interval_seconds?: number
          placement?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ad_user_frequency_data: {
        Row: {
          created_at: string
          id: string
          last_shown_time: string | null
          placement: string
          session_start_time: string
          show_count: number
          updated_at: string
          user_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_shown_time?: string | null
          placement: string
          session_start_time?: string
          show_count?: number
          updated_at?: string
          user_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_shown_time?: string | null
          placement?: string
          session_start_time?: string
          show_count?: number
          updated_at?: string
          user_session_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          severity: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ads: {
        Row: {
          ad_code: string | null
          countdown_seconds: number | null
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          name: string
          page_location: string
          placement: string
          priority: number
          start_date: string | null
          updated_at: string
        }
        Insert: {
          ad_code?: string | null
          countdown_seconds?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          name: string
          page_location: string
          placement: string
          priority?: number
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          ad_code?: string | null
          countdown_seconds?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          name?: string
          page_location?: string
          placement?: string
          priority?: number
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_ad_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      app_ads: {
        Row: {
          ad_type: string
          ad_unit_id: string
          created_at: string
          end_date: string | null
          frequency_cap: number | null
          id: string
          is_active: boolean
          is_test_mode: boolean
          name: string
          placement: string
          platform: string
          priority: number
          reward_amount: number | null
          reward_type: string | null
          show_after_seconds: number | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          ad_type: string
          ad_unit_id: string
          created_at?: string
          end_date?: string | null
          frequency_cap?: number | null
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          name: string
          placement: string
          platform: string
          priority?: number
          reward_amount?: number | null
          reward_type?: string | null
          show_after_seconds?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          ad_type?: string
          ad_unit_id?: string
          created_at?: string
          end_date?: string | null
          frequency_cap?: number | null
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          name?: string
          placement?: string
          platform?: string
          priority?: number
          reward_amount?: number | null
          reward_type?: string | null
          show_after_seconds?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cast_credits: {
        Row: {
          cast_member_id: string | null
          character_name: string | null
          created_at: string
          department: string | null
          id: string
          job: string | null
          media_type: string
          poster_path: string | null
          release_date: string | null
          title: string
          tmdb_content_id: number
        }
        Insert: {
          cast_member_id?: string | null
          character_name?: string | null
          created_at?: string
          department?: string | null
          id?: string
          job?: string | null
          media_type: string
          poster_path?: string | null
          release_date?: string | null
          title: string
          tmdb_content_id: number
        }
        Update: {
          cast_member_id?: string | null
          character_name?: string | null
          created_at?: string
          department?: string | null
          id?: string
          job?: string | null
          media_type?: string
          poster_path?: string | null
          release_date?: string | null
          title?: string
          tmdb_content_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cast_credits_cast_member_id_fkey"
            columns: ["cast_member_id"]
            isOneToOne: false
            referencedRelation: "cast_members"
            referencedColumns: ["id"]
          },
        ]
      }
      cast_members: {
        Row: {
          biography: string | null
          birthday: string | null
          created_at: string
          gender: number | null
          homepage: string | null
          id: string
          imdb_id: string | null
          known_for_department: string | null
          name: string
          place_of_birth: string | null
          popularity: number | null
          profile_path: string | null
          tmdb_id: number
          updated_at: string
        }
        Insert: {
          biography?: string | null
          birthday?: string | null
          created_at?: string
          gender?: number | null
          homepage?: string | null
          id?: string
          imdb_id?: string | null
          known_for_department?: string | null
          name: string
          place_of_birth?: string | null
          popularity?: number | null
          profile_path?: string | null
          tmdb_id: number
          updated_at?: string
        }
        Update: {
          biography?: string | null
          birthday?: string | null
          created_at?: string
          gender?: number | null
          homepage?: string | null
          id?: string
          imdb_id?: string | null
          known_for_department?: string | null
          name?: string
          place_of_birth?: string | null
          popularity?: number | null
          profile_path?: string | null
          tmdb_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      certifications: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          backdrop_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_featured: boolean | null
          name: string
        }
        Insert: {
          backdrop_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          name: string
        }
        Update: {
          backdrop_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          name?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          interaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          interaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          interaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          content_id: string
          created_at: string
          dislikes: number
          episode_id: string | null
          id: string
          is_approved: boolean
          is_pinned: boolean
          likes: number
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          content_id: string
          created_at?: string
          dislikes?: number
          episode_id?: string | null
          id?: string
          is_approved?: boolean
          is_pinned?: boolean
          likes?: number
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          content_id?: string
          created_at?: string
          dislikes?: number
          episode_id?: string | null
          id?: string
          is_approved?: boolean
          is_pinned?: boolean
          likes?: number
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          access_type: Database["public"]["Enums"]["content_access_type"] | null
          backdrop_path: string | null
          cast_members: string | null
          certification_id: string | null
          collection_id: string | null
          content_type: string
          created_at: string | null
          creator_director: string | null
          currency: string | null
          embed_url: string | null
          exclude_from_plan: boolean | null
          genre: string | null
          id: string
          last_content_update: string | null
          max_devices: number | null
          network_id: string | null
          overview: string | null
          popularity: number | null
          poster_path: string | null
          price: number | null
          purchase_period: number | null
          recent_episode: string | null
          release_date: string | null
          release_year: string | null
          seasons: number | null
          status: string | null
          tagline: string | null
          title: string
          tmdb_id: number | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          access_type?:
            | Database["public"]["Enums"]["content_access_type"]
            | null
          backdrop_path?: string | null
          cast_members?: string | null
          certification_id?: string | null
          collection_id?: string | null
          content_type: string
          created_at?: string | null
          creator_director?: string | null
          currency?: string | null
          embed_url?: string | null
          exclude_from_plan?: boolean | null
          genre?: string | null
          id?: string
          last_content_update?: string | null
          max_devices?: number | null
          network_id?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          price?: number | null
          purchase_period?: number | null
          recent_episode?: string | null
          release_date?: string | null
          release_year?: string | null
          seasons?: number | null
          status?: string | null
          tagline?: string | null
          title: string
          tmdb_id?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          access_type?:
            | Database["public"]["Enums"]["content_access_type"]
            | null
          backdrop_path?: string | null
          cast_members?: string | null
          certification_id?: string | null
          collection_id?: string | null
          content_type?: string
          created_at?: string | null
          creator_director?: string | null
          currency?: string | null
          embed_url?: string | null
          exclude_from_plan?: boolean | null
          genre?: string | null
          id?: string
          last_content_update?: string | null
          max_devices?: number | null
          network_id?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          price?: number | null
          purchase_period?: number | null
          recent_episode?: string | null
          release_date?: string | null
          release_year?: string | null
          seasons?: number | null
          status?: string | null
          tagline?: string | null
          title?: string
          tmdb_id?: number | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
      content_interactions: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          interaction_type: string
          report_reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          interaction_type: string
          report_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          interaction_type?: string
          report_reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_interactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_media: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          media_type: string
          url: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          media_type: string
          url?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          media_type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_media_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_purchases: {
        Row: {
          content_id: string
          created_at: string
          expires_at: string
          id: string
          price: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          expires_at: string
          id?: string
          price: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          price?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_purchases_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sections: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          section_key: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          section_key: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          section_key?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_support: {
        Row: {
          amount: number
          content_id: string
          created_at: string
          episode_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          content_id: string
          created_at?: string
          episode_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          content_id?: string
          created_at?: string
          episode_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_support_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_support_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      content_views: {
        Row: {
          content_id: string
          created_at: string | null
          episode_id: string | null
          id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          episode_id?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          episode_id?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_views_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      device_sessions: {
        Row: {
          content_id: string
          created_at: string
          device_id: string
          device_info: Json | null
          id: string
          last_active: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          device_id: string
          device_info?: Json | null
          id?: string
          last_active?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          device_id?: string
          device_info?: Json | null
          id?: string
          last_active?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          access_type: Database["public"]["Enums"]["content_access_type"] | null
          air_date: string | null
          created_at: string | null
          currency: string | null
          duration: number | null
          episode_number: number
          id: string
          overview: string | null
          price: number | null
          season_id: string | null
          show_id: string
          still_path: string | null
          title: string
          tmdb_id: number | null
          updated_at: string | null
          version: string | null
          vote_average: number | null
        }
        Insert: {
          access_type?:
            | Database["public"]["Enums"]["content_access_type"]
            | null
          air_date?: string | null
          created_at?: string | null
          currency?: string | null
          duration?: number | null
          episode_number: number
          id?: string
          overview?: string | null
          price?: number | null
          season_id?: string | null
          show_id: string
          still_path?: string | null
          title: string
          tmdb_id?: number | null
          updated_at?: string | null
          version?: string | null
          vote_average?: number | null
        }
        Update: {
          access_type?:
            | Database["public"]["Enums"]["content_access_type"]
            | null
          air_date?: string | null
          created_at?: string | null
          currency?: string | null
          duration?: number | null
          episode_number?: number
          id?: string
          overview?: string | null
          price?: number | null
          season_id?: string | null
          show_id?: string
          still_path?: string | null
          title?: string
          tmdb_id?: number | null
          updated_at?: string | null
          version?: string | null
          vote_average?: number | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          content_id: string
          created_at: string
          id: string
          poster_path: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          poster_path?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          poster_path?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
          tmdb_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tmdb_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tmdb_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      languages: {
        Row: {
          created_at: string
          english_name: string | null
          id: string
          iso_639_1: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          english_name?: string | null
          id?: string
          iso_639_1?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          english_name?: string | null
          id?: string
          iso_639_1?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          app_purchase_code: string | null
          created_at: string
          currency: string
          device_limit: number
          duration: number
          duration_unit: string
          id: string
          is_active: boolean
          name: string
          price: number
          show_ads: boolean
          updated_at: string
        }
        Insert: {
          app_purchase_code?: string | null
          created_at?: string
          currency?: string
          device_limit?: number
          duration?: number
          duration_unit?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          show_ads?: boolean
          updated_at?: string
        }
        Update: {
          app_purchase_code?: string | null
          created_at?: string
          currency?: string
          device_limit?: number
          duration?: number
          duration_unit?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          show_ads?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      my_list: {
        Row: {
          added_at: string | null
          content_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          content_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          content_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "my_list_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      networks: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          md_hash: string | null
          payment_method: string
          payment_reference: string | null
          qr_code_data: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          md_hash?: string | null
          payment_method?: string
          payment_reference?: string | null
          qr_code_data?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          md_hash?: string | null
          payment_method?: string
          payment_reference?: string | null
          qr_code_data?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          content_id: string | null
          created_at: string
          currency: string
          expires_at: string
          md5: string
          metadata: Json | null
          paid_at: string | null
          status: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          content_id?: string | null
          created_at?: string
          currency?: string
          expires_at: string
          md5: string
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          content_id?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          md5?: string
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          bio: string | null
          city: string | null
          country: string | null
          cover_image: string | null
          date_of_birth: string | null
          email_notifications: boolean | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          profile_image: string | null
          updated_at: string | null
          username: string | null
          wallet_balance: number
        }
        Insert: {
          address?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_image?: string | null
          date_of_birth?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          profile_image?: string | null
          updated_at?: string | null
          username?: string | null
          wallet_balance?: number
        }
        Update: {
          address?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_image?: string | null
          date_of_birth?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          profile_image?: string | null
          updated_at?: string | null
          username?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      report_analytics: {
        Row: {
          auto_flagged_count: number | null
          avg_response_time_hours: number | null
          broken_link_reports: number | null
          copyright_reports: number | null
          created_at: string | null
          id: string
          inappropriate_reports: number | null
          other_reports: number | null
          pending_reports: number | null
          rejected_reports: number | null
          report_date: string
          resolved_reports: number | null
          spam_reports: number | null
          total_reports: number | null
          updated_at: string | null
          wrong_content_reports: number | null
        }
        Insert: {
          auto_flagged_count?: number | null
          avg_response_time_hours?: number | null
          broken_link_reports?: number | null
          copyright_reports?: number | null
          created_at?: string | null
          id?: string
          inappropriate_reports?: number | null
          other_reports?: number | null
          pending_reports?: number | null
          rejected_reports?: number | null
          report_date: string
          resolved_reports?: number | null
          spam_reports?: number | null
          total_reports?: number | null
          updated_at?: string | null
          wrong_content_reports?: number | null
        }
        Update: {
          auto_flagged_count?: number | null
          avg_response_time_hours?: number | null
          broken_link_reports?: number | null
          copyright_reports?: number | null
          created_at?: string | null
          id?: string
          inappropriate_reports?: number | null
          other_reports?: number | null
          pending_reports?: number | null
          rejected_reports?: number | null
          report_date?: string
          resolved_reports?: number | null
          spam_reports?: number | null
          total_reports?: number | null
          updated_at?: string | null
          wrong_content_reports?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          auto_flagged: boolean | null
          content_id: string | null
          created_at: string
          description: string
          episode_id: string | null
          flag_reason: string | null
          id: string
          priority: number | null
          report_type: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          auto_flagged?: boolean | null
          content_id?: string | null
          created_at?: string
          description: string
          episode_id?: string | null
          flag_reason?: string | null
          id?: string
          priority?: number | null
          report_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          auto_flagged?: boolean | null
          content_id?: string | null
          created_at?: string
          description?: string
          episode_id?: string | null
          flag_reason?: string | null
          id?: string
          priority?: number | null
          report_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          id: string
          overview: string | null
          poster_path: string | null
          season_number: number
          show_id: string
          title: string
          tmdb_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          overview?: string | null
          poster_path?: string | null
          season_number: number
          show_id: string
          title: string
          tmdb_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          overview?: string | null
          poster_path?: string | null
          season_number?: number
          show_id?: string
          title?: string
          tmdb_id?: number | null
        }
        Relationships: []
      }
      servers: {
        Row: {
          content_id: string
          created_at: string | null
          embed_source: string | null
          hls_source: string | null
          id: string
          mp4_source: string | null
          name: string
          quality: string
          video_source: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          embed_source?: string | null
          hls_source?: string | null
          id?: string
          mp4_source?: string | null
          name: string
          quality: string
          video_source?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          embed_source?: string | null
          hls_source?: string | null
          id?: string
          mp4_source?: string | null
          name?: string
          quality?: string
          video_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servers_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts: {
        Row: {
          content_id: string | null
          created_at: string
          description: string | null
          duration: number | null
          episode_id: string | null
          id: string
          season_id: string | null
          source_type: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          views: number
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          episode_id?: string | null
          id?: string
          season_id?: string | null
          source_type: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
          views?: number
        }
        Update: {
          content_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          episode_id?: string | null
          id?: string
          season_id?: string | null
          source_type?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "shorts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shorts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shorts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      slider_settings: {
        Row: {
          backdrop_path: string | null
          content_id: string | null
          content_type: string
          created_at: string | null
          description: string | null
          detail_endpoint: string | null
          id: string
          image_url: string | null
          position: number
          poster_path: string | null
          section: string
          status: string | null
          title: string
          trailer_self_hosted: string | null
          trailer_youtube_id: string | null
          updated_at: string | null
          watch_endpoint: string | null
        }
        Insert: {
          backdrop_path?: string | null
          content_id?: string | null
          content_type: string
          created_at?: string | null
          description?: string | null
          detail_endpoint?: string | null
          id?: string
          image_url?: string | null
          position: number
          poster_path?: string | null
          section: string
          status?: string | null
          title: string
          trailer_self_hosted?: string | null
          trailer_youtube_id?: string | null
          updated_at?: string | null
          watch_endpoint?: string | null
        }
        Update: {
          backdrop_path?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          detail_endpoint?: string | null
          id?: string
          image_url?: string | null
          position?: number
          poster_path?: string | null
          section?: string
          status?: string | null
          title?: string
          trailer_self_hosted?: string | null
          trailer_youtube_id?: string | null
          updated_at?: string | null
          watch_endpoint?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          plan_name: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          plan_name?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          plan_name?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trailers: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          self_hosted_url: string | null
          updated_at: string | null
          uploaded_path: string | null
          youtube_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          self_hosted_url?: string | null
          updated_at?: string | null
          uploaded_path?: string | null
          youtube_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          self_hosted_url?: string | null
          updated_at?: string | null
          uploaded_path?: string | null
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trailers_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_channels: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          logo: string | null
          name: string
          updated_at: string | null
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          logo?: string | null
          name: string
          updated_at?: string | null
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          logo?: string | null
          name?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      upcoming_releases: {
        Row: {
          backdrop_path: string | null
          content_id: string | null
          content_type: string
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          poster_path: string | null
          release_date: string
          status: string | null
          title: string
          tmdb_id: number | null
          updated_at: string | null
        }
        Insert: {
          backdrop_path?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          poster_path?: string | null
          release_date: string
          status?: string | null
          title: string
          tmdb_id?: number | null
          updated_at?: string | null
        }
        Update: {
          backdrop_path?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          poster_path?: string | null
          release_date?: string
          status?: string | null
          title?: string
          tmdb_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_releases_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      user_content_purchases: {
        Row: {
          active_devices: Json | null
          content_id: string
          created_at: string
          expires_at: string | null
          id: string
          max_devices: number
          purchase_date: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_devices?: Json | null
          content_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_devices?: number
          purchase_date?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_devices?: Json | null
          content_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_devices?: number
          purchase_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_content_purchases_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      user_control_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_memberships: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          membership_type: string
          started_at: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_type?: string
          started_at?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_type?: string
          started_at?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          wallet_balance: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
      user_reputation: {
        Row: {
          created_at: string | null
          helpful_reports: number | null
          id: string
          is_restricted: boolean | null
          last_report_at: string | null
          reputation_score: number | null
          spam_reports: number | null
          total_reports: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          helpful_reports?: number | null
          id?: string
          is_restricted?: boolean | null
          last_report_at?: string | null
          reputation_score?: number | null
          spam_reports?: number | null
          total_reports?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          helpful_reports?: number | null
          id?: string
          is_restricted?: boolean | null
          last_report_at?: string | null
          reputation_score?: number | null
          spam_reports?: number | null
          total_reports?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_ads: {
        Row: {
          click_url: string | null
          clicks: number | null
          created_at: string
          duration_seconds: number | null
          end_date: string | null
          id: string
          impressions: number | null
          is_active: boolean | null
          name: string
          placement: string
          priority: number | null
          skip_after_seconds: number | null
          start_date: string | null
          thumbnail_url: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          click_url?: string | null
          clicks?: number | null
          created_at?: string
          duration_seconds?: number | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          name: string
          placement?: string
          priority?: number | null
          skip_after_seconds?: number | null
          start_date?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          click_url?: string | null
          clicks?: number | null
          created_at?: string
          duration_seconds?: number | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          name?: string
          placement?: string
          priority?: number | null
          skip_after_seconds?: number | null
          start_date?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      video_licenses: {
        Row: {
          created_at: string | null
          encryption_type: string | null
          expires_at: string | null
          id: string
          key_id: string | null
          license_url: string | null
          updated_at: string | null
          video_source_id: string | null
        }
        Insert: {
          created_at?: string | null
          encryption_type?: string | null
          expires_at?: string | null
          id?: string
          key_id?: string | null
          license_url?: string | null
          updated_at?: string | null
          video_source_id?: string | null
        }
        Update: {
          created_at?: string | null
          encryption_type?: string | null
          expires_at?: string | null
          id?: string
          key_id?: string | null
          license_url?: string | null
          updated_at?: string | null
          video_source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_licenses_video_source_id_fkey"
            columns: ["video_source_id"]
            isOneToOne: false
            referencedRelation: "video_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sources: {
        Row: {
          created_at: string | null
          episode_id: string | null
          id: string
          is_default: boolean | null
          language: string | null
          media_id: string | null
          permission: string | null
          quality: string | null
          quality_urls: Json | null
          server_name: string | null
          source_type: Database["public"]["Enums"]["video_source_type"]
          updated_at: string | null
          url: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          episode_id?: string | null
          id?: string
          is_default?: boolean | null
          language?: string | null
          media_id?: string | null
          permission?: string | null
          quality?: string | null
          quality_urls?: Json | null
          server_name?: string | null
          source_type: Database["public"]["Enums"]["video_source_type"]
          updated_at?: string | null
          url: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          episode_id?: string | null
          id?: string
          is_default?: boolean | null
          language?: string | null
          media_id?: string | null
          permission?: string | null
          quality?: string | null
          quality_urls?: Json | null
          server_name?: string | null
          source_type?: Database["public"]["Enums"]["video_source_type"]
          updated_at?: string | null
          url?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_sources_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_sources_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topup_requests: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_data: Json | null
          payment_gateway_id: string | null
          payment_method: string | null
          payment_reference: string | null
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_data?: Json | null
          payment_gateway_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_data?: Json | null
          payment_gateway_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topup_requests_payment_gateway_id_fkey"
            columns: ["payment_gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          content_id: string
          episode_id: string | null
          id: string
          user_id: string
          watch_duration_seconds: number
          watched_at: string
        }
        Insert: {
          content_id: string
          episode_id?: string | null
          id?: string
          user_id: string
          watch_duration_seconds?: number
          watched_at?: string
        }
        Update: {
          content_id?: string
          episode_id?: string | null
          id?: string
          user_id?: string
          watch_duration_seconds?: number
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_progress: {
        Row: {
          completed: boolean
          content_id: string
          created_at: string
          duration_seconds: number | null
          episode_id: string | null
          id: string
          last_watched_at: string
          progress_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          content_id: string
          created_at?: string
          duration_seconds?: number | null
          episode_id?: string | null
          id?: string
          last_watched_at?: string
          progress_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          content_id?: string
          created_at?: string
          duration_seconds?: number | null
          episode_id?: string | null
          id?: string
          last_watched_at?: string
          progress_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_progress_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_wallet_funds: {
        Args: { p_amount: number; p_transaction_id: string; p_user_id: string }
        Returns: Json
      }
      check_content_access: {
        Args: { content_uuid: string }
        Returns: {
          access_reason: string
          devices_used: number
          expires_at: string
          has_access: boolean
          max_devices: number
        }[]
      }
      check_episode_access: {
        Args: { episode_uuid: string }
        Returns: {
          access_reason: string
          devices_used: number
          expires_at: string
          has_access: boolean
          max_devices: number
        }[]
      }
      cleanup_old_watch_history: { Args: never; Returns: undefined }
      create_error_notification: {
        Args: {
          error_message: string
          error_metadata?: Json
          error_title: string
        }
        Returns: string
      }
      generate_thumbnail_from_video: {
        Args: { video_url_param: string }
        Returns: string
      }
      get_comment_replies_count: {
        Args: { comment_uuid: string }
        Returns: number
      }
      get_content_interaction_counts: {
        Args: { content_uuid: string }
        Returns: {
          dislikes: number
          likes: number
          reports: number
          shares: number
        }[]
      }
      get_or_create_frequency_data: {
        Args: { ad_placement: string; session_id: string }
        Returns: {
          last_shown_time: string
          session_start_time: string
          show_count: number
        }[]
      }
      get_users_for_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          profile_image: string
          updated_at: string
          username: string
          wallet_balance: number
        }[]
      }
      has_role:
        | { Args: { role_to_check: string }; Returns: boolean }
        | {
            Args: {
              role: Database["public"]["Enums"]["app_role"]
              user_id: string
            }
            Returns: boolean
          }
      increment_view_count: {
        Args: { p_content_id: string }
        Returns: undefined
      }
      process_wallet_topup: {
        Args: { new_status: string; payment_ref?: string; request_id: string }
        Returns: boolean
      }
      purchase_content_with_wallet: {
        Args: {
          p_amount: number
          p_content_id: string
          p_currency?: string
          p_user_id: string
        }
        Returns: boolean
      }
      purchase_membership_with_wallet: {
        Args: { p_amount: number; p_plan_id: string; p_user_id: string }
        Returns: boolean
      }
      register_device_session: {
        Args: {
          content_uuid: string
          device_identifier: string
          device_information?: Json
        }
        Returns: boolean
      }
      support_content_with_wallet:
        | {
            Args: { p_amount: number; p_content_id: string; p_user_id: string }
            Returns: boolean
          }
        | {
            Args: {
              p_amount: number
              p_content_id: string
              p_episode_id?: string
              p_user_id: string
            }
            Returns: boolean
          }
      sync_series_video_sources_to_purchase: {
        Args: { series_id: string }
        Returns: undefined
      }
      update_frequency_data: {
        Args: { ad_placement: string; session_id: string }
        Returns: boolean
      }
      update_report_analytics: { Args: never; Returns: undefined }
      update_watch_progress: {
        Args: {
          p_content_id: string
          p_duration_seconds: number
          p_episode_id: string
          p_progress_seconds: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_access_type: "free" | "membership" | "purchase"
      purchase_period_type:
        | "1_day"
        | "7_days"
        | "30_days"
        | "90_days"
        | "365_days"
        | "lifetime"
      source_type: "hls" | "dash" | "mp4" | "webm" | "embed"
      video_source_type: "mp4" | "hls" | "iframe"
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
      app_role: ["admin", "moderator", "user"],
      content_access_type: ["free", "membership", "purchase"],
      purchase_period_type: [
        "1_day",
        "7_days",
        "30_days",
        "90_days",
        "365_days",
        "lifetime",
      ],
      source_type: ["hls", "dash", "mp4", "webm", "embed"],
      video_source_type: ["mp4", "hls", "iframe"],
    },
  },
} as const
