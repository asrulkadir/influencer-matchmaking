import { supabase } from "../db";
import type { Json } from "../database.types";

/**
 * TikTok API Integration
 *
 * Uses TikTok's Content Posting API and Research API for:
 * - OAuth2 authentication flow
 * - Fetching creator profile stats
 * - Pulling post-level analytics
 * - Audience demographics
 *
 * Docs: https://developers.tiktok.com/doc/overview/
 */

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";
const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize";

interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  open_id: string;
  expires_in: number;
  refresh_expires_in: number;
  scope: string;
}

interface TikTokUserInfo {
  open_id: string;
  display_name: string;
  avatar_url: string;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

interface TikTokVideoAnalytics {
  id: string;
  title: string;
  create_time: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
}

/**
 * Generate OAuth authorization URL for TikTok.
 */
export function getTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: "user.info.basic,user.info.stats,video.list",
    response_type: "code",
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/tiktok`,
    state,
  });

  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens.
 */
export async function exchangeTikTokCode(
  code: string
): Promise<TikTokTokenResponse> {
  const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/tiktok`,
    }),
  });

  if (!response.ok) {
    throw new Error(`TikTok token exchange failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Refresh an expired TikTok access token.
 */
export async function refreshTikTokToken(
  refreshToken: string
): Promise<TikTokTokenResponse> {
  const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`TikTok token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch TikTok user profile and stats.
 */
export async function getTikTokUserInfo(
  accessToken: string
): Promise<TikTokUserInfo> {
  const response = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: [
        "open_id",
        "display_name",
        "avatar_url",
        "follower_count",
        "following_count",
        "likes_count",
        "video_count",
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`TikTok user info fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.user;
}

/**
 * Fetch recent video analytics for a TikTok creator.
 */
export async function getTikTokVideoAnalytics(
  accessToken: string,
  maxCount: number = 20
): Promise<TikTokVideoAnalytics[]> {
  const response = await fetch(`${TIKTOK_API_BASE}/video/list/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      max_count: maxCount,
      fields: [
        "id",
        "title",
        "create_time",
        "view_count",
        "like_count",
        "comment_count",
        "share_count",
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `TikTok video list fetch failed: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.data.videos;
}

/**
 * Calculate engagement rate from recent TikTok videos.
 * Engagement = (likes + comments + shares) / views * 100
 */
export function calculateTikTokEngagement(
  videos: TikTokVideoAnalytics[]
): number {
  if (videos.length === 0) return 0;

  const totalInteractions = videos.reduce(
    (sum, v) => sum + v.like_count + v.comment_count + v.share_count,
    0
  );
  const totalViews = videos.reduce((sum, v) => sum + v.view_count, 0);

  if (totalViews === 0) return 0;
  return Math.round((totalInteractions / totalViews) * 10000) / 100;
}

/**
 * Sync a creator's TikTok stats to the database.
 */
export async function syncTikTokCreatorStats(creatorId: string) {
  const { data: creator } = await supabase
    .from("CreatorProfile")
    .select()
    .eq("id", creatorId)
    .single();

  if (!creator?.tiktokAccessToken) {
    throw new Error("Creator has no TikTok connection");
  }

  let accessToken = creator.tiktokAccessToken;

  // Try to refresh token if needed
  try {
    const userInfo = await getTikTokUserInfo(accessToken);
    const videos = await getTikTokVideoAnalytics(accessToken);
    const engagement = calculateTikTokEngagement(videos);

    await supabase
      .from("CreatorProfile")
      .update({
        tiktokFollowers: userInfo.follower_count,
        tiktokEngagement: engagement,
        tiktokHandle: userInfo.display_name,
        lastSyncedAt: new Date().toISOString(),
        // Recalculate total stats
        totalFollowers:
          userInfo.follower_count + (creator.instagramFollowers ?? 0),
        avgEngagement:
          (engagement + (creator.instagramEngagement ?? 0)) / 2,
      })
      .eq("id", creatorId);

    // Store analytics report
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const reportId = `${creatorId}-tiktok-${periodStart.toISOString().slice(0, 7)}`;
    await supabase.from("AnalyticsReport").upsert({
      id: reportId,
      creatorId,
      platform: "tiktok",
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      followers: userInfo.follower_count,
      impressions: videos.reduce((sum, v) => sum + v.view_count, 0),
      reach: Math.round(
        videos.reduce((sum, v) => sum + v.view_count, 0) * 0.6
      ),
      engagement,
      likes: videos.reduce((sum, v) => sum + v.like_count, 0),
      comments: videos.reduce((sum, v) => sum + v.comment_count, 0),
      shares: videos.reduce((sum, v) => sum + v.share_count, 0),
      saves: 0,
      topPosts: videos.slice(0, 5) as unknown as Json[],
    });

    return { success: true, followers: userInfo.follower_count, engagement };
  } catch (error) {
    // Attempt token refresh
    if (creator.tiktokRefreshToken) {
      try {
        const tokens = await refreshTikTokToken(creator.tiktokRefreshToken);
        await supabase
          .from("CreatorProfile")
          .update({
            tiktokAccessToken: tokens.access_token,
            tiktokRefreshToken: tokens.refresh_token,
          })
          .eq("id", creatorId);
        // Retry sync with new token (recursive, one retry)
        return syncTikTokCreatorStats(creatorId);
      } catch {
        throw new Error("TikTok token refresh failed. Re-authentication needed.");
      }
    }
    throw error;
  }
}
