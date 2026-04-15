import { supabase } from "../db";
import type { Json } from "../database.types";

/**
 * Instagram Graph API Integration
 *
 * Uses Meta's Instagram Graph API for:
 * - OAuth2 authentication via Facebook Login
 * - Fetching creator profile and business account stats
 * - Media insights (reach, impressions, engagement)
 * - Audience demographics
 *
 * Docs: https://developers.facebook.com/docs/instagram-api/
 */

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";
const INSTAGRAM_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";

interface InstagramTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  biography: string;
}

interface InstagramMediaInsight {
  id: string;
  caption: string;
  media_type: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  insights: {
    impressions: number;
    reach: number;
    saved: number;
    shares: number;
  };
}

/**
 * Generate OAuth authorization URL for Instagram via Facebook.
 */
export function getInstagramAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`,
    scope:
      "instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement",
    response_type: "code",
    state,
  });

  return `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for a long-lived access token.
 */
export async function exchangeInstagramCode(
  code: string
): Promise<InstagramTokenResponse> {
  // Step 1: Get short-lived token
  const shortTokenRes = await fetch(`${GRAPH_API_BASE}/oauth/access_token`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const shortTokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  shortTokenUrl.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  shortTokenUrl.searchParams.set(
    "client_secret",
    process.env.INSTAGRAM_APP_SECRET!
  );
  shortTokenUrl.searchParams.set(
    "redirect_uri",
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`
  );
  shortTokenUrl.searchParams.set("code", code);
  shortTokenUrl.searchParams.set("grant_type", "authorization_code");

  const tokenRes = await fetch(shortTokenUrl.toString());
  if (!tokenRes.ok) {
    throw new Error(`Instagram token exchange failed: ${tokenRes.statusText}`);
  }
  const shortToken = await tokenRes.json();

  // Step 2: Exchange for long-lived token (60 days)
  const longTokenUrl = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
  longTokenUrl.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  longTokenUrl.searchParams.set(
    "client_secret",
    process.env.INSTAGRAM_APP_SECRET!
  );
  longTokenUrl.searchParams.set(
    "fb_exchange_token",
    shortToken.access_token
  );

  const longRes = await fetch(longTokenUrl.toString());
  if (!longRes.ok) {
    throw new Error(`Instagram long-lived token exchange failed`);
  }

  return longRes.json();
}

/**
 * Fetch Instagram Business account profile.
 */
export async function getInstagramProfile(
  accessToken: string,
  igUserId: string
): Promise<InstagramProfile> {
  const url = new URL(`${GRAPH_API_BASE}/${igUserId}`);
  url.searchParams.set(
    "fields",
    "id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography"
  );
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Instagram profile fetch failed: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetch recent media with insights.
 */
export async function getInstagramMediaInsights(
  accessToken: string,
  igUserId: string,
  limit: number = 25
): Promise<InstagramMediaInsight[]> {
  // Fetch recent media
  const mediaUrl = new URL(`${GRAPH_API_BASE}/${igUserId}/media`);
  mediaUrl.searchParams.set(
    "fields",
    "id,caption,media_type,timestamp,like_count,comments_count"
  );
  mediaUrl.searchParams.set("limit", String(limit));
  mediaUrl.searchParams.set("access_token", accessToken);

  const mediaRes = await fetch(mediaUrl.toString());
  if (!mediaRes.ok) {
    throw new Error(`Instagram media fetch failed: ${mediaRes.statusText}`);
  }

  const mediaData = await mediaRes.json();
  const media = mediaData.data || [];

  // Fetch insights for each media item
  const enriched: InstagramMediaInsight[] = await Promise.all(
    media.map(async (item: any) => {
      try {
        const insightUrl = new URL(
          `${GRAPH_API_BASE}/${item.id}/insights`
        );
        insightUrl.searchParams.set(
          "metric",
          "impressions,reach,saved,shares"
        );
        insightUrl.searchParams.set("access_token", accessToken);

        const insightRes = await fetch(insightUrl.toString());
        const insightData = insightRes.ok ? await insightRes.json() : null;

        const insights = insightData?.data?.reduce(
          (acc: any, metric: any) => {
            acc[metric.name] = metric.values?.[0]?.value ?? 0;
            return acc;
          },
          { impressions: 0, reach: 0, saved: 0, shares: 0 }
        ) ?? { impressions: 0, reach: 0, saved: 0, shares: 0 };

        return { ...item, insights };
      } catch {
        return {
          ...item,
          insights: { impressions: 0, reach: 0, saved: 0, shares: 0 },
        };
      }
    })
  );

  return enriched;
}

/**
 * Calculate engagement rate from Instagram media.
 * Engagement = (likes + comments + saves + shares) / reach * 100
 */
export function calculateInstagramEngagement(
  media: InstagramMediaInsight[],
  followerCount: number
): number {
  if (media.length === 0 || followerCount === 0) return 0;

  const totalInteractions = media.reduce(
    (sum, m) =>
      sum +
      m.like_count +
      m.comments_count +
      (m.insights?.saved ?? 0) +
      (m.insights?.shares ?? 0),
    0
  );

  // Use follower count as denominator for consistent comparison
  return (
    Math.round((totalInteractions / (media.length * followerCount)) * 10000) /
    100
  );
}

/**
 * Sync a creator's Instagram stats to the database.
 */
export async function syncInstagramCreatorStats(creatorId: string) {
  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select()
    .eq("id", creatorId)
    .single();

  if (!creator?.instagramAccessToken || !creator?.instagramHandle) {
    throw new Error("Creator has no Instagram connection");
  }

  try {
    // We need the IG user ID — stored as handle for simplicity
    // In production, you'd store the numeric IG business account ID
    const profile = await getInstagramProfile(
      creator.instagramAccessToken,
      creator.instagramHandle
    );

    const media = await getInstagramMediaInsights(
      creator.instagramAccessToken,
      profile.id
    );

    const engagement = calculateInstagramEngagement(
      media,
      profile.followers_count
    );

    await supabase
      .from("CreatorProfile")
      .update({
        instagramFollowers: profile.followers_count,
        instagramEngagement: engagement,
        lastSyncedAt: new Date().toISOString(),
        totalFollowers:
          profile.followers_count + (creator.tiktokFollowers ?? 0),
        avgEngagement:
          (engagement + (creator.tiktokEngagement ?? 0)) / 2,
      })
      .eq("id", creatorId);

    // Store analytics report
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalImpressions = media.reduce(
      (sum, m) => sum + m.insights.impressions,
      0
    );
    const totalReach = media.reduce((sum, m) => sum + m.insights.reach, 0);

    const reportId = `${creatorId}-instagram-${periodStart.toISOString().slice(0, 7)}`;
    await supabase.from("AnalyticsReport").upsert({
      id: reportId,
      creatorId,
      platform: "instagram",
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      followers: profile.followers_count,
      impressions: totalImpressions,
      reach: totalReach,
      engagement,
      likes: media.reduce((sum, m) => sum + m.like_count, 0),
      comments: media.reduce((sum, m) => sum + m.comments_count, 0),
      shares: media.reduce((sum, m) => sum + (m.insights.shares ?? 0), 0),
      saves: media.reduce((sum, m) => sum + (m.insights.saved ?? 0), 0),
      topPosts: media
        .sort((a, b) => b.like_count - a.like_count)
        .slice(0, 5) as unknown as Json[],
    });

    return {
      success: true,
      followers: profile.followers_count,
      engagement,
    };
  } catch (error) {
    throw new Error(
      `Instagram sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
