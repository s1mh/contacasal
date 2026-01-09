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
      agreements: {
        Row: {
          amount: number
          couple_id: string
          created_at: string | null
          day_of_month: number | null
          id: string
          is_active: boolean | null
          name: string
          paid_by: number
          paid_by_profile_id: string | null
          split_type: string
          split_value: Json
          tag_id: string | null
        }
        Insert: {
          amount: number
          couple_id: string
          created_at?: string | null
          day_of_month?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          paid_by: number
          paid_by_profile_id?: string | null
          split_type: string
          split_value?: Json
          tag_id?: string | null
        }
        Update: {
          amount?: number
          couple_id?: string
          created_at?: string | null
          day_of_month?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          paid_by?: number
          paid_by_profile_id?: string | null
          split_type?: string
          split_value?: Json
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_paid_by_profile_id_fkey"
            columns: ["paid_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          closing_day: number | null
          color: string | null
          couple_id: string
          created_at: string | null
          due_day: number | null
          id: string
          name: string
          profile_id: string
          type: string
        }
        Insert: {
          closing_day?: number | null
          color?: string | null
          couple_id: string
          created_at?: string | null
          due_day?: number | null
          id?: string
          name: string
          profile_id: string
          type: string
        }
        Update: {
          closing_day?: number | null
          color?: string | null
          couple_id?: string
          created_at?: string | null
          due_day?: number | null
          id?: string
          name?: string
          profile_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          id: string
          max_members: number | null
          share_code: string
          share_code_expires_at: string | null
          share_code_used_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_members?: number | null
          share_code?: string
          share_code_expires_at?: string | null
          share_code_used_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_members?: number | null
          share_code?: string
          share_code_expires_at?: string | null
          share_code_used_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_payments: {
        Row: {
          amount: number
          card_id: string | null
          created_at: string | null
          expense_id: string
          id: string
          payment_type: string | null
          profile_id: string
        }
        Insert: {
          amount: number
          card_id?: string | null
          created_at?: string | null
          expense_id: string
          id?: string
          payment_type?: string | null
          profile_id: string
        }
        Update: {
          amount?: number
          card_id?: string | null
          created_at?: string | null
          expense_id?: string
          id?: string
          payment_type?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          billing_month: string | null
          card_id: string | null
          couple_id: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          installment_number: number | null
          installments: number | null
          paid_by: number
          paid_by_profile_id: string | null
          payment_type: string | null
          split_type: string
          split_value: Json
          tag_id: string | null
          total_amount: number
        }
        Insert: {
          billing_month?: string | null
          card_id?: string | null
          couple_id: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          installment_number?: number | null
          installments?: number | null
          paid_by: number
          paid_by_profile_id?: string | null
          payment_type?: string | null
          split_type: string
          split_value?: Json
          tag_id?: string | null
          total_amount: number
        }
        Update: {
          billing_month?: string | null
          card_id?: string | null
          couple_id?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          installment_number?: number | null
          installments?: number | null
          paid_by?: number
          paid_by_profile_id?: string | null
          payment_type?: string | null
          split_type?: string
          split_value?: Json
          tag_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_profile_id_fkey"
            columns: ["paid_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_index: number
          color: string
          couple_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          pin_attempts: number | null
          pin_code: string | null
          pin_locked_until: string | null
          position: number
          recovery_token: string | null
          recovery_token_expires_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_index?: number
          color?: string
          couple_id: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          pin_attempts?: number | null
          pin_code?: string | null
          pin_locked_until?: string | null
          position: number
          recovery_token?: string | null
          recovery_token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_index?: number
          color?: string
          couple_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          pin_attempts?: number | null
          pin_code?: string | null
          pin_locked_until?: string | null
          position?: number
          recovery_token?: string | null
          recovery_token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          couple_id: string
          id: string
          note: string | null
          paid_by: number
          paid_by_profile_id: string | null
          received_by_profile_id: string | null
          settled_at: string | null
        }
        Insert: {
          amount: number
          couple_id: string
          id?: string
          note?: string | null
          paid_by: number
          paid_by_profile_id?: string | null
          received_by_profile_id?: string | null
          settled_at?: string | null
        }
        Update: {
          amount?: number
          couple_id?: string
          id?: string
          note?: string | null
          paid_by?: number
          paid_by_profile_id?: string | null
          received_by_profile_id?: string | null
          settled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_paid_by_profile_id_fkey"
            columns: ["paid_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_received_by_profile_id_fkey"
            columns: ["received_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_roles: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["space_role"]
          space_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id: string
          role?: Database["public"]["Enums"]["space_role"]
          space_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["space_role"]
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_roles_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          couple_id: string
          created_at: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          couple_id: string
          created_at?: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          couple_id?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_space_members: { Args: { _space_id: string }; Returns: number }
      get_couple_id_by_share_code: { Args: { code: string }; Returns: string }
      get_current_couple_id: { Args: never; Returns: string }
      get_next_available_position: {
        Args: { _space_id: string }
        Returns: number
      }
      get_space_admins: { Args: { _space_id: string }; Returns: string[] }
      has_space_role: {
        Args: {
          _profile_id: string
          _role: Database["public"]["Enums"]["space_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      space_role: "admin" | "member"
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
      space_role: ["admin", "member"],
    },
  },
} as const
