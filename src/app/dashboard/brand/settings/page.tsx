"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

const brandNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campaigns", href: "/dashboard/brand/campaigns" },
  { label: "Creator Discovery", href: "/dashboard/brand/creators" },
  { label: "Payments", href: "/dashboard/brand/payments" },
  { label: "Analytics", href: "/dashboard/brand/analytics" },
  { label: "Settings", href: "/dashboard/brand/settings" },
];

type SubscriptionData = {
  tier: string;
  campaignsUsed: number;
  campaignLimit: number;
  outreachUsed: number;
  outreachLimit: number;
  analyticsAccess: boolean;
  billingCycleStart: string | null;
  hasActiveSubscription: boolean;
};

const PLANS = [
  {
    tier: "FREE",
    name: "Free",
    price: 0,
    features: ["1 campaign/month", "5 creator outreach", "Basic matching", "Escrow payments"],
  },
  {
    tier: "STARTER",
    name: "Starter",
    price: 49,
    features: ["3 campaigns/month", "10 creator outreach", "Basic matching", "Escrow payments"],
  },
  {
    tier: "GROWTH",
    name: "Growth",
    price: 149,
    features: ["10 campaigns/month", "50 creator outreach", "Advanced matching", "Full analytics"],
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: 399,
    features: ["Unlimited campaigns", "Unlimited outreach", "AI campaign briefs", "Dedicated manager"],
  },
] as const;

function SettingsContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSwitchPlan = async (tier: string) => {
    setSwitching(tier);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to switch plan");

      if (data.url) {
        // New subscription — redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        // Existing subscription updated in-place
        setSuccessMessage(`Switched to ${tier} plan successfully!`);
        const subRes = await fetch("/api/subscriptions");
        if (subRes.ok) setSubscription(await subRes.json());
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to switch plan");
    } finally {
      setSwitching(null);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;

    const sessionId = searchParams.get("session_id");

    const fetchSubscription = async (afterVerify = false) => {
      try {
        const res = await fetch("/api/subscriptions");
        if (res.ok) {
          setSubscription(await res.json());
        }
      } catch {
        // silently fail
      } finally {
        if (!afterVerify) setLoading(false);
      }
    };

    if (sessionId) {
      // Verify the completed Stripe session and update the tier in the DB
      fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(async (res) => {
          if (res.ok) {
            const { tier } = await res.json();
            setSuccessMessage(
              `Your ${tier} subscription has been activated!`
            );
            await fetchSubscription(true);
          } else {
            // Session may already have been verified; still refresh data
            setSuccessMessage(
              "Your subscription has been activated! It may take a moment to reflect."
            );
            await fetchSubscription(true);
          }
        })
        .catch(() => {
          setSuccessMessage(
            "Your subscription has been activated! It may take a moment to reflect."
          );
        })
        .finally(() => setLoading(false));
    } else {
      fetchSubscription();
    }
  }, [status, searchParams]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>
          Please{" "}
          <Link href="/auth/signin" className="text-primary hover:underline">
            sign in
          </Link>{" "}
          to view settings.
        </p>
      </div>
    );
  }

  return (
    <DashboardLayout navItems={brandNav}>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground">Manage your subscription and account</p>

        {successMessage && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Subscription Status */}
        {subscription && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Current Plan</h2>
                  <p className="text-sm text-muted-foreground">
                    Your billing and usage overview
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                  {subscription.tier}
                </span>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <UsageBar
                  label="Campaigns"
                  used={subscription.campaignsUsed}
                  limit={subscription.campaignLimit}
                />
                <UsageBar
                  label="Creator Outreach"
                  used={subscription.outreachUsed}
                  limit={subscription.outreachLimit}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <FeatureBadge
                  label="Analytics"
                  enabled={subscription.analyticsAccess}
                />
                <FeatureBadge
                  label="Priority Support"
                  enabled={subscription.tier === "ENTERPRISE"}
                />
                <FeatureBadge
                  label="AI Campaign Briefs"
                  enabled={subscription.tier === "ENTERPRISE"}
                />
              </div>

              {/* Plan switcher */}
              <div className="mt-6 border-t pt-6">
                <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Change Plan</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {PLANS.map((plan) => {
                    const isCurrent = subscription.tier === plan.tier;
                    const tiers = ["STARTER", "GROWTH", "ENTERPRISE"];
                    const isUpgrade = tiers.indexOf(plan.tier) > tiers.indexOf(subscription.tier);
                    const isLoading = switching === plan.tier;
                    return (
                      <div
                        key={plan.tier}
                        className={`rounded-lg border p-4 ${
                          isCurrent ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{plan.name}</span>
                          {isCurrent && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xl font-bold">
                          {plan.price === 0 ? "Free" : `$${plan.price}`}
                          {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                        </p>
                        <ul className="mt-3 space-y-1">
                          {plan.features.map((f) => (
                            <li key={f} className="text-xs text-muted-foreground">✓ {f}</li>
                          ))}
                        </ul>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleSwitchPlan(plan.tier)}
                            disabled={!!switching}
                            className={`mt-4 w-full rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                              isUpgrade
                                ? "bg-primary text-white hover:bg-primary/90"
                                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {isLoading
                              ? "Switching..."
                              : isUpgrade
                              ? "Upgrade"
                              : "Downgrade"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold">Account</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">
                    {session.user?.email}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className="text-sm font-medium">
                    {(session.user as { role?: string })?.role ?? "BRAND"}
                  </span>
                </div>
                {subscription.billingCycleStart && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Billing Cycle Started
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(
                        subscription.billingCycleStart
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!subscription && !loading && (
          <div className="mt-8 rounded-xl border bg-white p-8 text-center">
            <p className="text-muted-foreground">
              Unable to load subscription details.
            </p>
            <Link
              href="/pricing"
              className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              View Plans
            </Link>
          </div>
        )}
    </DashboardLayout>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: Readonly<{
  label: string;
  used: number;
  limit: number;
}>) {
  const isUnlimited = limit < 0;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used} / {isUnlimited ? "∞" : limit}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 80 ? "bg-orange-500" : "bg-primary"
          }`}
          style={{ width: isUnlimited ? "0%" : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function FeatureBadge({
  label,
  enabled,
}: Readonly<{
  label: string;
  enabled: boolean;
}>) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        enabled
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {enabled ? "✓" : "✗"} {label}
    </span>
  );
}

export default function BrandSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
