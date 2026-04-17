-- ============================================================
-- CreatorMatch Platform — Full Database Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('BRAND', 'CREATOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'MATCHING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CreatorCampaignStatus" AS ENUM ('INVITED', 'ACCEPTED', 'CONTENT_SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'PAID', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'FUNDED', 'RELEASED', 'REFUNDED', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── User (NextAuth) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "User" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "name"          TEXT,
  "email"         TEXT        UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  "image"         TEXT,
  "role"          "UserRole"  NOT NULL DEFAULT 'BRAND',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Account (NextAuth OAuth accounts) ──────────────────────
CREATE TABLE IF NOT EXISTS "Account" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId"            TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type"              TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token"     TEXT,
  "access_token"      TEXT,
  "expires_at"        BIGINT,
  "token_type"        TEXT,
  "scope"             TEXT,
  "id_token"          TEXT,
  "session_state"     TEXT,
  UNIQUE("provider", "providerAccountId")
);

-- ─── Session (NextAuth sessions) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "Session" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "sessionToken" TEXT        NOT NULL UNIQUE,
  "userId"       TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expires"      TIMESTAMPTZ NOT NULL
);

-- ─── NicheTag ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "NicheTag" (
  "id"   TEXT NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE
);

-- ─── BrandProfile ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "BrandProfile" (
  "id"                   TEXT              NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId"               TEXT              NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "companyName"          TEXT              NOT NULL,
  "website"              TEXT,
  "industry"             TEXT,
  "logo"                 TEXT,
  "description"          TEXT,
  "subscriptionTier"     "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "stripeCustomerId"     TEXT,
  "stripeSubscriptionId" TEXT,
  "monthlyBudget"        NUMERIC(12,2),
  "campaignsUsed"        INTEGER           NOT NULL DEFAULT 0,
  "outreachUsed"         INTEGER           NOT NULL DEFAULT 0,
  "billingCycleStart"    TIMESTAMPTZ,
  "createdAt"            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ─── CreatorProfile ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CreatorProfile" (
  "id"                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId"               TEXT        NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "displayName"          TEXT        NOT NULL,
  "bio"                  TEXT,
  "location"             TEXT,
  "avatarUrl"            TEXT,
  "stripeAccountId"      TEXT,
  "onboardingComplete"   BOOLEAN     NOT NULL DEFAULT false,
  "tiktokHandle"         TEXT,
  "tiktokFollowers"      INTEGER     NOT NULL DEFAULT 0,
  "tiktokEngagement"     NUMERIC(5,2) NOT NULL DEFAULT 0,
  "tiktokAccessToken"    TEXT,
  "tiktokRefreshToken"   TEXT,
  "instagramHandle"      TEXT,
  "instagramFollowers"   INTEGER     NOT NULL DEFAULT 0,
  "instagramEngagement"  NUMERIC(5,2) NOT NULL DEFAULT 0,
  "instagramAccessToken" TEXT,
  "totalFollowers"       INTEGER     NOT NULL DEFAULT 0,
  "avgEngagement"        NUMERIC(5,2) NOT NULL DEFAULT 0,
  "contentRate"          NUMERIC(10,2),
  "isAvailable"          BOOLEAN     NOT NULL DEFAULT true,
  "lastSyncedAt"         TIMESTAMPTZ,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CreatorNicheTag ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CreatorNicheTag" (
  "creatorId"  TEXT NOT NULL REFERENCES "CreatorProfile"("id") ON DELETE CASCADE,
  "nicheTagId" TEXT NOT NULL REFERENCES "NicheTag"("id") ON DELETE CASCADE,
  PRIMARY KEY ("creatorId", "nicheTagId")
);

-- ─── PortfolioItem ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PortfolioItem" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "creatorId"    TEXT        NOT NULL REFERENCES "CreatorProfile"("id") ON DELETE CASCADE,
  "title"        TEXT        NOT NULL,
  "platform"     TEXT        NOT NULL,
  "url"          TEXT        NOT NULL,
  "thumbnailUrl" TEXT,
  "views"        INTEGER     NOT NULL DEFAULT 0,
  "likes"        INTEGER     NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Campaign ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Campaign" (
  "id"               TEXT             NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "brandId"          TEXT             NOT NULL REFERENCES "BrandProfile"("id") ON DELETE CASCADE,
  "title"            TEXT             NOT NULL,
  "description"      TEXT             NOT NULL,
  "brief"            TEXT,
  "budget"           NUMERIC(12,2)    NOT NULL,
  "budgetPerCreator" NUMERIC(12,2),
  "status"           "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate"        TIMESTAMPTZ,
  "endDate"          TIMESTAMPTZ,
  "targetPlatforms"  TEXT[]           NOT NULL DEFAULT '{}',
  "targetFollowers"  INTEGER,
  "targetEngagement" NUMERIC(5,2),
  "maxCreators"      INTEGER          NOT NULL DEFAULT 5,
  "createdAt"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ─── CampaignNicheTag ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CampaignNicheTag" (
  "campaignId" TEXT NOT NULL REFERENCES "Campaign"("id") ON DELETE CASCADE,
  "nicheTagId" TEXT NOT NULL REFERENCES "NicheTag"("id") ON DELETE CASCADE,
  PRIMARY KEY ("campaignId", "nicheTagId")
);

-- ─── CampaignCreator ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CampaignCreator" (
  "id"            TEXT                    NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "campaignId"    TEXT                    NOT NULL REFERENCES "Campaign"("id") ON DELETE CASCADE,
  "creatorId"     TEXT                    NOT NULL REFERENCES "CreatorProfile"("id") ON DELETE CASCADE,
  "status"        "CreatorCampaignStatus" NOT NULL DEFAULT 'INVITED',
  "matchScore"    NUMERIC(5,2),
  "agreedRate"    NUMERIC(12,2),
  "contentUrl"    TEXT,
  "contentNotes"  TEXT,
  "brandFeedback" TEXT,
  "submittedAt"   TIMESTAMPTZ,
  "approvedAt"    TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  UNIQUE("campaignId", "creatorId")
);

-- ─── EscrowPayment ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EscrowPayment" (
  "id"                    TEXT           NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "campaignCreatorId"     TEXT           NOT NULL UNIQUE REFERENCES "CampaignCreator"("id") ON DELETE CASCADE,
  "amount"                NUMERIC(12,2)  NOT NULL,
  "platformFee"           NUMERIC(12,2)  NOT NULL,
  "creatorPayout"         NUMERIC(12,2)  NOT NULL,
  "currency"              TEXT           NOT NULL DEFAULT 'usd',
  "status"                "EscrowStatus" NOT NULL DEFAULT 'PENDING',
  "stripePaymentIntentId" TEXT,
  "stripeTransferId"      TEXT,
  "fundedAt"              TIMESTAMPTZ,
  "releasedAt"            TIMESTAMPTZ,
  "refundedAt"            TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── SubscriptionPlan ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id"               TEXT               NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "tier"             "SubscriptionTier" NOT NULL UNIQUE,
  "name"             TEXT               NOT NULL,
  "stripePriceId"    TEXT,
  "monthlyPrice"     NUMERIC(10,2)      NOT NULL,
  "campaignLimit"    INTEGER            NOT NULL,
  "outreachLimit"    INTEGER            NOT NULL,
  "analyticsAccess"  BOOLEAN            NOT NULL DEFAULT false,
  "prioritySupport"  BOOLEAN            NOT NULL DEFAULT false,
  "aiCampaignBriefs" BOOLEAN            NOT NULL DEFAULT false,
  "features"         TEXT[]             NOT NULL DEFAULT '{}',
  "createdAt"        TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ─── AnalyticsReport ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AnalyticsReport" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "creatorId"    TEXT        NOT NULL REFERENCES "CreatorProfile"("id") ON DELETE CASCADE,
  "platform"     TEXT        NOT NULL,
  "periodStart"  TIMESTAMPTZ NOT NULL,
  "periodEnd"    TIMESTAMPTZ NOT NULL,
  "followers"    INTEGER     NOT NULL DEFAULT 0,
  "impressions"  INTEGER     NOT NULL DEFAULT 0,
  "reach"        INTEGER     NOT NULL DEFAULT 0,
  "engagement"   NUMERIC(5,2) NOT NULL DEFAULT 0,
  "likes"        INTEGER     NOT NULL DEFAULT 0,
  "comments"     INTEGER     NOT NULL DEFAULT 0,
  "shares"       INTEGER     NOT NULL DEFAULT 0,
  "saves"        INTEGER     NOT NULL DEFAULT 0,
  "topPosts"     JSONB,
  "demographics" JSONB,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notification ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "userId"    TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"     TEXT        NOT NULL,
  "message"   TEXT        NOT NULL,
  "type"      TEXT        NOT NULL,
  "read"      BOOLEAN     NOT NULL DEFAULT false,
  "metadata"  JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Row Level Security ──────────────────────────────────────
-- Enable RLS on all tables (Supabase best practice)
ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandProfile"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreatorProfile"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NicheTag"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreatorNicheTag"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortfolioItem"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignNicheTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignCreator"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EscrowPayment"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsReport"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"     ENABLE ROW LEVEL SECURITY;

-- Service role bypass (used by the Next.js server via SUPABASE_SERVICE_ROLE_KEY)
-- All tables: allow full access to the service role
CREATE POLICY "service_role_all" ON "User"             FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "Account"          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "Session"          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "BrandProfile"     FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "CreatorProfile"   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "NicheTag"         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "CreatorNicheTag"  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "PortfolioItem"    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "Campaign"         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "CampaignNicheTag" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "CampaignCreator"  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "EscrowPayment"    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "SubscriptionPlan" FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "AnalyticsReport"  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON "Notification"     FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read for NicheTag and SubscriptionPlan (no auth needed)
CREATE POLICY "public_read" ON "NicheTag"         FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "SubscriptionPlan" FOR SELECT TO anon, authenticated USING (true);
