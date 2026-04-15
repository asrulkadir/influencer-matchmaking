"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const plans = [
  {
    tier: "STARTER",
    name: "Starter",
    price: 49,
    popular: false,
    features: [
      "3 campaigns per month",
      "10 creator outreach",
      "Basic matching algorithm",
      "Standard escrow payments",
      "Email support",
    ],
  },
  {
    tier: "GROWTH",
    name: "Growth",
    price: 149,
    popular: true,
    features: [
      "10 campaigns per month",
      "50 creator outreach",
      "Advanced matching algorithm",
      "Full analytics dashboard",
      "Priority matching",
      "Chat support",
    ],
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: 399,
    popular: false,
    features: [
      "Unlimited campaigns",
      "Unlimited creator outreach",
      "AI campaign brief generation",
      "Advanced analytics & reports",
      "Dedicated account manager",
      "Custom contract generation",
      "API access",
    ],
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    if (!session) {
      globalThis.location.href = `/auth/signin?plan=${tier.toLowerCase()}`;
      return;
    }

    setLoadingTier(tier);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? "Failed to create checkout session");
        return;
      }

      if (data.url) {
        globalThis.location.href = data.url;
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-pink-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">CreatorMatch</span>
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that scales with your influencer campaigns
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border p-8 ${
                plan.popular
                  ? "border-primary bg-white shadow-lg ring-2 ring-primary"
                  : "bg-white shadow-sm"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleSubscribe(plan.tier)}
                disabled={loadingTier === plan.tier}
                className={`mt-8 block w-full rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors disabled:opacity-60 ${
                  plan.popular
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "border border-primary text-primary hover:bg-primary/5"
                }`}
              >
                {loadingTier === plan.tier ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {"Processing..."}
                  </span>
                ) : (
                  "Get Started"
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include secure escrow payments via Stripe. Cancel anytime.
          </p>
        </div>
      </main>
    </div>
  );
}
