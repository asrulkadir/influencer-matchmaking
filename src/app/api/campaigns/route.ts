import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { runCampaignMatching } from "@/lib/matching-algorithm";
import { SUBSCRIPTION_CONFIG } from "@/lib/stripe";
import { z } from "zod";
import type { CampaignStatus } from "@/lib/database.types";

const createCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  budget: z.number().positive(),
  budgetPerCreator: z.number().positive().optional(),
  targetPlatforms: z.array(z.enum(["tiktok", "instagram"])).min(1),
  targetFollowers: z.number().int().positive().optional(),
  targetEngagement: z.number().positive().optional(),
  maxCreators: z.number().int().min(1).max(100).default(5),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  nicheTagIds: z.array(z.string()).optional(),
});

/**
 * GET /api/campaigns — List campaigns for the current brand.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["BRAND", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");

    const { data: brand } = await supabase
      .from("BrandProfile")
      .select()
      .eq("userId", user.id)
      .single();

    if (!brand) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }

    let query = supabase
      .from("Campaign")
      .select(
        "*, nicheTags:CampaignNicheTag(*, nicheTag:NicheTag(*)), campaignCreators:CampaignCreator(*, creator:CreatorProfile(id, displayName, avatarUrl, avgEngagement, totalFollowers), escrow:EscrowPayment(status, amount))",
        { count: "exact" }
      )
      .eq("brandId", brand.id)
      .order("createdAt", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq("status", status as CampaignStatus);
    }

    const { data: campaigns, count } = await query;
    const total = count ?? 0;

    return NextResponse.json({
      campaigns: campaigns ?? [],
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Forbidden")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/campaigns — Create a new campaign and optionally trigger matching.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["BRAND"]);

    const { data: brand } = await supabase
      .from("BrandProfile")
      .select()
      .eq("userId", user.id)
      .single();

    if (!brand) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }

    // Check subscription limits
    const tierConfig = SUBSCRIPTION_CONFIG[brand.subscriptionTier];
    if (
      tierConfig.campaignLimit !== -1 &&
      brand.campaignsUsed >= tierConfig.campaignLimit
    ) {
      return NextResponse.json(
        {
          error: `Campaign limit reached for ${brand.subscriptionTier} plan. Upgrade to create more campaigns.`,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    // Create campaign
    const { data: newCampaign, error: campaignError } = await supabase
      .from("Campaign")
      .insert({
        brandId: brand.id,
        title: validated.title,
        description: validated.description,
        budget: validated.budget,
        budgetPerCreator: validated.budgetPerCreator ?? null,
        targetPlatforms: validated.targetPlatforms,
        targetFollowers: validated.targetFollowers ?? null,
        targetEngagement: validated.targetEngagement ?? null,
        maxCreators: validated.maxCreators,
        startDate: validated.startDate ?? null,
        endDate: validated.endDate ?? null,
        status: "DRAFT",
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Associate niche tags
    if (validated.nicheTagIds?.length) {
      await supabase.from("CampaignNicheTag").insert(
        validated.nicheTagIds.map((tagId) => ({
          campaignId: newCampaign.id,
          nicheTagId: tagId,
        }))
      );
    }

    // Increment campaigns used counter
    await supabase
      .from("BrandProfile")
      .update({ campaignsUsed: brand.campaignsUsed + 1 })
      .eq("id", brand.id);

    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
