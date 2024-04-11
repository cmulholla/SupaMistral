export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      todos: {
        Row: {
          id: number
          inserted_at: string
          is_complete: boolean | null
          task: string | null
          user_id: string
        }
        Insert: {
          id?: number
          inserted_at?: string
          is_complete?: boolean | null
          task?: string | null
          user_id: string
        }
        Update: {
          id?: number
          inserted_at?: string
          is_complete?: boolean | null
          task?: string | null
          user_id?: string
        }
      }
      UserData: {
        Row: {
          email: string | null
          username: string | null
          skills: string | null
          talents: string | null
          description: string | null
          user_id: string
        }
        Insert: {
          email?: string | null
          username?: string | null
          skills?: string | null
          talents?: string | null
          description?: string | null
          user_id: string
        }
        Update: {
          email?: string | null
          username?: string | null
          skills?: string | null
          talents?: string | null
          description?: string | null
          user_id?: string
        }
      }
      boards: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
      board_members: {
        Row: {
          board_id: number
          user_id: string | undefined
        }
        Insert: {
          board_id: number
          user_id: string | undefined
        }
        Update: {
          board_id?: number
          user_id?: string | undefined
        }
      }
      board_ticket_data: {
        Row: {
          board_id: number
          ticket_id: number
          title: string
          description: string
          assignee_id: string
          status_column: string
        }
        Insert: {
          board_id: number
          title: string
          description: string
          assignee_id: string
          status_column: string
        }
        Update: {
          board_id?: number
          ticket_id?: number
          title?: string
          description?: string
          assignee_id?: string
          status_column?: string
        }
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