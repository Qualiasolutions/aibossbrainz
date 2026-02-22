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
      AuditLog: {
        Row: {
          action: string
          createdAt: string
          details: Json | null
          id: string
          ipAddress: string | null
          resource: string
          resourceId: string | null
          userAgent: string | null
          userId: string | null
        }
        Insert: {
          action: string
          createdAt?: string
          details?: Json | null
          id?: string
          ipAddress?: string | null
          resource: string
          resourceId?: string | null
          userAgent?: string | null
          userId?: string | null
        }
        Update: {
          action?: string
          createdAt?: string
          details?: Json | null
          id?: string
          ipAddress?: string | null
          resource?: string
          resourceId?: string | null
          userAgent?: string | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Chat: {
        Row: {
          createdAt: string
          deletedAt: string | null
          id: string
          isPinned: boolean
          lastContext: Json | null
          title: string
          topic: string | null
          topicColor: string | null
          userCategory: Database["public"]["Enums"]["user_category"] | null
          userId: string
          visibility: string
        }
        Insert: {
          createdAt?: string
          deletedAt?: string | null
          id?: string
          isPinned?: boolean
          lastContext?: Json | null
          title: string
          topic?: string | null
          topicColor?: string | null
          userCategory?: Database["public"]["Enums"]["user_category"] | null
          userId: string
          visibility?: string
        }
        Update: {
          createdAt?: string
          deletedAt?: string | null
          id?: string
          isPinned?: boolean
          lastContext?: Json | null
          title?: string
          topic?: string | null
          topicColor?: string | null
          userCategory?: Database["public"]["Enums"]["user_category"] | null
          userId?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "Chat_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ConversationSummary: {
        Row: {
          chatId: string | null
          createdAt: string
          deletedAt: string | null
          expiresAt: string | null
          id: string
          importance: number | null
          keyInsights: Json | null
          summary: string
          topics: string[] | null
          userId: string
        }
        Insert: {
          chatId?: string | null
          createdAt?: string
          deletedAt?: string | null
          expiresAt?: string | null
          id?: string
          importance?: number | null
          keyInsights?: Json | null
          summary: string
          topics?: string[] | null
          userId: string
        }
        Update: {
          chatId?: string | null
          createdAt?: string
          deletedAt?: string | null
          expiresAt?: string | null
          id?: string
          importance?: number | null
          keyInsights?: Json | null
          summary?: string
          topics?: string[] | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ConversationSummary_chatId_fkey"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ConversationSummary_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Document: {
        Row: {
          content: string | null
          createdAt: string
          deletedAt: string | null
          id: string
          kind: string
          title: string
          userId: string
        }
        Insert: {
          content?: string | null
          createdAt?: string
          deletedAt?: string | null
          id?: string
          kind?: string
          title: string
          userId: string
        }
        Update: {
          content?: string | null
          createdAt?: string
          deletedAt?: string | null
          id?: string
          kind?: string
          title?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Document_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ExecutiveMemory: {
        Row: {
          createdAt: string | null
          executive: string
          id: string
          lastUsed: string | null
          messageCount: Json | null
          preferenceScore: Json | null
          topTopics: Json | null
          updatedAt: string | null
          userId: string
        }
        Insert: {
          createdAt?: string | null
          executive: string
          id?: string
          lastUsed?: string | null
          messageCount?: Json | null
          preferenceScore?: Json | null
          topTopics?: Json | null
          updatedAt?: string | null
          userId: string
        }
        Update: {
          createdAt?: string | null
          executive?: string
          id?: string
          lastUsed?: string | null
          messageCount?: Json | null
          preferenceScore?: Json | null
          topTopics?: Json | null
          updatedAt?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ExecutiveMemory_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_content: {
        Row: {
          bot_type: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          source: string
          source_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bot_type: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source: string
          source_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bot_type?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          source_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      LandingPageContent: {
        Row: {
          createdAt: string | null
          id: string
          key: string
          metadata: Json | null
          section: string
          type: string
          updatedAt: string | null
          updatedBy: string | null
          value: string
        }
        Insert: {
          createdAt?: string | null
          id?: string
          key: string
          metadata?: Json | null
          section: string
          type?: string
          updatedAt?: string | null
          updatedBy?: string | null
          value: string
        }
        Update: {
          createdAt?: string | null
          id?: string
          key?: string
          metadata?: Json | null
          section?: string
          type?: string
          updatedAt?: string | null
          updatedBy?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "LandingPageContent_updatedBy_fkey"
            columns: ["updatedBy"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Message_v2: {
        Row: {
          attachments: Json
          botType: string | null
          chatId: string
          createdAt: string
          deletedAt: string | null
          id: string
          parts: Json
          role: string
        }
        Insert: {
          attachments?: Json
          botType?: string | null
          chatId: string
          createdAt?: string
          deletedAt?: string | null
          id?: string
          parts?: Json
          role: string
        }
        Update: {
          attachments?: Json
          botType?: string | null
          chatId?: string
          createdAt?: string
          deletedAt?: string | null
          id?: string
          parts?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_v2_chatId_fkey"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
        ]
      }
      MessageReaction: {
        Row: {
          createdAt: string | null
          id: string
          messageId: string
          reactionType: string
          userId: string
        }
        Insert: {
          createdAt?: string | null
          id?: string
          messageId: string
          reactionType: string
          userId: string
        }
        Update: {
          createdAt?: string | null
          id?: string
          messageId?: string
          reactionType?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "MessageReaction_messageId_fkey"
            columns: ["messageId"]
            isOneToOne: false
            referencedRelation: "Message_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "MessageReaction_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StrategyCanvas: {
        Row: {
          canvasType: string
          createdAt: string
          data: Json
          deletedAt: string | null
          id: string
          isDefault: boolean | null
          name: string
          updatedAt: string
          userId: string
        }
        Insert: {
          canvasType: string
          createdAt?: string
          data?: Json
          deletedAt?: string | null
          id?: string
          isDefault?: boolean | null
          name?: string
          updatedAt?: string
          userId: string
        }
        Update: {
          canvasType?: string
          createdAt?: string
          data?: Json
          deletedAt?: string | null
          id?: string
          isDefault?: boolean | null
          name?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "StrategyCanvas_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Stream: {
        Row: {
          chatId: string
          createdAt: string
          deletedAt: string | null
          id: string
        }
        Insert: {
          chatId: string
          createdAt?: string
          deletedAt?: string | null
          id?: string
        }
        Update: {
          chatId?: string
          createdAt?: string
          deletedAt?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Stream_chatId_fkey"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
        ]
      }
      Suggestion: {
        Row: {
          createdAt: string
          deletedAt: string | null
          description: string | null
          documentCreatedAt: string
          documentId: string
          id: string
          isResolved: boolean
          originalText: string
          suggestedText: string
          userId: string
        }
        Insert: {
          createdAt?: string
          deletedAt?: string | null
          description?: string | null
          documentCreatedAt: string
          documentId: string
          id?: string
          isResolved?: boolean
          originalText: string
          suggestedText: string
          userId: string
        }
        Update: {
          createdAt?: string
          deletedAt?: string | null
          description?: string | null
          documentCreatedAt?: string
          documentId?: string
          id?: string
          isResolved?: boolean
          originalText?: string
          suggestedText?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Suggestion_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SupportTicket: {
        Row: {
          assignedAdminId: string | null
          category: string | null
          createdAt: string
          deletedAt: string | null
          id: string
          priority: string
          resolvedAt: string | null
          status: string
          subject: string
          timeSpentMinutes: number | null
          updatedAt: string
          userId: string
        }
        Insert: {
          assignedAdminId?: string | null
          category?: string | null
          createdAt?: string
          deletedAt?: string | null
          id?: string
          priority?: string
          resolvedAt?: string | null
          status?: string
          subject: string
          timeSpentMinutes?: number | null
          updatedAt?: string
          userId: string
        }
        Update: {
          assignedAdminId?: string | null
          category?: string | null
          createdAt?: string
          deletedAt?: string | null
          id?: string
          priority?: string
          resolvedAt?: string | null
          status?: string
          subject?: string
          timeSpentMinutes?: number | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SupportTicket_assignedAdminId_fkey"
            columns: ["assignedAdminId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SupportTicket_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SupportTicketMessage: {
        Row: {
          attachments: Json | null
          content: string
          createdAt: string
          deletedAt: string | null
          id: string
          isAdminReply: boolean
          isInternal: boolean
          senderId: string
          ticketId: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          createdAt?: string
          deletedAt?: string | null
          id?: string
          isAdminReply?: boolean
          isInternal?: boolean
          senderId: string
          ticketId: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          createdAt?: string
          deletedAt?: string | null
          id?: string
          isAdminReply?: boolean
          isInternal?: boolean
          senderId?: string
          ticketId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SupportTicketMessage_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SupportTicketMessage_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "SupportTicket"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          annualRevenue: string | null
          businessGoals: string | null
          companyName: string | null
          competitors: string | null
          deletedAt: string | null
          displayName: string | null
          email: string
          employeeCount: string | null
          id: string
          industry: string | null
          isAdmin: boolean | null
          onboardedAt: string | null
          preferredBotType: string | null
          productsServices: string | null
          profileUpdatedAt: string | null
          stripeCustomerId: string | null
          stripeSubscriptionId: string | null
          subscriptionEndDate: string | null
          subscriptionStartDate: string | null
          subscriptionStatus: string | null
          subscriptionType: string | null
          targetMarket: string | null
          tosAcceptedAt: string | null
          userType: string | null
          websiteUrl: string | null
          yearsInBusiness: string | null
        }
        Insert: {
          annualRevenue?: string | null
          businessGoals?: string | null
          companyName?: string | null
          competitors?: string | null
          deletedAt?: string | null
          displayName?: string | null
          email: string
          employeeCount?: string | null
          id?: string
          industry?: string | null
          isAdmin?: boolean | null
          onboardedAt?: string | null
          preferredBotType?: string | null
          productsServices?: string | null
          profileUpdatedAt?: string | null
          stripeCustomerId?: string | null
          stripeSubscriptionId?: string | null
          subscriptionEndDate?: string | null
          subscriptionStartDate?: string | null
          subscriptionStatus?: string | null
          subscriptionType?: string | null
          targetMarket?: string | null
          tosAcceptedAt?: string | null
          userType?: string | null
          websiteUrl?: string | null
          yearsInBusiness?: string | null
        }
        Update: {
          annualRevenue?: string | null
          businessGoals?: string | null
          companyName?: string | null
          competitors?: string | null
          deletedAt?: string | null
          displayName?: string | null
          email?: string
          employeeCount?: string | null
          id?: string
          industry?: string | null
          isAdmin?: boolean | null
          onboardedAt?: string | null
          preferredBotType?: string | null
          productsServices?: string | null
          profileUpdatedAt?: string | null
          stripeCustomerId?: string | null
          stripeSubscriptionId?: string | null
          subscriptionEndDate?: string | null
          subscriptionStartDate?: string | null
          subscriptionStatus?: string | null
          subscriptionType?: string | null
          targetMarket?: string | null
          tosAcceptedAt?: string | null
          userType?: string | null
          websiteUrl?: string | null
          yearsInBusiness?: string | null
        }
        Relationships: []
      }
      UserAnalytics: {
        Row: {
          createdAt: string | null
          date: string
          exportCount: number | null
          id: string
          messageCount: number | null
          tokenUsage: number | null
          updatedAt: string | null
          userId: string
          voiceMinutes: number | null
        }
        Insert: {
          createdAt?: string | null
          date: string
          exportCount?: number | null
          id?: string
          messageCount?: number | null
          tokenUsage?: number | null
          updatedAt?: string | null
          userId: string
          voiceMinutes?: number | null
        }
        Update: {
          createdAt?: string | null
          date?: string
          exportCount?: number | null
          id?: string
          messageCount?: number | null
          tokenUsage?: number | null
          updatedAt?: string | null
          userId?: string
          voiceMinutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "UserAnalytics_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Vote_v2: {
        Row: {
          chatId: string
          deletedAt: string | null
          isUpvoted: boolean
          messageId: string
        }
        Insert: {
          chatId: string
          deletedAt?: string | null
          isUpvoted: boolean
          messageId: string
        }
        Update: {
          chatId?: string
          deletedAt?: string | null
          isUpvoted?: boolean
          messageId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Vote_v2_chatId_fkey"
            columns: ["chatId"]
            isOneToOne: false
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_subscription_end_date: {
        Args: { start_date: string; sub_type: string }
        Returns: string
      }
      expire_subscriptions: { Args: never; Returns: undefined }
      get_admin_chats_with_stats: {
        Args: never
        Returns: {
          createdAt: string
          deletedAt: string
          id: string
          isPinned: boolean
          lastContext: Json
          messageCount: number
          title: string
          topic: string
          topicColor: string
          userDisplayName: string
          userEmail: string
          userId: string
          visibility: string
        }[]
      }
      get_admin_user_by_id: {
        Args: { p_user_id: string }
        Returns: {
          businessGoals: string
          chatCount: number
          companyName: string
          deletedAt: string
          displayName: string
          email: string
          id: string
          industry: string
          isAdmin: boolean
          lastActiveAt: string
          messageCount: number
          onboardedAt: string
          preferredBotType: string
          profileUpdatedAt: string
          stripeCustomerId: string
          stripeSubscriptionId: string
          subscriptionEndDate: string
          subscriptionStartDate: string
          subscriptionStatus: string
          subscriptionType: string
          tosAcceptedAt: string
          userType: string
        }[]
      }
      get_admin_users_with_stats: {
        Args: never
        Returns: {
          businessGoals: string
          chatCount: number
          companyName: string
          deletedAt: string
          displayName: string
          email: string
          id: string
          industry: string
          isAdmin: boolean
          lastActiveAt: string
          messageCount: number
          onboardedAt: string
          preferredBotType: string
          profileUpdatedAt: string
          stripeCustomerId: string
          stripeSubscriptionId: string
          subscriptionEndDate: string
          subscriptionStartDate: string
          subscriptionStatus: string
          subscriptionType: string
          tosAcceptedAt: string
          userType: string
        }[]
      }
      get_bounded_messages: {
        Args: { p_chat_id: string; p_max_messages?: number }
        Returns: {
          attachments: Json
          botType: string | null
          chatId: string
          createdAt: string
          deletedAt: string | null
          id: string
          parts: Json
          role: string
        }[]
        SetofOptions: {
          from: "*"
          to: "Message_v2"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_daily_analytics: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          chat_count: number
          day: string
          message_count: number
        }[]
      }
      get_my_user_id: { Args: never; Returns: string }
      get_reaction_counts: {
        Args: { p_message_id: string }
        Returns: {
          count: number
          reaction_type: string
        }[]
      }
      get_recent_conversations: {
        Args: { p_limit?: number }
        Returns: {
          createdAt: string
          id: string
          messageCount: number
          title: string
          topic: string
          topicColor: string
          userDisplayName: string
          userEmail: string
          userId: string
        }[]
      }
      get_topic_breakdown: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          color: string
          count: number
          topic: string
        }[]
      }
      get_user_analytics_summary: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          chat_count: number
          message_count: number
        }[]
      }
      get_user_message_count: {
        Args: { p_cutoff_time: string; p_user_id: string }
        Returns: number
      }
      get_user_personalization: { Args: { p_user_id: string }; Returns: Json }
      is_current_user_admin: { Args: never; Returns: boolean }
      merge_canvas_items: {
        Args: {
          p_canvas_type: string
          p_items: Json
          p_section: string
          p_user_id: string
        }
        Returns: string
      }
      record_user_analytics: {
        Args: {
          p_date: string
          p_export_count?: number
          p_message_count?: number
          p_token_usage?: number
          p_user_id: string
          p_voice_minutes?: number
        }
        Returns: undefined
      }
      soft_delete_chat: { Args: { p_chat_id: string }; Returns: undefined }
      upsert_executive_memory: {
        Args: { p_executive: string; p_topic?: string; p_user_id: string }
        Returns: undefined
      }
      user_owns_ticket: { Args: { ticket_id: string }; Returns: boolean }
    }
    Enums: {
      user_category: "team" | "client" | "none"
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
      user_category: ["team", "client", "none"],
    },
  },
} as const
