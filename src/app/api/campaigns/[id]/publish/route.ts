import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";

/**
 * POST /api/campaigns/[id]/publish
 *
 * Move a DRAFT campaign to ACTIVE.
 * Locks the campaign budget (marks fundedAt) so the funds are committed.
 * In production, this would also charge the brand via Stripe PaymentIntent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;

    // Verify brand owns this campaign
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

    if (campaign.brand.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (campaign.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT campaigns can be published" },
        { status: 400 }
      );
    }

    if (Number(campaign.budget) <= 0) {
      return NextResponse.json(
        { error: "Campaign budget must be greater than zero" },
        { status: 400 }
      );
    }

    // --- Fund Locking ---
    // In production: create a Stripe PaymentIntent for the total budget,
    // charge the brand's payment method, and hold funds on the platform.
    // For now: mark fundedAt to indicate funds are committed, and log it.
    const now = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("Campaign")
      .update({
        status: "ACTIVE",
        fundedAt: now,
        updatedAt: now,
      })
      .eq("id", campaignId)
      .select()
      .single();

    if (error) throw error;

    // Audit log: campaign funded
    await supabase.from("CampaignFundingLog").insert({
      campaignId,
      action: "FUNDED",
      amount: Number(campaign.budget),
      balanceBefore: 0,
      balanceAfter: Number(campaign.budget),
      metadata: {
        brandId: campaign.brandId,
        brandName: campaign.brand.companyName,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
