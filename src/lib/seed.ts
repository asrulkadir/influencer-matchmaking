import "dotenv/config";

import Stripe from "stripe";
import type { SubscriptionTier } from "./database.types";
import { supabase } from "./supabase";

const PLAN_DEFS: Array<{
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  stripePriceId?: string | null;
  campaignLimit: number;
  outreachLimit: number;
  analyticsAccess: boolean;
  prioritySupport: boolean;
  aiCampaignBriefs: boolean;
  features: string[];
}> = [
  {
    tier: "FREE",
    name: "Free",
    monthlyPrice: 0,
    stripePriceId: null, // No Stripe price for free tier
    campaignLimit: 1,
    outreachLimit: 5,
    analyticsAccess: false,
    prioritySupport: false,
    aiCampaignBriefs: false,
    features: [
      "1 campaign/month",
      "5 creator outreach",
      "Basic matching",
      "Escrow payments",
    ],
  },
  {
    tier: "STARTER",
    name: "Starter",
    monthlyPrice: 49,
    campaignLimit: 3,
    outreachLimit: 10,
    analyticsAccess: false,
    prioritySupport: false,
    aiCampaignBriefs: false,
    features: [
      "3 campaigns/month",
      "10 creator outreach",
      "Basic matching",
      "Escrow payments",
      "Email support",
    ],
  },
  {
    tier: "GROWTH",
    name: "Growth",
    monthlyPrice: 149,
    campaignLimit: 10,
    outreachLimit: 50,
    analyticsAccess: true,
    prioritySupport: false,
    aiCampaignBriefs: false,
    features: [
      "10 campaigns/month",
      "50 creator outreach",
      "Advanced matching",
      "Full analytics",
      "Priority matching",
      "Chat support",
    ],
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: 399,
    campaignLimit: -1,
    outreachLimit: -1,
    analyticsAccess: true,
    prioritySupport: true,
    aiCampaignBriefs: true,
    features: [
      "Unlimited campaigns",
      "Unlimited outreach",
      "AI campaign briefs",
      "Advanced analytics",
      "Dedicated manager",
      "Contract generation",
      "API access",
    ],
  },
];

/**
 * Create Stripe Products + Prices for each subscription tier.
 * Reuses existing products if found by metadata lookup.
 */
async function createStripePrices(stripe: Stripe) {
  const priceMap: Record<string, string> = {};

  for (const plan of PLAN_DEFS) {
    // FREE tier has no Stripe price
    if (plan.tier === "FREE") continue;
    const existing = await stripe.products.search({
      query: `metadata["tier"]:"${plan.tier}"`,
    });

    let productId: string;

    if (existing.data.length > 0) {
      productId = existing.data[0].id;
      console.log(`  Found existing Stripe product for ${plan.tier}: ${productId}`);
    } else {
      const product = await stripe.products.create({
        name: `CreatorMatch ${plan.name}`,
        description: plan.features.join(", "),
        metadata: { tier: plan.tier },
      });
      productId = product.id;
      console.log(`  Created Stripe product for ${plan.tier}: ${productId}`);
    }

    // Check for existing price on this product
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      type: "recurring",
      limit: 5,
    });

    const matchingPrice = prices.data.find(
      (p) =>
        p.unit_amount === plan.monthlyPrice * 100 &&
        p.recurring?.interval === "month"
    );

    if (matchingPrice) {
      priceMap[plan.tier] = matchingPrice.id;
      console.log(`  Found existing Stripe price for ${plan.tier}: ${matchingPrice.id}`);
    } else {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.monthlyPrice * 100,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { tier: plan.tier },
      });
      priceMap[plan.tier] = price.id;
      console.log(`  Created Stripe price for ${plan.tier}: ${price.id}`);
    }
  }

  return priceMap;
}

async function main() {
  console.log("Seeding database...\n");

  // ── Niche Tags ──────────────────────────────────────────────
  const niches = [
    "Fashion & Beauty",
    "Fitness & Health",
    "Food & Cooking",
    "Travel & Adventure",
    "Technology & Gaming",
    "Lifestyle & Home",
    "Parenting & Family",
    "Finance & Business",
    "Entertainment & Comedy",
    "Education & Learning",
    "Sustainability & Eco",
    "Pet & Animals",
    "Art & Design",
    "Music & Dance",
    "Sports & Outdoors",
  ];

  const nicheRows = niches.map((name) => ({
    name,
    slug: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
  }));

  const { error: nicheError } = await supabase
    .from("NicheTag")
    .upsert(nicheRows, { onConflict: "slug" });

  if (nicheError) throw nicheError;
  console.log(`✓ Seeded ${niches.length} niche tags`);

  // ── Subscription Plans ──────────────────────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const isRealStripeKey =
    stripeKey && stripeKey.startsWith("sk_test_") && stripeKey.length > 20;

  let priceMap: Record<string, string> = {};

  if (isRealStripeKey) {
    console.log("\n→ Real Stripe key detected — creating Products & Prices...");
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
    priceMap = await createStripePrices(stripe);
  } else {
    console.log("\n→ No real Stripe key — using placeholder price IDs");
    console.log("  Set a real STRIPE_SECRET_KEY and re-run to create Stripe prices.\n");
    priceMap = {
      STARTER: "price_starter_placeholder",
      GROWTH: "price_growth_placeholder",
      ENTERPRISE: "price_enterprise_placeholder",
    };
  }

  const plans = PLAN_DEFS.map((plan) => ({
    ...plan,
    // FREE plan has no Stripe price; paid plans use the priceMap
    stripePriceId: plan.tier === "FREE" ? null : (priceMap[plan.tier] ?? null),
  }));

  const { error: planError } = await supabase
    .from("SubscriptionPlan")
    .upsert(plans, { onConflict: "tier" });

  if (planError) throw planError;
  console.log(`✓ Seeded ${plans.length} subscription plans\n`);

  console.log("Seed completed successfully!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
