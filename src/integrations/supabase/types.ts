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
      agent_executions: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json
          output_data: Json | null
          scan_id: string
          status: Database["public"]["Enums"]["scan_status"] | null
          user_id: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data: Json
          output_data?: Json | null
          scan_id: string
          status?: Database["public"]["Enums"]["scan_status"] | null
          user_id: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json
          output_data?: Json | null
          scan_id?: string
          status?: Database["public"]["Enums"]["scan_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          config: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          prompt_template: string
          updated_at: string
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          prompt_template: string
          updated_at?: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          prompt_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number | null
          response_status: number | null
          service_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number | null
          response_status?: number | null
          service_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number | null
          response_status?: number | null
          service_name?: string
          user_id?: string
        }
        Relationships: []
      }
      apt_campaigns: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          objectives: string[] | null
          scope_definition: string | null
          start_date: string
          status: string
          target_organization: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          objectives?: string[] | null
          scope_definition?: string | null
          start_date?: string
          status?: string
          target_organization?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          objectives?: string[] | null
          scope_definition?: string | null
          start_date?: string
          status?: string
          target_organization?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attack_paths: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          evidence: Json | null
          execution_order: number | null
          expected_outcome: string | null
          id: string
          mitre_tactic: string | null
          mitre_technique: string | null
          phase: string
          prerequisites: string[] | null
          risk_level: string | null
          status: string | null
          technique_name: string | null
          tools_required: string[] | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          evidence?: Json | null
          execution_order?: number | null
          expected_outcome?: string | null
          id?: string
          mitre_tactic?: string | null
          mitre_technique?: string | null
          phase: string
          prerequisites?: string[] | null
          risk_level?: string | null
          status?: string | null
          technique_name?: string | null
          tools_required?: string[] | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          evidence?: Json | null
          execution_order?: number | null
          expected_outcome?: string | null
          id?: string
          mitre_tactic?: string | null
          mitre_technique?: string | null
          phase?: string
          prerequisites?: string[] | null
          risk_level?: string | null
          status?: string | null
          technique_name?: string | null
          tools_required?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      demo_targets: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          documentation_url: string | null
          id: string
          is_active: boolean | null
          is_live_target: boolean | null
          legal_disclaimer: string | null
          metadata: Json | null
          name: string
          requires_authentication: boolean | null
          source_provider: string
          tags: string[] | null
          target_type: string
          target_value: string
          updated_at: string | null
          usage_notes: string | null
          vulnerabilities: string[] | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_active?: boolean | null
          is_live_target?: boolean | null
          legal_disclaimer?: string | null
          metadata?: Json | null
          name: string
          requires_authentication?: boolean | null
          source_provider: string
          tags?: string[] | null
          target_type: string
          target_value: string
          updated_at?: string | null
          usage_notes?: string | null
          vulnerabilities?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_active?: boolean | null
          is_live_target?: boolean | null
          legal_disclaimer?: string | null
          metadata?: Json | null
          name?: string
          requires_authentication?: boolean | null
          source_provider?: string
          tags?: string[] | null
          target_type?: string
          target_value?: string
          updated_at?: string | null
          usage_notes?: string | null
          vulnerabilities?: string[] | null
        }
        Relationships: []
      }
      mitre_mappings: {
        Row: {
          automated: boolean | null
          confidence_score: number | null
          created_at: string
          id: string
          mitre_tactic: string
          mitre_technique: string
          reasoning: string | null
          scan_id: string
          technique_name: string
          user_id: string
          vulnerability_cve: string | null
        }
        Insert: {
          automated?: boolean | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          mitre_tactic: string
          mitre_technique: string
          reasoning?: string | null
          scan_id: string
          technique_name: string
          user_id: string
          vulnerability_cve?: string | null
        }
        Update: {
          automated?: boolean | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          mitre_tactic?: string
          mitre_technique?: string
          reasoning?: string | null
          scan_id?: string
          technique_name?: string
          user_id?: string
          vulnerability_cve?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_quota: number | null
          created_at: string
          id: string
          role: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          api_quota?: number | null
          created_at?: string
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          api_quota?: number | null
          created_at?: string
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          requests_count: number | null
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          requests_count?: number | null
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          requests_count?: number | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          created_at: string
          format_settings: Json | null
          id: string
          is_default: boolean | null
          name: string
          sections: Json
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          format_settings?: Json | null
          id?: string
          is_default?: boolean | null
          name: string
          sections: Json
          template_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          format_settings?: Json | null
          id?: string
          is_default?: boolean | null
          name?: string
          sections?: Json
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          results: Json | null
          status: Database["public"]["Enums"]["scan_status"] | null
          target: string
          threat_level: Database["public"]["Enums"]["threat_level"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          results?: Json | null
          status?: Database["public"]["Enums"]["scan_status"] | null
          target: string
          threat_level?: Database["public"]["Enums"]["threat_level"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          results?: Json | null
          status?: Database["public"]["Enums"]["scan_status"] | null
          target?: string
          threat_level?: Database["public"]["Enums"]["threat_level"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      threat_intelligence: {
        Row: {
          description: string | null
          first_seen: string
          id: string
          ioc_type: string
          ioc_value: string
          is_active: boolean | null
          last_seen: string
          metadata: Json | null
          source: string
          tags: string[] | null
          threat_level: Database["public"]["Enums"]["threat_level"]
        }
        Insert: {
          description?: string | null
          first_seen?: string
          id?: string
          ioc_type: string
          ioc_value: string
          is_active?: boolean | null
          last_seen?: string
          metadata?: Json | null
          source: string
          tags?: string[] | null
          threat_level: Database["public"]["Enums"]["threat_level"]
        }
        Update: {
          description?: string | null
          first_seen?: string
          id?: string
          ioc_type?: string
          ioc_value?: string
          is_active?: boolean | null
          last_seen?: string
          metadata?: Json | null
          source?: string
          tags?: string[] | null
          threat_level?: Database["public"]["Enums"]["threat_level"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      agent_type:
        | "reconnaissance"
        | "vulnerability"
        | "threat_intelligence"
        | "network_analysis"
      asset_type: "domain" | "ip" | "url" | "hash" | "email"
      scan_status: "pending" | "running" | "completed" | "failed"
      threat_level: "low" | "medium" | "high" | "critical"
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
      agent_type: [
        "reconnaissance",
        "vulnerability",
        "threat_intelligence",
        "network_analysis",
      ],
      asset_type: ["domain", "ip", "url", "hash", "email"],
      scan_status: ["pending", "running", "completed", "failed"],
      threat_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
