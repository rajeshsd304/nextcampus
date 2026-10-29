/**
 * Supabase database types for the `public` schema.
 *
 * Kept in the exact shape produced by `supabase gen types typescript`. After
 * changing a migration, regenerate with `npm run db:types` (writes
 * database.generated.ts) and reconcile this file.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          metadata: Json;
          organization_id: string | null;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      contact_requests: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          organization: string | null;
          submitted_by: string | null;
          topic: Database["public"]["Enums"]["contact_topic"];
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      invitations: {
        Row: {
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          organization_id: string;
          responded_at: string | null;
          responded_by: string | null;
          role: Database["public"]["Enums"]["org_role"];
          status: Database["public"]["Enums"]["invitation_status"];
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          action_url: string | null;
          body: string | null;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["notification_kind"];
          organization_id: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      organization_members: {
        Row: {
          invited_by: string | null;
          joined_at: string;
          organization_id: string;
          role: Database["public"]["Enums"]["org_role"];
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          contact_email: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["organization_status"];
          type: Database["public"]["Enums"]["organization_type"];
          updated_at: string;
          website: string | null;
        };
        Insert: never;
        Update: {
          contact_email?: string | null;
          name?: string;
          type?: Database["public"]["Enums"]["organization_type"];
          website?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: { description: string; key: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      platform_admins: {
        Row: { created_at: string; granted_by: string | null; user_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string;
          full_name: string | null;
          id: string;
          locale: string;
          marketing_opt_in: boolean;
          onboarded_at: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          avatar_url?: string | null;
          display_name?: string | null;
          full_name?: string | null;
          locale?: string;
          marketing_opt_in?: boolean;
          timezone?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: { permission_key: string; role: Database["public"]["Enums"]["org_role"] };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_invitation: {
        Args: { p_token: string };
        Returns: {
          member_role: Database["public"]["Enums"]["org_role"];
          organization_id: string;
          organization_slug: string;
        }[];
      };
      accept_invitation_by_id: {
        Args: { p_invitation_id: string };
        Returns: {
          member_role: Database["public"]["Enums"]["org_role"];
          organization_id: string;
          organization_slug: string;
        }[];
      };
      complete_onboarding: {
        Args: { p_display_name: string; p_full_name: string; p_timezone: string };
        Returns: undefined;
      };
      create_invitation: {
        Args: {
          p_email: string;
          p_organization_id: string;
          p_role: Database["public"]["Enums"]["org_role"];
        };
        Returns: { invitation_expires_at: string; invitation_id: string; invitation_token: string }[];
      };
      create_organization: {
        Args: { p_name: string; p_slug: string; p_type: Database["public"]["Enums"]["organization_type"] };
        Returns: { organization_id: string; organization_slug: string }[];
      };
      decline_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
      get_invitation_preview: {
        Args: { p_token: string };
        Returns: {
          email_hint: string;
          expires_at: string;
          is_expired: boolean;
          organization_name: string;
          organization_slug: string;
          role: Database["public"]["Enums"]["org_role"];
          status: Database["public"]["Enums"]["invitation_status"];
        }[];
      };
      list_my_invitations: {
        Args: never;
        Returns: {
          created_at: string;
          expires_at: string;
          invitation_id: string;
          invited_by_name: string | null;
          organization_name: string;
          organization_slug: string;
          role: Database["public"]["Enums"]["org_role"];
        }[];
      };
      log_auth_event: { Args: { p_event: string; p_method?: string }; Returns: undefined };
      mark_notifications_read: { Args: { p_notification_ids?: string[] }; Returns: number };
      remove_member: { Args: { p_organization_id: string; p_user_id: string }; Returns: undefined };
      revoke_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
      set_organization_status: {
        Args: {
          p_organization_id: string;
          p_status: Database["public"]["Enums"]["organization_status"];
        };
        Returns: undefined;
      };
      submit_contact_request: {
        Args: {
          p_email: string;
          p_message: string;
          p_name: string;
          p_organization: string;
          p_topic: Database["public"]["Enums"]["contact_topic"];
        };
        Returns: string;
      };
      update_member_role: {
        Args: {
          p_organization_id: string;
          p_role: Database["public"]["Enums"]["org_role"];
          p_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      contact_topic: "sales" | "support" | "partnership" | "security" | "other";
      invitation_status: "pending" | "accepted" | "declined" | "revoked";
      membership_status: "active" | "suspended";
      notification_kind: "invitation" | "membership" | "security" | "system";
      org_role: "org_admin" | "instructor" | "invigilator" | "student";
      organization_status: "active" | "suspended";
      organization_type:
        "university" | "coaching_center" | "training_organization" | "independent_instructor" | "other";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
