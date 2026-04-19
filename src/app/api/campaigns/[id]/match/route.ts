import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { runCampaignMatching } from "@/lib/matching-algorithm";
import { supabase } from "@/lib/db";

/**
 * POST /api/campaigns/[id]/match — Run the matching algorithm for a campaign.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(["BRAND", "ADMIN"]);
    const { id: campaignId } = await params;

    // Verify ownership
    const { data: campaign } = await supabase
      .from("Campaign")
      .select("*, brand:BrandProfile(*)")
      .eq("id", campaignId)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.brand.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["DRAFT", "ACTIVE", "MATCHING"].includes(campaign.status)) {
      return NextResponse.json(
        { error: "Can only run matching on DRAFT, ACTIVE or MATCHING campaigns" },
        { status: 400 }
      );
    }

    const results = await runCampaignMatching(campaignId);

    return NextResponse.json({
      message: `Found ${results.length} potential matches`,
      matches: results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
