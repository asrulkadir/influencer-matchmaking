import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { syncTikTokCreatorStats } from "@/lib/social-media/tiktok";
import { syncInstagramCreatorStats } from "@/lib/social-media/instagram";

/**
 * GET /api/analytics — Get analytics reports for the current creator or a specific campaign.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["CREATOR", "BRAND", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const creatorId = searchParams.get("creatorId");
    const months = parseInt(searchParams.get("months") ?? "6");

    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - months);

    let query = supabase
      .from("AnalyticsReport")
      .select("*, creator:CreatorProfile(displayName, avatarUrl)")
      .gte("periodStart", periodStart.toISOString())
      .order("periodStart", { ascending: false });

    if (user.role === "CREATOR") {
      // Creator can only see their own analytics
      const { data: creator } = await supabase
        .from("CreatorProfile")
        .select("id")
        .eq("userId", user.id)
        .single();

      if (!creator) {
        return NextResponse.json(
          { error: "Creator profile not found" },
          { status: 404 }
        );
      }
      query = query.eq("creatorId", creator.id);
    } else if (creatorId) {
      query = query.eq("creatorId", creatorId);
    }

    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data: reports } = await query;
    const items = reports ?? [];

    // Aggregate stats
    const aggregated = {
      totalImpressions: items.reduce((sum, r) => sum + r.impressions, 0),
      totalReach: items.reduce((sum, r) => sum + r.reach, 0),
      avgEngagement:
        items.length > 0
          ? items.reduce((sum, r) => sum + r.engagement, 0) / items.length
          : 0,
      totalLikes: items.reduce((sum, r) => sum + r.likes, 0),
      totalComments: items.reduce((sum, r) => sum + r.comments, 0),
      totalShares: items.reduce((sum, r) => sum + r.shares, 0),
      totalSaves: items.reduce((sum, r) => sum + r.saves, 0),
    };

    return NextResponse.json({ reports: items, aggregated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/analytics/sync — Trigger a sync of social media stats.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["CREATOR", "ADMIN"]);

    const { data: creator } = await supabase
      .from("CreatorProfile")
      .select()
      .eq("userId", user.id)
      .single();

    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    const results: Record<string, any> = {};

    // Sync TikTok stats
    if (creator.tiktokAccessToken) {
      try {
        results.tiktok = await syncTikTokCreatorStats(creator.id);
      } catch (error) {
        results.tiktok = {
          success: false,
          error: error instanceof Error ? error.message : "Sync failed",
        };
      }
    }

    // Sync Instagram stats
    if (creator.instagramAccessToken) {
      try {
        results.instagram = await syncInstagramCreatorStats(creator.id);
      } catch (error) {
        results.instagram = {
          success: false,
          error: error instanceof Error ? error.message : "Sync failed",
        };
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
