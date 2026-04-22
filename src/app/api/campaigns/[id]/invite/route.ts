import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { z } from "zod";

const respondSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

/**
 * POST /api/campaigns/[id]/invite — Invite a creator to a campaign (brand).
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
    const { creatorId } = await request.json();

    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      );
    }

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

    if (!["ACTIVE", "MATCHING", "IN_PROGRESS"].includes(campaign.status)) {
      return NextResponse.json(
        { error: "Campaign must be active to invite creators" },
        { status: 400 }
      );
    }

    // Check if already invited
    const { data: existing } = await supabase
      .from("CampaignCreator")
      .select("id")
      .eq("campaignId", campaignId)
      .eq("creatorId", creatorId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Creator already invited to this campaign" },
        { status: 409 }
      );
    }

    // Check max creators limit
    const { count } = await supabase
      .from("CampaignCreator")
      .select("id", { count: "exact", head: true })
      .eq("campaignId", campaignId);

    if ((count ?? 0) >= campaign.maxCreators) {
      return NextResponse.json(
        { error: "Maximum number of creators reached for this campaign" },
        { status: 400 }
      );
    }

    const budgetPerCreator =
      campaign.budgetPerCreator ??
      Math.floor((Number(campaign.budget) / campaign.maxCreators) * 100) / 100;

    // Budget remaining check — prevent inviting more creators than budget allows
    const budgetRemaining =
      Number(campaign.budget) - Number(campaign.escrowedBudget ?? 0);
    if (budgetPerCreator > budgetRemaining) {
      return NextResponse.json(
        {
          error: `Insufficient campaign budget. Remaining: $${budgetRemaining.toFixed(2)}, required per creator: $${budgetPerCreator.toFixed(2)}.`,
          budgetRemaining,
          budgetPerCreator,
        },
        { status: 400 }
      );
    }

    const { data: invitation, error } = await supabase
      .from("CampaignCreator")
      .insert({
        campaignId,
        creatorId,
        status: "INVITED",
        agreedRate: budgetPerCreator,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify creator
    const { data: creator } = await supabase
      .from("CreatorProfile")
      .select("userId")
      .eq("id", creatorId)
      .single();

    if (creator) {
      await supabase.from("Notification").insert({
        userId: creator.userId,
        title: "New Campaign Invitation",
        message: `You've been invited to "${campaign.title}"! Check your invitations to respond.`,
        type: "campaign_invitation",
        metadata: { campaignId, campaignCreatorId: invitation.id },
      });
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/campaigns/[id]/invite — Respond to an invitation (creator).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const { action } = respondSchema.parse(body);

    // Find the creator profile
    const { data: creator } = await supabase
      .from("CreatorProfile")
      .select("id")
      .eq("userId", session.user.id)
      .single();

    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    // Find the invitation (include campaign budget info for escrow calculation)
    const { data: invitation } = await supabase
      .from("CampaignCreator")
      .select("*, campaign:Campaign(title, budget, budgetPerCreator, maxCreators, brand:BrandProfile(userId))")
      .eq("campaignId", campaignId)
      .eq("creatorId", creator.id)
      .eq("status", "INVITED")
      .single();

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found or already responded" },
        { status: 404 }
      );
    }

    const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

    const { data: updated, error } = await supabase
      .from("CampaignCreator")
      .update({ status: newStatus, updatedAt: new Date().toISOString() })
      .eq("id", invitation.id)
      .select()
      .single();

    if (error) throw error;

    // If accepted, create escrow payment atomically via Postgres function
    if (action === "accept") {
      const campaign = invitation.campaign as any;
      // Calculate amount from agreedRate, or fallback to campaign budget
      const amount = Number(invitation.agreedRate) ||
        Number(campaign?.budgetPerCreator) ||
        Math.floor((Number(campaign?.budget ?? 0) / Math.max(campaign?.maxCreators ?? 1, 1)) * 100) / 100;

      if (amount <= 0) {
        // Rollback
        await supabase
          .from("CampaignCreator")
          .update({ status: "INVITED", updatedAt: new Date().toISOString() })
          .eq("id", invitation.id);
        return NextResponse.json(
          { error: "Cannot calculate escrow amount. Campaign budget may not be set." },
          { status: 400 }
        );
      }

      // Update agreedRate if it was null
      if (!invitation.agreedRate) {
        await supabase
          .from("CampaignCreator")
          .update({ agreedRate: amount, updatedAt: new Date().toISOString() })
          .eq("id", invitation.id);
      }

      const platformFeePercent = 10;
      const platformFee = Math.round(amount * platformFeePercent) / 100;
      const creatorPayout = amount - platformFee;

      // Atomic allocation — locks campaign row, checks budget, creates escrow, logs audit
      const { data: allocResult, error: rpcErr } = await supabase.rpc(
        "allocate_campaign_escrow",
        {
          p_campaign_id: campaignId,
          p_campaign_creator_id: invitation.id,
          p_amount: amount,
          p_platform_fee: platformFee,
          p_creator_payout: creatorPayout,
        }
      );

      const result = allocResult as Record<string, unknown> | null;

      if (rpcErr) {
        // Rollback: revert CampaignCreator back to INVITED
        await supabase
          .from("CampaignCreator")
          .update({ status: "INVITED", updatedAt: new Date().toISOString() })
          .eq("id", invitation.id);
        throw new Error(`Escrow allocation failed: ${rpcErr.message}`);
      }

      if (!result?.success) {
        // Rollback: revert CampaignCreator back to INVITED
        await supabase
          .from("CampaignCreator")
          .update({ status: "INVITED", updatedAt: new Date().toISOString() })
          .eq("id", invitation.id);
        return NextResponse.json(
          { error: (result?.error as string) || "Budget allocation failed" },
          { status: 400 }
        );
      }
    }

    // Notify brand
    if (invitation.campaign?.brand?.userId) {
      await supabase.from("Notification").insert({
        userId: invitation.campaign.brand.userId,
        title:
          action === "accept"
            ? "Invitation Accepted!"
            : "Invitation Declined",
        message:
          action === "accept"
            ? `A creator accepted your invitation for "${invitation.campaign.title}". They can now start creating content!`
            : `A creator declined your invitation for "${invitation.campaign.title}".`,
        type:
          action === "accept"
            ? "invitation_accepted"
            : "invitation_rejected",
        metadata: {
          campaignId,
          campaignCreatorId: invitation.id,
        },
      });
    }

    return NextResponse.json({ campaignCreator: updated });
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
