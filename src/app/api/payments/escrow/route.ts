import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { supabase } from "@/lib/db";
import {
  createEscrow,
  releaseEscrow,
  refundEscrow,
  disputeEscrow,
} from "@/lib/escrow";
import { z } from "zod";

const createEscrowSchema = z.object({
  campaignCreatorId: z.string(),
  amount: z.number().positive(),
});

const actionSchema = z.object({
  campaignCreatorId: z.string(),
  action: z.enum(["release", "refund", "dispute"]),
  reason: z.string().optional(),
});

/**
 * POST /api/payments/escrow — Create a new escrow payment.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["BRAND"]);
    const body = await request.json();
    const { campaignCreatorId, amount } = createEscrowSchema.parse(body);

    // Verify the brand owns this campaign
    const { data: campaignCreator } = await supabase
      .from("CampaignCreator")
      .select("*, campaign:Campaign(*, brand:BrandProfile(*))")
      .eq("id", campaignCreatorId)
      .single();

    if (!campaignCreator) {
      return NextResponse.json(
        { error: "Campaign creator not found" },
        { status: 404 }
      );
    }

    if (campaignCreator.campaign.brand.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await createEscrow({ campaignCreatorId, amount });

    return NextResponse.json(result, { status: 201 });
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
 * PATCH /api/payments/escrow — Perform escrow actions (release, refund, dispute).
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole(["BRAND", "ADMIN"]);
    const body = await request.json();
    const { campaignCreatorId, action, reason } = actionSchema.parse(body);

    let result: any;

    switch (action) {
      case "release":
        result = await releaseEscrow(campaignCreatorId);
        break;
      case "refund":
        result = await refundEscrow(
          campaignCreatorId,
          reason ?? "Content rejected"
        );
        break;
      case "dispute":
        if (user.role !== "ADMIN" && user.role !== "BRAND") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        result = await disputeEscrow(
          campaignCreatorId,
          reason ?? "Dispute raised"
        );
        break;
    }

    return NextResponse.json({ escrow: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
