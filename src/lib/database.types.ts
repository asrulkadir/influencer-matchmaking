/**
 * Database types matching the PostgreSQL schema in Supabase.
 * These define the database table types used with the Supabase client.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole = "BRAND" | "CREATOR" | "ADMIN";

export type SubscriptionTier = "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";

export type CampaignStatus =
  | "DRAFT"
  | "ACTIVE"
  | "MATCHING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type CreatorCampaignStatus =
  | "INVITED"
  | "ACCEPTED"
  | "CONTENT_SUBMITTED"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "PAID"
  | "REJECTED";

export type EscrowStatus =
  | "PENDING"
  | "FUNDED"
  | "RELEASED"
  | "REFUNDED"
  | "DISPUTED";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ─── Table Row Types ─────────────────────────────────────────────────────────

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type Account = {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};

export type Session = {
  id: string;
  sessionToken: string;
  userId: string;
  expires: string;
};

export type BrandProfile = {
  id: string;
  userId: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  logo: string | null;
  description: string | null;
  subscriptionTier: SubscriptionTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  monthlyBudget: number | null;
  campaignsUsed: number;
  outreachUsed: number;
  billingCycleStart: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatorProfile = {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  stripeAccountId: string | null;
  onboardingComplete: boolean;
  tiktokHandle: string | null;
  tiktokFollowers: number;
  tiktokEngagement: number;
  tiktokAccessToken: string | null;
  tiktokRefreshToken: string | null;
  instagramHandle: string | null;
  instagramFollowers: number;
  instagramEngagement: number;
  instagramAccessToken: string | null;
  totalFollowers: number;
  avgEngagement: number;
  contentRate: number | null;
  isAvailable: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NicheTag = {
  id: string;
  name: string;
  slug: string;
};

export type CreatorNicheTag = {
  creatorId: string;
  nicheTagId: string;
};

export type PortfolioItem = {
  id: string;
  creatorId: string;
  title: string;
  platform: string;
  url: string;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  createdAt: string;
};

export type Campaign = {
  id: string;
  brandId: string;
  title: string;
  description: string;
  brief: string | null;
  budget: number;
  budgetPerCreator: number | null;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  targetPlatforms: string[];
  targetFollowers: number | null;
  targetEngagement: number | null;
  maxCreators: number;
  escrowedBudget: number;
  fundedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignNicheTag = {
  campaignId: string;
  nicheTagId: string;
};

export type CampaignCreator = {
  id: string;
  campaignId: string;
  creatorId: string;
  status: CreatorCampaignStatus;
  matchScore: number | null;
  agreedRate: number | null;
  contentUrl: string | null;
  contentNotes: string | null;
  brandFeedback: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EscrowPayment = {
  id: string;
  campaignCreatorId: string;
  amount: number;
  platformFee: number;
  creatorPayout: number;
  currency: string;
  status: EscrowStatus;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  fundedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionPlan = {
  id: string;
  tier: SubscriptionTier;
  name: string;
  stripePriceId: string | null;
  monthlyPrice: number;
  campaignLimit: number;
  outreachLimit: number;
  analyticsAccess: boolean;
  prioritySupport: boolean;
  aiCampaignBriefs: boolean;
  features: string[];
  createdAt: string;
};

export type AnalyticsReport = {
  id: string;
  creatorId: string;
  platform: string;
  periodStart: string;
  periodEnd: string;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  topPosts: Json | null;
  demographics: Json | null;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  metadata: Json | null;
  createdAt: string;
};

export type CampaignFundingLog = {
  id: string;
  campaignId: string;
  action: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  metadata: Json | null;
  createdAt: string;
};

// ─── Supabase Database Type Map ──────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      User: {
        Row: User;
        Insert: Partial<User> & Pick<User, "role">;
        Update: Partial<User>;
        Relationships: [];
      };
      Account: {
        Row: Account;
        Insert: Partial<Account> & Pick<Account, "userId" | "type" | "provider" | "providerAccountId">;
        Update: Partial<Account>;
        Relationships: [
          {
            foreignKeyName: "Account_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      Session: {
        Row: Session;
        Insert: Partial<Session> & Pick<Session, "sessionToken" | "userId" | "expires">;
        Update: Partial<Session>;
        Relationships: [
          {
            foreignKeyName: "Session_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      BrandProfile: {
        Row: BrandProfile;
        Insert: Partial<BrandProfile> & Pick<BrandProfile, "userId" | "companyName">;
        Update: Partial<BrandProfile>;
        Relationships: [
          {
            foreignKeyName: "BrandProfile_userId_fkey";
            columns: ["userId"];
            isOneToOne: true;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      CreatorProfile: {
        Row: CreatorProfile;
        Insert: Partial<CreatorProfile> & Pick<CreatorProfile, "userId" | "displayName">;
        Update: Partial<CreatorProfile>;
        Relationships: [
          {
            foreignKeyName: "CreatorProfile_userId_fkey";
            columns: ["userId"];
            isOneToOne: true;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      NicheTag: {
        Row: NicheTag;
        Insert: Partial<NicheTag> & Pick<NicheTag, "name" | "slug">;
        Update: Partial<NicheTag>;
        Relationships: [];
      };
      CreatorNicheTag: {
        Row: CreatorNicheTag;
        Insert: CreatorNicheTag;
        Update: Partial<CreatorNicheTag>;
        Relationships: [
          {
            foreignKeyName: "CreatorNicheTag_creatorId_fkey";
            columns: ["creatorId"];
            isOneToOne: false;
            referencedRelation: "CreatorProfile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "CreatorNicheTag_nicheTagId_fkey";
            columns: ["nicheTagId"];
            isOneToOne: false;
            referencedRelation: "NicheTag";
            referencedColumns: ["id"];
          },
        ];
      };
      PortfolioItem: {
        Row: PortfolioItem;
        Insert: Partial<PortfolioItem> & Pick<PortfolioItem, "creatorId" | "title" | "platform" | "url">;
        Update: Partial<PortfolioItem>;
        Relationships: [
          {
            foreignKeyName: "PortfolioItem_creatorId_fkey";
            columns: ["creatorId"];
            isOneToOne: false;
            referencedRelation: "CreatorProfile";
            referencedColumns: ["id"];
          },
        ];
      };
      Campaign: {
        Row: Campaign;
        Insert: Partial<Campaign> & Pick<Campaign, "brandId" | "title" | "description" | "budget" | "maxCreators">;
        Update: Partial<Campaign>;
        Relationships: [
          {
            foreignKeyName: "Campaign_brandId_fkey";
            columns: ["brandId"];
            isOneToOne: false;
            referencedRelation: "BrandProfile";
            referencedColumns: ["id"];
          },
        ];
      };
      CampaignNicheTag: {
        Row: CampaignNicheTag;
        Insert: CampaignNicheTag;
        Update: Partial<CampaignNicheTag>;
        Relationships: [
          {
            foreignKeyName: "CampaignNicheTag_campaignId_fkey";
            columns: ["campaignId"];
            isOneToOne: false;
            referencedRelation: "Campaign";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "CampaignNicheTag_nicheTagId_fkey";
            columns: ["nicheTagId"];
            isOneToOne: false;
            referencedRelation: "NicheTag";
            referencedColumns: ["id"];
          },
        ];
      };
      CampaignCreator: {
        Row: CampaignCreator;
        Insert: Partial<CampaignCreator> & Pick<CampaignCreator, "campaignId" | "creatorId">;
        Update: Partial<CampaignCreator>;
        Relationships: [
          {
            foreignKeyName: "CampaignCreator_campaignId_fkey";
            columns: ["campaignId"];
            isOneToOne: false;
            referencedRelation: "Campaign";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "CampaignCreator_creatorId_fkey";
            columns: ["creatorId"];
            isOneToOne: false;
            referencedRelation: "CreatorProfile";
            referencedColumns: ["id"];
          },
        ];
      };
      EscrowPayment: {
        Row: EscrowPayment;
        Insert: Partial<EscrowPayment> & Pick<EscrowPayment, "campaignCreatorId" | "amount" | "platformFee" | "creatorPayout">;
        Update: Partial<EscrowPayment>;
        Relationships: [
          {
            foreignKeyName: "EscrowPayment_campaignCreatorId_fkey";
            columns: ["campaignCreatorId"];
            isOneToOne: true;
            referencedRelation: "CampaignCreator";
            referencedColumns: ["id"];
          },
        ];
      };
      SubscriptionPlan: {
        Row: SubscriptionPlan;
        Insert: Partial<SubscriptionPlan> & Pick<SubscriptionPlan, "tier" | "name" | "monthlyPrice" | "campaignLimit" | "outreachLimit">;
        Update: Partial<SubscriptionPlan>;
        Relationships: [];
      };
      AnalyticsReport: {
        Row: AnalyticsReport;
        Insert: Partial<AnalyticsReport> & Pick<AnalyticsReport, "creatorId" | "platform" | "periodStart" | "periodEnd">;
        Update: Partial<AnalyticsReport>;
        Relationships: [
          {
            foreignKeyName: "AnalyticsReport_creatorId_fkey";
            columns: ["creatorId"];
            isOneToOne: false;
            referencedRelation: "CreatorProfile";
            referencedColumns: ["id"];
          },
        ];
      };
      Notification: {
        Row: Notification;
        Insert: Partial<Notification> & Pick<Notification, "userId" | "title" | "message" | "type">;
        Update: Partial<Notification>;
        Relationships: [
          {
            foreignKeyName: "Notification_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "User";
            referencedColumns: ["id"];
          },
        ];
      };
      CampaignFundingLog: {
        Row: CampaignFundingLog;
        Insert: Partial<CampaignFundingLog> & Pick<CampaignFundingLog, "campaignId" | "action" | "amount" | "balanceBefore" | "balanceAfter">;
        Update: Partial<CampaignFundingLog>;
        Relationships: [
          {
            foreignKeyName: "CampaignFundingLog_campaignId_fkey";
            columns: ["campaignId"];
            isOneToOne: false;
            referencedRelation: "Campaign";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allocate_campaign_escrow: {
        Args: {
          p_campaign_id: string;
          p_campaign_creator_id: string;
          p_amount: number;
          p_platform_fee: number;
          p_creator_payout: number;
        };
        Returns: Json;
      };
      deallocate_campaign_escrow: {
        Args: {
          p_campaign_id: string;
          p_campaign_creator_id: string;
          p_amount: number;
          p_reason: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      UserRole: UserRole;
      SubscriptionTier: SubscriptionTier;
      CampaignStatus: CampaignStatus;
      CreatorCampaignStatus: CreatorCampaignStatus;
      EscrowStatus: EscrowStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
