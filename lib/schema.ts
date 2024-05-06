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
      UserData: {
        Row: {
          email: string | null
          username: string | null
          user_id: string
        }
        Insert: {
          email?: string | null
          username?: string | null
          user_id: string
        }
        Update: {
          email?: string | null
          username?: string | null
          user_id?: string
        }
      }
      boards: {
        Row: {
          id: number
          name: string
          proficiency: number
        }
        Insert: {
          id?: number
          name: string
          proficiency?: number
        }
        Update: {
          id?: number
          name?: string
          proficiency?: number
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
          to_generate: boolean
        }
        Insert: {
          board_id: number
          title: string
          description: string
          assignee_id: string
          status_column: string
          to_generate: boolean
        }
        Update: {
          board_id?: number
          ticket_id?: number
          title?: string
          description?: string
          assignee_id?: string
          status_column?: string
          to_generate: boolean
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