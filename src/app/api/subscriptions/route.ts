import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { stripe, SUBSCRIPTION_CONFIG } from "@/lib/stripe";
import { supabase } from "@/lib/db";

/**
 * POST /api/subscriptions — Create a Stripe Checkout session for subscription.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["BRAND"]);
    const { tier } = await request.json();

    if (!["FREE", "STARTER", "GROWTH", "ENTERPRISE"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const { data: brand } = await supabase
      .from("BrandProfile")
      .select("*")
      .eq("userId", user.id)
      .single();

    if (!brand) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }

    const { data: plan } = await supabase
      .from("SubscriptionPlan")
      .select("*")
      .eq("tier", tier)
      .single();

    if (!plan) {
      return NextResponse.json(
        { error: "Subscription plan not found" },
        { status: 404 }
      );
    }

    // FREE tier: cancel any active Stripe subscription and update DB directly
    if (tier === "FREE") {
      if (brand.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(brand.stripeSubscriptionId);
      }
      await supabase
        .from("BrandProfile")
        .update({ subscriptionTier: "FREE", stripeSubscriptionId: null })
        .eq("id", brand.id);
      return NextResponse.json({ success: true, tier: "FREE" });
    }

    if (plan.stripePriceId?.includes("placeholder")) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Set a real STRIPE_SECRET_KEY in .env and run `pnpm db:seed` to create Stripe prices.",
        },
        { status: 503 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId = brand.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: brand.companyName,
        metadata: { brandId: brand.id, userId: user.id },
      });
      stripeCustomerId = customer.id;

      await supabase
        .from("BrandProfile")
        .update({ stripeCustomerId })
        .eq("id", brand.id);
    }

    // If the brand already has an active subscription, update it directly
    // (handles both upgrades and downgrades without a new Checkout session)
    if (brand.stripeSubscriptionId) {
      const sub = await stripe.subscriptions.retrieve(
        brand.stripeSubscriptionId
      );
      const itemId = sub.items.data[0]?.id;
      if (!itemId) {
        return NextResponse.json(
          { error: "Could not find subscription item" },
          { status: 500 }
        );
      }

      await stripe.subscriptions.update(brand.stripeSubscriptionId, {
        items: [{ id: itemId, price: plan.stripePriceId ?? undefined }],
        proration_behavior: "create_prorations",
        metadata: { tier },
      });

      await supabase
        .from("BrandProfile")
        .update({ subscriptionTier: tier as "STARTER" | "GROWTH" | "ENTERPRISE" | "FREE" })
        .eq("id", brand.id);

      return NextResponse.json({ success: true, tier });
    }

    // No existing subscription — create a Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripePriceId ?? undefined, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/brand/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { brandId: brand.id, tier },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/subscriptions — Verify a completed Stripe Checkout session and
 * update subscriptionTier on BrandProfile. Called by the settings page on
 * return from Stripe Checkout (success_url contains ?session_id=...).
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole(["BRAND"]);
    const { sessionId } = await request.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== "complete" || session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not yet complete" },
        { status: 400 }
      );
    }

    const tier = session.metadata?.tier as string | undefined;
    if (!tier || !["FREE", "STARTER", "GROWTH", "ENTERPRISE"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier in session metadata" },
        { status: 400 }
      );
    }

    await supabase
      .from("BrandProfile")
      .update({
        subscriptionTier: tier as "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE",
        stripeSubscriptionId:
          typeof session.subscription === "string"
            ? session.subscription
            : null,
      })
      .eq("userId", user.id);

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/subscriptions — Get current subscription status for a brand.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["BRAND", "ADMIN"]);

    const { data: brand } = await supabase
      .from("BrandProfile")
      .select("*")
      .eq("userId", user.id)
      .single();

    if (!brand) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }

    const config = SUBSCRIPTION_CONFIG[brand.subscriptionTier];

    return NextResponse.json({
      tier: brand.subscriptionTier,
      campaignsUsed: brand.campaignsUsed,
      campaignLimit: config.campaignLimit,
      outreachUsed: brand.outreachUsed,
      outreachLimit: config.outreachLimit,
      analyticsAccess: config.analyticsAccess,
      billingCycleStart: brand.billingCycleStart,
      hasActiveSubscription: !!brand.stripeSubscriptionId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
