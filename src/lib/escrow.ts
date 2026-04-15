import { supabase } from "./db";
import { stripe, PLATFORM_FEE_PERCENT } from "./stripe";

/**
 * Escrow Payment Service
 *
 * Flow:
 * 1. Brand approves a creator for a campaign → createEscrow()
 * 2. Brand funds the escrow via Stripe PaymentIntent → fundEscrow()
 * 3. Creator submits content → (status tracked in CampaignCreator)
 * 4. Brand approves content → releaseEscrow() → Stripe Transfer to creator
 * 5. If rejected/disputed → refundEscrow() or disputeEscrow()
 *
 * Funds are held on the platform's Stripe account until released.
 * Stripe Connect is used for creator payouts.
 */

interface CreateEscrowParams {
  campaignCreatorId: string;
  amount: number; // Total amount in dollars
  currency?: string;
}

/**
 * Create an escrow record and Stripe PaymentIntent for a campaign-creator pair.
 */
export async function createEscrow({
  campaignCreatorId,
  amount,
  currency = "usd",
}: CreateEscrowParams) {
  const { data: campaignCreator, error: ccError } = await supabase
    .from("CampaignCreator")
    .select("*, campaign:Campaign(*, brand:BrandProfile(*)), creator:CreatorProfile(*)")
    .eq("id", campaignCreatorId)
    .single();

  if (ccError || !campaignCreator) throw new Error("Campaign creator not found");
  if (!campaignCreator.campaign.brand.stripeCustomerId) {
    throw new Error("Brand has no Stripe customer on file");
  }

  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT) / 100;
  const creatorPayout = amount - platformFee;
  const amountCents = Math.round(amount * 100);

  // Create Stripe PaymentIntent (funds captured but not transferred yet)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: campaignCreator.campaign.brand.stripeCustomerId,
    metadata: {
      campaignCreatorId,
      campaignId: campaignCreator.campaignId,
      creatorId: campaignCreator.creatorId,
      type: "escrow",
    },
    // Manual capture to implement hold pattern
    capture_method: "manual",
  });

  const { data: escrow, error: escrowError } = await supabase
    .from("EscrowPayment")
    .insert({
      campaignCreatorId,
      amount,
      platformFee,
      creatorPayout,
      currency,
      status: "PENDING",
      stripePaymentIntentId: paymentIntent.id,
    })
    .select()
    .single();

  if (escrowError) throw escrowError;

  return {
    escrow,
    clientSecret: paymentIntent.client_secret,
  };
}

/**
 * Mark escrow as funded after brand confirms payment.
 * Called from Stripe webhook (payment_intent.amount_capturable_updated).
 */
export async function fundEscrow(stripePaymentIntentId: string) {
  // Capture the held funds
  await stripe.paymentIntents.capture(stripePaymentIntentId);

  const { data: escrow, error } = await supabase
    .from("EscrowPayment")
    .update({
      status: "FUNDED",
      fundedAt: new Date().toISOString(),
    })
    .eq("stripePaymentIntentId", stripePaymentIntentId)
    .select()
    .single();

  if (error) throw error;

  // Notify the creator that funds are secured
  const { data: campaignCreator } = await supabase
    .from("CampaignCreator")
    .select("*, creator:CreatorProfile(*), campaign:Campaign(*)")
    .eq("id", escrow.campaignCreatorId)
    .single();

  if (campaignCreator) {
    await supabase.from("Notification").insert({
      userId: campaignCreator.creator.userId,
      title: "Escrow Funded",
      message: `Funds for campaign "${campaignCreator.campaign.title}" have been secured. You can now start creating content!`,
      type: "escrow_funded",
      metadata: {
        campaignId: campaignCreator.campaignId,
        amount: Number(escrow.amount),
      },
    });
  }

  return escrow;
}

/**
 * Release escrow funds to the creator via Stripe Connect transfer.
 * Called when the brand approves submitted content.
 */
export async function releaseEscrow(campaignCreatorId: string) {
  const { data: escrow, error: escrowError } = await supabase
    .from("EscrowPayment")
    .select("*, campaignCreator:CampaignCreator(*, creator:CreatorProfile(*), campaign:Campaign(*))")
    .eq("campaignCreatorId", campaignCreatorId)
    .single();

  if (escrowError || !escrow) throw new Error("Escrow not found");
  if (escrow.status !== "FUNDED") {
    throw new Error(`Cannot release escrow in ${escrow.status} status`);
  }

  const creatorStripeAccountId =
    escrow.campaignCreator.creator.stripeAccountId;
  if (!creatorStripeAccountId) {
    throw new Error("Creator has not completed Stripe onboarding");
  }

  const payoutCents = Math.round(Number(escrow.creatorPayout) * 100);

  // Transfer funds to creator's Connect account
  const transfer = await stripe.transfers.create({
    amount: payoutCents,
    currency: escrow.currency,
    destination: creatorStripeAccountId,
    metadata: {
      campaignCreatorId,
      escrowId: escrow.id,
      type: "creator_payout",
    },
  });

  // Update escrow status
  const { data: updatedEscrow, error: updateError } = await supabase
    .from("EscrowPayment")
    .update({
      status: "RELEASED",
      stripeTransferId: transfer.id,
      releasedAt: new Date().toISOString(),
    })
    .eq("id", escrow.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Update campaign creator status
  await supabase
    .from("CampaignCreator")
    .update({
      status: "PAID",
      approvedAt: new Date().toISOString(),
    })
    .eq("id", campaignCreatorId);

  // Notify creator
  await supabase.from("Notification").insert({
    userId: escrow.campaignCreator.creator.userId,
    title: "Payment Released!",
    message: `$${Number(escrow.creatorPayout).toFixed(2)} has been transferred to your account for campaign "${escrow.campaignCreator.campaign.title}".`,
    type: "payment_released",
    metadata: {
      campaignId: escrow.campaignCreator.campaignId,
      amount: Number(escrow.creatorPayout),
      transferId: transfer.id,
    },
  });

  return updatedEscrow;
}

/**
 * Refund escrow to the brand. Used when content is rejected or campaign cancelled.
 */
export async function refundEscrow(campaignCreatorId: string, reason: string) {
  const { data: escrow } = await supabase
    .from("EscrowPayment")
    .select()
    .eq("campaignCreatorId", campaignCreatorId)
    .single();

  if (!escrow) throw new Error("Escrow not found");
  if (escrow.status !== "FUNDED") {
    throw new Error(`Cannot refund escrow in ${escrow.status} status`);
  }

  // Refund via Stripe
  if (!escrow.stripePaymentIntentId) {
    throw new Error("Escrow has no associated Stripe PaymentIntent");
  }

  await stripe.refunds.create({
    payment_intent: escrow.stripePaymentIntentId,
    reason: "requested_by_customer",
    metadata: {
      campaignCreatorId,
      refundReason: reason,
    },
  });

  const { data: updatedEscrow, error } = await supabase
    .from("EscrowPayment")
    .update({
      status: "REFUNDED",
      refundedAt: new Date().toISOString(),
    })
    .eq("id", escrow.id)
    .select()
    .single();

  if (error) throw error;

  return updatedEscrow;
}

/**
 * Flag an escrow for admin dispute resolution.
 */
export async function disputeEscrow(
  campaignCreatorId: string,
  disputeReason: string
) {
  const { data: escrow, error } = await supabase
    .from("EscrowPayment")
    .update({ status: "DISPUTED" })
    .eq("campaignCreatorId", campaignCreatorId)
    .select()
    .single();

  if (error) throw error;

  // Notify admins
  const { data: admins } = await supabase
    .from("User")
    .select("id")
    .eq("role", "ADMIN");

  if (admins?.length) {
    await supabase.from("Notification").insert(
      admins.map((admin) => ({
        userId: admin.id,
        title: "Escrow Dispute",
        message: `A payment dispute has been raised. Reason: ${disputeReason}`,
        type: "escrow_dispute",
        metadata: {
          campaignCreatorId,
          escrowId: escrow.id,
          reason: disputeReason,
        },
      }))
    );
  }

  return escrow;
}

/**
 * Get escrow summary for a campaign.
 */
export async function getCampaignEscrowSummary(campaignId: string) {
  const { data: escrows } = await supabase
    .from("EscrowPayment")
    .select("*, campaignCreator:CampaignCreator(campaignId, creator:CreatorProfile(displayName))")
    .filter("campaignCreator.campaignId", "eq", campaignId);

  const items = (escrows ?? []).filter((e) => e.campaignCreator?.campaignId === campaignId);

  const summary = {
    totalEscrow: items.reduce((sum, e) => sum + Number(e.amount), 0),
    totalReleased: items
      .filter((e) => e.status === "RELEASED")
      .reduce((sum, e) => sum + Number(e.creatorPayout), 0),
    totalPending: items
      .filter((e) => e.status === "FUNDED")
      .reduce((sum, e) => sum + Number(e.amount), 0),
    platformRevenue: items
      .filter((e) => e.status === "RELEASED")
      .reduce((sum, e) => sum + Number(e.platformFee), 0),
    escrows: items.map((e) => ({
      id: e.id,
      creatorName: e.campaignCreator?.creator?.displayName ?? "Unknown",
      amount: Number(e.amount),
      creatorPayout: Number(e.creatorPayout),
      platformFee: Number(e.platformFee),
      status: e.status,
      fundedAt: e.fundedAt,
      releasedAt: e.releasedAt,
    })),
  };

  return summary;
}
