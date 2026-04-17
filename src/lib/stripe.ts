import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not defined. Set it in .env to enable payments."
    );
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
}

/** Lazily-initialized Stripe client — throws at call-time if key is missing */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe();
    const value = (instance as any)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

/** Platform fee percentage taken from each escrow payment */
export const PLATFORM_FEE_PERCENT = 10;

/** Subscription tier pricing configuration */
export const SUBSCRIPTION_CONFIG = {
  FREE: {
    campaignLimit: 1,
    outreachLimit: 5,
    analyticsAccess: false,
    prioritySupport: false,
    aiCampaignBriefs: false,
  },
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
