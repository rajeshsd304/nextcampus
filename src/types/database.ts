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
      exam_target_subjects: {
        Row: { exam_target_id: string; subject_id: string };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "exam_target_subjects_exam_target_id_fkey";
            columns: ["exam_target_id"];
            isOneToOne: false;
            referencedRelation: "exam_targets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_target_subjects_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_targets: {
        Row: {
          created_at: string;
          description_bn: string | null;
          description_en: string | null;
          id: string;
          is_active: boolean;
          name_bn: string;
          name_en: string;
          negative_marking: number;
          slug: string;
          sort_order: number;
          typical_format_bn: string | null;
          typical_format_en: string | null;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          description_bn?: string | null;
          description_en?: string | null;
          is_active?: boolean;
          name_bn: string;
          name_en: string;
          negative_marking?: number;
          slug: string;
          sort_order?: number;
          typical_format_bn?: string | null;
          typical_format_en?: string | null;
          university_id: string;
        };
        Update: {
          description_bn?: string | null;
          description_en?: string | null;
          is_active?: boolean;
          name_bn?: string;
          name_en?: string;
          negative_marking?: number;
          slug?: string;
          sort_order?: number;
          typical_format_bn?: string | null;
          typical_format_en?: string | null;
          university_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_targets_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
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
          params: Json;
          read_at: string | null;
          template: string | null;
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
          is_system: boolean;
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
        Row: {
          created_at: string;
          granted_by: string | null;
          is_primary: boolean;
          slot: number;
          user_id: string;
        };
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
          preferred_locale: string | null;
          preferred_numerals: string | null;
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
          preferred_locale?: string | null;
          preferred_numerals?: string | null;
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
      subjects: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name_bn: string;
          name_en: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: { is_active?: boolean; name_bn: string; name_en: string; slug: string; sort_order?: number };
        Update: {
          is_active?: boolean;
          name_bn?: string;
          name_en?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      universities: {
        Row: {
          category_key: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name_bn: string;
          name_en: string;
          short_code: string;
          slug: string;
          sort_order: number;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          category_key: string;
          is_active?: boolean;
          name_bn: string;
          name_en: string;
          short_code: string;
          slug: string;
          sort_order?: number;
          website?: string | null;
        };
        Update: {
          category_key?: string;
          is_active?: boolean;
          name_bn?: string;
          name_en?: string;
          short_code?: string;
          slug?: string;
          sort_order?: number;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "universities_category_key_fkey";
            columns: ["category_key"];
            isOneToOne: false;
            referencedRelation: "university_categories";
            referencedColumns: ["key"];
          },
        ];
      };
      university_categories: {
        Row: {
          created_at: string;
          is_active: boolean;
          key: string;
          name_bn: string;
          name_en: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: { is_active?: boolean; key: string; name_bn: string; name_en: string; sort_order?: number };
        Update: {
          is_active?: boolean;
          key?: string;
          name_bn?: string;
          name_en?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      content_settings: {
        Row: {
          description: string;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: never;
        Update: { value?: Json };
        Relationships: [];
      };
      model_answers: {
        Row: {
          answer_bn: string;
          answer_en: string;
          question_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      question_answer_keys: {
        Row: {
          correct_option_id: string;
          explanation_bn: string;
          explanation_en: string;
          question_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      question_assets: {
        Row: {
          alt_bn: string;
          alt_en: string;
          created_at: string;
          id: string;
          mime_type: string;
          owner_org_id: string;
          question_id: string;
          size_bytes: number;
          sort_order: number;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      question_options: {
        Row: {
          id: string;
          label: string;
          question_id: string;
          sort_order: number;
          text_bn: string;
          text_en: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      question_revisions: {
        Row: {
          actor_id: string | null;
          change_kind: string;
          created_at: string;
          from_status: Database["public"]["Enums"]["question_status"] | null;
          id: number;
          question_id: string;
          reason: string | null;
          revision: number;
          snapshot: Json;
          to_status: Database["public"]["Enums"]["question_status"];
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      questions: {
        Row: {
          bn_complete: boolean;
          created_at: string;
          created_by: string | null;
          difficulty: Database["public"]["Enums"]["question_difficulty"];
          en_complete: boolean;
          exam_target_id: string | null;
          id: string;
          import_key: string | null;
          marks: number;
          owner_org_id: string;
          published_at: string | null;
          reviewed_by: string | null;
          source_note: string | null;
          status: Database["public"]["Enums"]["question_status"];
          stem_bn: string;
          stem_en: string;
          stem_hash_bn: string | null;
          stem_hash_en: string | null;
          subject_id: string;
          topic_id: string;
          type: Database["public"]["Enums"]["question_type"];
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rubric_criteria: {
        Row: {
          id: string;
          max_marks: number;
          rubric_id: string;
          sort_order: number;
          text_bn: string;
          text_en: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          },
        ];
      };
      rubrics: {
        Row: {
          created_at: string;
          guidance_bn: string;
          guidance_en: string;
          id: string;
          question_id: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      topics: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name_bn: string;
          name_en: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          subject_id: string;
          updated_at: string;
        };
        Insert: {
          is_active?: boolean;
          name_bn: string;
          name_en: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          subject_id: string;
        };
        Update: {
          is_active?: boolean;
          name_bn?: string;
          name_en?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          subject_id?: string;
        };
        Relationships: [];
      };
      written_question_specs: {
        Row: {
          answer_mode: Database["public"]["Enums"]["written_answer_mode"];
          char_limit: number | null;
          question_id: string;
          word_limit: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      student_questions: {
        Row: {
          difficulty: Database["public"]["Enums"]["question_difficulty"];
          exam_target_id: string | null;
          id: string;
          marks: number;
          owner_org_id: string;
          published_at: string | null;
          stem_bn: string;
          stem_en: string;
          subject_id: string;
          topic_id: string;
          type: Database["public"]["Enums"]["question_type"];
        };
        Relationships: [];
      };
      student_question_options: {
        Row: {
          id: string;
          label: string;
          question_id: string;
          sort_order: number;
          text_bn: string;
          text_en: string;
        };
        Relationships: [];
      };
      student_written_specs: {
        Row: {
          answer_mode: Database["public"]["Enums"]["written_answer_mode"];
          char_limit: number | null;
          question_id: string;
          word_limit: number | null;
        };
        Relationships: [];
      };
    };
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
      add_question_asset: {
        Args: { p_alt_bn: string; p_alt_en: string; p_question_id: string; p_storage_path: string };
        Returns: string;
      };
      find_duplicate_questions: {
        Args: {
          p_exclude?: string;
          p_owner_org_id: string;
          p_stem_bn: string | null;
          p_stem_en: string | null;
        };
        Returns: {
          matched_language: string;
          question_id: string;
          status: Database["public"]["Enums"]["question_status"];
        }[];
      };
      join_public_organization: {
        Args: never;
        Returns: { joined: boolean; organization_slug: string }[];
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
      move_catalog_item: {
        Args: { p_direction: string; p_entity: string; p_id: string };
        Returns: undefined;
      };
      mark_notifications_read: { Args: { p_notification_ids?: string[] }; Returns: number };
      remove_member: { Args: { p_organization_id: string; p_user_id: string }; Returns: undefined };
      grant_platform_admin: {
        Args: { p_email: string };
        Returns: { slot: number; user_id: string }[];
      };
      revoke_platform_admin: { Args: { p_user_id: string }; Returns: undefined };
      remove_question_asset: { Args: { p_asset_id: string }; Returns: undefined };
      revoke_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
      save_question: {
        Args: { p_owner_org_id: string; p_payload: Json; p_question_id: string | null };
        Returns: { duplicate_ids: string[]; question_id: string; revision: number }[];
      };
      set_exam_target_subjects: {
        Args: { p_exam_target_id: string; p_subject_ids: string[] };
        Returns: undefined;
      };
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
      transition_question: {
        Args: { p_action: string; p_question_id: string; p_reason?: string | null };
        Returns: Database["public"]["Enums"]["question_status"];
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
      question_difficulty: "easy" | "medium" | "hard";
      question_status: "draft" | "in_review" | "published" | "archived";
      question_type: "mcq" | "written";
      written_answer_mode: "text" | "image" | "both";
      organization_type:
        "university" | "coaching_center" | "training_organization" | "independent_instructor" | "other";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
