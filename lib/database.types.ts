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
            foreignKeyName: "comments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      elements: {
        Row: {
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
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elements_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
          {
            foreignKeyName: "presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
          {
            foreignKeyName: "versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      views: {
        Row: {
          country_code: string | null
          created_at: string
          element_id: string
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
          {
            foreignKeyName: "views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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