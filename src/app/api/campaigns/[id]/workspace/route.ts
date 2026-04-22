import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { z } from "zod";

const submitContentSchema = z.object({
  contentUrl: z.string().url(),
  contentNotes: z.string().max(2000).optional(),
});

const reviewSchema = z.object({
  campaignCreatorId: z.string().min(1),
  action: z.enum(["approve", "request_revision", "reject"]),
  brandFeedback: z.string().max(2000).optional(),
});

/**
 * GET /api/campaigns/[id]/workspace
 * Returns the campaign detail + the current creator's CampaignCreator record.
 * Used by creators to view their workspace for a specific campaign.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;

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

    const { data: campaignCreator } = await supabase
      .from("CampaignCreator")
      .select(
        "*, campaign:Campaign(*, brand:BrandProfile(companyName, logo, website)), escrow:EscrowPayment(status, amount, creatorPayout, currency)"
      )
      .eq("campaignId", campaignId)
      .eq("creatorId", creator.id)
      .single();

    if (!campaignCreator) {
      return NextResponse.json(
        { error: "You are not part of this campaign" },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaignCreator });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/campaigns/[id]/workspace
 * Creator submits content for this campaign.
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
    const body = await request.json();
    const { contentUrl, contentNotes } = submitContentSchema.parse(body);

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

    const { data: cc } = await supabase
      .from("CampaignCreator")
      .select("id, status, campaign:Campaign(title, brand:BrandProfile(userId))")
      .eq("campaignId", campaignId)
      .eq("creatorId", creator.id)
      .single();

    if (!cc) {
      return NextResponse.json(
        { error: "You are not part of this campaign" },
        { status: 404 }
      );
    }

    if (!["ACCEPTED", "REVISION_REQUESTED"].includes(cc.status)) {
      return NextResponse.json(
        {
          error: `Cannot submit content in "${cc.status}" status. Must be ACCEPTED or REVISION_REQUESTED.`,
        },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("CampaignCreator")
      .update({
        status: "CONTENT_SUBMITTED",
        contentUrl,
        contentNotes: contentNotes ?? null,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", cc.id)
      .select()
      .single();

    if (error) throw error;

    // Notify the brand
    const brandUserId = (cc.campaign as any)?.brand?.userId;
    if (brandUserId) {
      await supabase.from("Notification").insert({
        userId: brandUserId,
        title: "Content Submitted for Review",
        message: `A creator submitted content for "${(cc.campaign as any).title}". Review it now!`,
        type: "content_submitted",
        metadata: { campaignId, campaignCreatorId: cc.id },
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

/**
 * PATCH /api/campaigns/[id]/workspace
 * Brand reviews submitted content: approve or request revision.
 * On approve → marks APPROVED, releases escrow, marks PAID.
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
    const { campaignCreatorId, action, brandFeedback } =
      reviewSchema.parse(body);

    // Verify the brand owns this campaign
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

    // Fetch the campaign creator record
    const { data: cc } = await supabase
      .from("CampaignCreator")
      .select("*, creator:CreatorProfile(userId, displayName)")
      .eq("id", campaignCreatorId)
      .eq("campaignId", campaignId)
      .single();

    if (!cc) {
      return NextResponse.json(
        { error: "Campaign creator record not found" },
        { status: 404 }
      );
    }

    if (cc.status !== "CONTENT_SUBMITTED" && action !== "reject") {
      return NextResponse.json(
        { error: `Cannot review content in "${cc.status}" status` },
        { status: 400 }
      );
    }

    if (action === "reject" && !["CONTENT_SUBMITTED", "ACCEPTED", "REVISION_REQUESTED"].includes(cc.status)) {
      return NextResponse.json(
        { error: `Cannot reject creator in "${cc.status}" status` },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // 1. Find escrow first — must exist and be FUNDED to proceed
      const { data: escrow, error: escrowFetchErr } = await supabase
        .from("EscrowPayment")
        .select("id, status, amount")
        .eq("campaignCreatorId", cc.id)
        .single();

      if (escrowFetchErr || !escrow) {
        return NextResponse.json(
          { error: "Escrow payment not found for this creator. Cannot approve without funded escrow." },
          { status: 400 }
        );
      }

      if (escrow.status !== "FUNDED") {
        return NextResponse.json(
          { error: `Escrow is in "${escrow.status}" status. Expected "FUNDED" to release payment.` },
          { status: 400 }
        );
      }

      // 2. Release escrow → RELEASED
      const { error: releaseErr } = await supabase
        .from("EscrowPayment")
        .update({
          status: "RELEASED",
          releasedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", escrow.id);

      if (releaseErr) {
        return NextResponse.json(
          { error: `Failed to release escrow: ${releaseErr.message}` },
          { status: 500 }
        );
      }

      // 2b. Audit log: escrow released
      await supabase.from("CampaignFundingLog").insert({
        campaignId,
        action: "RELEASED",
        amount: Number(escrow.amount),
        balanceBefore: Number(campaign.budget) - Number(campaign.escrowedBudget ?? 0),
        balanceAfter: Number(campaign.budget) - Number(campaign.escrowedBudget ?? 0),
        metadata: {
          campaignCreatorId: cc.id,
          escrowId: escrow.id,
          creatorName: cc.creator?.displayName,
        },
      });

      // 3. Mark CampaignCreator as PAID (skip APPROVED intermediate state)
      const { data: updated, error: updateErr } = await supabase
        .from("CampaignCreator")
        .update({
          status: "PAID",
          brandFeedback: brandFeedback ?? null,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", cc.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // 4. Check if ALL creators in this campaign are PAID/REJECTED → mark campaign COMPLETED
      const { data: allCreators } = await supabase
        .from("CampaignCreator")
        .select("status")
        .eq("campaignId", campaignId);

      const allDone = (allCreators ?? []).every(
        (c) => c.status === "PAID" || c.status === "REJECTED"
      );

      if (allDone) {
        await supabase
          .from("Campaign")
          .update({
            status: "COMPLETED",
            updatedAt: new Date().toISOString(),
          })
          .eq("id", campaignId);
      }

      // 5. Notify creator
      if (cc.creator?.userId) {
        await supabase.from("Notification").insert({
          userId: cc.creator.userId,
          title: "Content Approved! Payment Released",
          message: `Your content for "${campaign.title}" has been approved! Payment has been released to your account.`,
          type: "content_approved",
          metadata: { campaignId, campaignCreatorId: cc.id },
        });
      }

      return NextResponse.json({
        campaignCreator: updated,
      });
    } else if (action === "reject") {
      // Reject the creator — refund escrow if it exists, deallocate budget
      const { data: escrow } = await supabase
        .from("EscrowPayment")
        .select("id, status, amount")
        .eq("campaignCreatorId", cc.id)
        .single();

      if (escrow && escrow.status === "FUNDED") {
        // Refund the escrow
        await supabase
          .from("EscrowPayment")
          .update({
            status: "REFUNDED",
            updatedAt: new Date().toISOString(),
          })
          .eq("id", escrow.id);

        // Atomic deallocation — returns budget to pool and logs audit trail
        await supabase.rpc("deallocate_campaign_escrow", {
          p_campaign_id: campaignId,
          p_campaign_creator_id: cc.id,
          p_amount: Number(escrow.amount),
          p_reason: brandFeedback || "Creator rejected by brand",
        });
      }

      const { data: updated, error: updateErr } = await supabase
        .from("CampaignCreator")
        .update({
          status: "REJECTED",
          brandFeedback: brandFeedback ?? null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", cc.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Notify creator
      if (cc.creator?.userId) {
        await supabase.from("Notification").insert({
          userId: cc.creator.userId,
          title: "Removed from Campaign",
          message: `You have been removed from "${campaign.title}". ${brandFeedback ? `Reason: ${brandFeedback}` : ""}`,
          type: "creator_rejected",
          metadata: { campaignId, campaignCreatorId: cc.id },
        });
      }

      return NextResponse.json({ campaignCreator: updated });
    } else {
      // Request revision
      const { data: updated, error: updateErr } = await supabase
        .from("CampaignCreator")
        .update({
          status: "REVISION_REQUESTED",
          brandFeedback: brandFeedback ?? null,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", cc.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Notify creator
      if (cc.creator?.userId) {
        await supabase.from("Notification").insert({
          userId: cc.creator.userId,
          title: "Revision Requested",
          message: `The brand requested revisions for "${campaign.title}". ${brandFeedback ? `Feedback: ${brandFeedback}` : "Check the campaign workspace for details."}`,
          type: "revision_requested",
          metadata: { campaignId, campaignCreatorId: cc.id },
        });
      }

      return NextResponse.json({ campaignCreator: updated });
    }
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
