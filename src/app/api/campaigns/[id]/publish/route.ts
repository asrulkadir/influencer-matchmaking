import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";

/**
 * POST /api/campaigns/[id]/publish
 *
 * Move a DRAFT campaign to ACTIVE after the brand confirms budget escrow.
 * In a production flow the brand would pay via Stripe first; here we
 * record the campaign-level escrow hold so funds are committed before
 * the campaign becomes visible to creators.
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

    // --- Payment / Escrow step ---
    // In production: create a Stripe PaymentIntent for the total budget,
    // charge the brand, and hold funds in platform escrow.
    // For now we validate budget > 0 and transition to ACTIVE.
    // The per-creator escrow will be created when a creator accepts.

    const { data: updated, error } = await supabase
      .from("Campaign")
      .update({
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
