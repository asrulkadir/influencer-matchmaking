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

    if (!["STARTER", "GROWTH", "ENTERPRISE"].includes(tier)) {
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

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
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
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
