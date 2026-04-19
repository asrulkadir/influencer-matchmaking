import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/creators/stripe-connect — Create or resume Stripe Connect onboarding for a creator.
 * Returns an Account Link URL that the creator can use to complete Stripe setup.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: creator } = await supabase
      .from("CreatorProfile")
      .select("id, stripeAccountId, onboardingComplete")
      .eq("userId", session.user.id)
      .single();

    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    let stripeAccountId = creator.stripeAccountId;

    // Create a new Stripe Connect Express account if one doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: session.user.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          creatorId: creator.id,
          userId: session.user.id,
        },
      });

      stripeAccountId = account.id;

      const { error } = await supabase
        .from("CreatorProfile")
        .update({ stripeAccountId: account.id })
        .eq("id", creator.id);

      if (error) throw error;
    }

    // Generate an Account Link for onboarding (or re-onboarding)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/dashboard/creator/profile?stripe=refresh`,
      return_url: `${appUrl}/dashboard/creator/profile?stripe=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/creators/stripe-connect — Check the creator's Stripe Connect status.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: creator } = await supabase
      .from("CreatorProfile")
      .select("id, stripeAccountId, onboardingComplete")
      .eq("userId", session.user.id)
      .single();

    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    if (!creator.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        onboardingComplete: false,
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(creator.stripeAccountId);
    const isComplete =
      account.charges_enabled && account.payouts_enabled;

    // Update DB if onboarding just completed
    if (isComplete && !creator.onboardingComplete) {
      await supabase
        .from("CreatorProfile")
        .update({ onboardingComplete: true })
        .eq("id", creator.id);
    }

    return NextResponse.json({
      connected: true,
      onboardingComplete: isComplete,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
