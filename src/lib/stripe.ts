import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

/** Platform fee percentage taken from each escrow payment */
export const PLATFORM_FEE_PERCENT = 10;

/** Subscription tier pricing configuration */
export const SUBSCRIPTION_CONFIG = {
  STARTER: {
    campaignLimit: 3,
    outreachLimit: 10,
    analyticsAccess: false,
    prioritySupport: false,
    aiCampaignBriefs: false,
  },
  GROWTH: {
    campaignLimit: 10,
    outreachLimit: 50,
    analyticsAccess: true,
    prioritySupport: false,
    aiCampaignBriefs: false,
  },
  ENTERPRISE: {
    campaignLimit: -1, // unlimited
    outreachLimit: -1,
    analyticsAccess: true,
    prioritySupport: true,
    aiCampaignBriefs: true,
  },
} as const;
