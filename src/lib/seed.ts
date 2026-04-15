import "dotenv/config";

import type { SubscriptionTier } from "./database.types";
import { supabase } from "./supabase";

async function main() {
  // Seed Niche Tags
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

  // Seed Subscription Plans
  const plans: Array<{
    tier: SubscriptionTier;
    name: string;
    stripePriceId: string;
    monthlyPrice: number;
    campaignLimit: number;
    outreachLimit: number;
    analyticsAccess: boolean;
    prioritySupport: boolean;
    aiCampaignBriefs: boolean;
    features: string[];
  }> = [
    {
      tier: "STARTER",
      name: "Starter",
      stripePriceId: "price_starter_monthly",
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
      stripePriceId: "price_growth_monthly",
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
      stripePriceId: "price_enterprise_monthly",
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

  const { error: planError } = await supabase
    .from("SubscriptionPlan")
    .upsert(plans, { onConflict: "tier" });

  if (planError) throw planError;

  console.log("Seed data created successfully!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
