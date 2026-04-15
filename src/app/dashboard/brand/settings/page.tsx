"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type SubscriptionData = {
  tier: string;
  campaignsUsed: number;
  campaignLimit: number;
  outreachUsed: number;
  outreachLimit: number;
  analyticsAccess: boolean;
  billingCycleStart: string | null;
};

function SettingsContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("session_id")) {
      setSuccessMessage(
        "Your subscription has been activated! It may take a moment to reflect."
      );
    }
  }, [searchParams]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/subscriptions");
        if (res.ok) {
          setSubscription(await res.json());
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [status]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <span className="text-lg font-bold">CreatorMatch</span>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Campaigns", href: "/dashboard/brand/campaigns" },
              { label: "Payments", href: "/dashboard/brand/payments" },
              { label: "Settings", href: "/dashboard/brand/settings", active: true },
            ].map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`block rounded-lg px-4 py-2.5 text-sm ${
                    item.active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="ml-64 p-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your subscription and account</p>

        {successMessage && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
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

              {subscription.tier !== "ENTERPRISE" && (
                <div className="mt-6 border-t pt-6">
                  <Link
                    href="/pricing"
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    Upgrade Plan
                  </Link>
                </div>
              )}
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
      </main>
    </div>
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
