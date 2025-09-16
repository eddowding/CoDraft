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
          anon_downvote_count: number | null
          anon_upvote_count: number | null
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
          anon_downvote_count?: number | null
          anon_upvote_count?: number | null
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
          anon_downvote_count?: number | null
          anon_upvote_count?: number | null
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
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          anonymous_id: string | null
          created_at: string
          element_id: string
          id: string
          updated_at: string
          user_id: string | null
          value: number
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          element_id: string
          id?: string
          updated_at?: string
          user_id?: string | null
          value: number
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          element_id?: string
          id?: string
          updated_at?: string
          user_id?: string | null
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