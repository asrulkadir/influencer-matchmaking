import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/db";
import { fundEscrow } from "@/lib/escrow";
import type Stripe from "stripe";

async function handlePaymentIntentSucceeded(event: Stripe.PaymentIntentSucceededEvent) {
  const paymentIntent = event.data.object;
  if (paymentIntent.metadata.type === "escrow") {
    await fundEscrow(paymentIntent.id);
  }
}

async function handleSubscriptionUpsert(
  event: Stripe.CustomerSubscriptionCreatedEvent | Stripe.CustomerSubscriptionUpdatedEvent
) {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;

  const { data: brand } = await supabase
    .from("BrandProfile")
    .select()
    .eq("stripeCustomerId", customerId)
    .single();

  if (!brand) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const { data: plan } = await supabase
    .from("SubscriptionPlan")
    .select()
    .eq("stripePriceId", priceId)
    .single();

  if (!plan) return;

  const periodStart = subscription.items.data[0]?.current_period_start;

  await supabase
    .from("BrandProfile")
    .update({
      subscriptionTier: plan.tier,
      stripeSubscriptionId: subscription.id,
      campaignsUsed: 0,
      outreachUsed: 0,
      billingCycleStart: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : new Date().toISOString(),
    })
    .eq("id", brand.id);
}

async function handleSubscriptionDeleted(event: Stripe.CustomerSubscriptionDeletedEvent) {
  const subscription = event.data.object;
  const customerId = subscription.customer as string;

  await supabase
    .from("BrandProfile")
    .update({
      subscriptionTier: "STARTER",
      stripeSubscriptionId: null,
    })
    .eq("stripeCustomerId", customerId);
}

async function handleAccountUpdated(event: Stripe.AccountUpdatedEvent) {
  const account = event.data.object;

  if (account.charges_enabled && account.payouts_enabled) {
    await supabase
      .from("CreatorProfile")
      .update({ onboardingComplete: true })
      .eq("stripeAccountId", account.id);
  }
}

/**
 * POST /api/webhooks/stripe — Handle Stripe webhook events.
 *
 * Key events:
 * - payment_intent.succeeded: Escrow funded
 * - customer.subscription.created/updated/deleted: Subscription changes
 * - account.updated: Creator Stripe Connect onboarding status
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = headers();
  const signature = (await headersList).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      case "account.updated":
        await handleAccountUpdated(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Webhook handler error: ${error}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
