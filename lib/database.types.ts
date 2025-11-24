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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          element_id: string
          id: string
          is_deleted: boolean
          is_resolved: boolean
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          element_id: string
          id?: string
          is_deleted?: boolean
          is_resolved?: boolean
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          element_id?: string
          id?: string
          is_deleted?: boolean
          is_resolved?: boolean
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string
          document_id: string
          id: string
          invited_at: string
          invited_by: string
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          document_id: string
          id?: string
          invited_at?: string
          invited_by: string
          role?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          document_id?: string
          id?: string
          invited_at?: string
          invited_by?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_collaborators_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_collaborators_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string
          content: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          category?: string
          content: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          estimated_read_time: number | null
          id: string
          is_collaborative: boolean
          is_public: boolean
          login_not_required: boolean | null
          max_collaborators: number | null
          meta_description: string | null
          slug: string | null
          status: string
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          author_id?: string | null
          content?: string
          created_at?: string
          estimated_read_time?: number | null
          id?: string
          is_collaborative?: boolean
          is_public?: boolean
          login_not_required?: boolean | null
          max_collaborators?: number | null
          meta_description?: string | null
          slug?: string | null
          status?: string
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          estimated_read_time?: number | null
          id?: string
          is_collaborative?: boolean
          is_public?: boolean
          login_not_required?: boolean | null
          max_collaborators?: number | null
          meta_description?: string | null
          slug?: string | null
          status?: string
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      elements: {
        Row: {
          auth_downvote_count: number | null
          auth_upvote_count: number | null
          content: string
          created_at: string
          document_id: string
          downvote_count: number
          id: string
          last_vote_sync: string
          locked_at: string | null
          locked_by: string | null
          order_index: number
          total_vote_count: number
          type: string
          updated_at: string
          upvote_count: number
          version: number
          vote_score: number
        }
        Insert: {
          auth_downvote_count?: number | null
          auth_upvote_count?: number | null
          content: string
          created_at?: string
          document_id: string
          downvote_count?: number
          id?: string
          last_vote_sync?: string
          locked_at?: string | null
          locked_by?: string | null
          order_index: number
          total_vote_count?: number
          type: string
          updated_at?: string
          upvote_count?: number
          version?: number
          vote_score?: number
        }
        Update: {
          auth_downvote_count?: number | null
          auth_upvote_count?: number | null
          content?: string
          created_at?: string
          document_id?: string
          downvote_count?: number
          id?: string
          last_vote_sync?: string
          locked_at?: string | null
          locked_by?: string | null
          order_index?: number
          total_vote_count?: number
          type?: string
          updated_at?: string
          upvote_count?: number
          version?: number
          vote_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "elements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "elements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          session_id: string | null
          token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          session_id?: string | null
          token: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          session_id?: string | null
          token?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      presence: {
        Row: {
          created_at: string
          cursor_position: number | null
          document_id: string
          id: string
          is_active: boolean
          last_seen: string
          selected_element_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cursor_position?: number | null
          document_id: string
          id?: string
          is_active?: boolean
          last_seen?: string
          selected_element_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          cursor_position?: number | null
          document_id?: string
          id?: string
          is_active?: boolean
          last_seen?: string
          selected_element_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_stats"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "presence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presence_selected_element_id_fkey"
            columns: ["selected_element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          browser_notifications: boolean
          created_at: string
          email_notifications: boolean
          email_verified_at: string | null
          full_name: string | null
          id: string
          is_email_verified: boolean
          theme: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          browser_notifications?: boolean
          created_at?: string
          email_notifications?: boolean
          email_verified_at?: string | null
          full_name?: string | null
          id: string
          is_email_verified?: boolean
          theme?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          browser_notifications?: boolean
          created_at?: string
          email_notifications?: boolean
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          is_email_verified?: boolean
          theme?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      versions: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          element_id: string
          id: string
          is_major_change: boolean
          user_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          element_id: string
          id?: string
          is_major_change?: boolean
          user_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          element_id?: string
          id?: string
          is_major_change?: boolean
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "versions_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
        ]
      }
      views: {
        Row: {
          country_code: string | null
          created_at: string
          element_id: string
          id: string
          ip_address: unknown
          referrer: string | null
          region: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          element_id: string
          id?: string
          ip_address?: unknown
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          element_id?: string
          id?: string
          ip_address?: unknown
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "views_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          element_id: string
          id: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          element_id: string
          id?: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          element_id?: string
          id?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_element_id_fkey"
            columns: ["element_id"]
            isOneToOne: false
            referencedRelation: "elements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      document_stats: {
        Row: {
          author_id: string | null
          comment_count: number | null
          document_id: string | null
          total_downvotes: number | null
          total_score: number | null
          total_upvotes: number | null
          total_votes: number | null
          unique_voters: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_element_vote_counts: {
        Args: { elem_id: string }
        Returns: {
          total_downvotes: number
          total_score: number
          total_upvotes: number
        }[]
      }
      can_access_document: {
        Args: { doc_id: string; uid: string }
        Returns: boolean
      }
      can_edit_document: {
        Args: { doc_id: string; uid: string }
        Returns: boolean
      }
      cleanup_old_anonymous_sessions: { Args: never; Returns: undefined }
      is_document_collaborator: {
        Args: { doc_id: string; min_role?: string; uid: string }
        Returns: boolean
      }
      is_document_owner: {
        Args: { doc_id: string; uid: string }
        Returns: boolean
      }
      refresh_document_stats: { Args: never; Returns: undefined }
      update_element_vote_counts: {
        Args: { elem_id: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
