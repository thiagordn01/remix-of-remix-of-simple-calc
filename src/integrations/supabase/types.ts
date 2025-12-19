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
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          used_by_user_id: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_by_user_id?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          used_by_user_id?: string | null
          used_count?: number | null
        }
        Relationships: []
      }
      kiwify_purchases: {
        Row: {
          amount: number | null
          created_at: string
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          installments: number | null
          order_id: string
          order_ref: string | null
          order_status: string
          payment_merchant_id: string | null
          payment_method: string | null
          product_id: string | null
          product_name: string | null
          purchased_at: string
          subscription_id: string | null
          subscription_next_payment: string | null
          subscription_start_date: string | null
          updated_at: string
          user_id: string
          webhook_payload: Json | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          installments?: number | null
          order_id: string
          order_ref?: string | null
          order_status: string
          payment_merchant_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name?: string | null
          purchased_at?: string
          subscription_id?: string | null
          subscription_next_payment?: string | null
          subscription_start_date?: string | null
          updated_at?: string
          user_id: string
          webhook_payload?: Json | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          installments?: number | null
          order_id?: string
          order_ref?: string | null
          order_status?: string
          payment_merchant_id?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name?: string | null
          purchased_at?: string
          subscription_id?: string | null
          subscription_next_payment?: string | null
          subscription_start_date?: string | null
          updated_at?: string
          user_id?: string
          webhook_payload?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_expires_at: string | null
          created_at: string
          full_name: string | null
          id: string
          is_approved: boolean | null
          name: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          access_expires_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_approved?: boolean | null
          name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          access_expires_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean | null
          name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          activity_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          route: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          route?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          route?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser_name: string | null
          created_at: string
          device_type: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          os_name: string | null
          screen_resolution: string | null
          started_at: string
          timezone: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser_name?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          os_name?: string | null
          screen_resolution?: string | null
          started_at?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser_name?: string | null
          created_at?: string
          device_type?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          os_name?: string | null
          screen_resolution?: string | null
          started_at?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_days_remaining: { Args: { user_id: string }; Returns: number }
      has_active_access: { Args: { user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_invite_valid: { Args: { invite_code: string }; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      user_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const
