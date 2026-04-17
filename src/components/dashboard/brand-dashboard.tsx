"use client";

import { signOut } from "next-auth/react";
import type { BrandProfile, Campaign, CampaignStatus } from "@/lib/database.types";

type CampaignSummary = Pick<Campaign, "id" | "title" | "budget"> & {
  status: CampaignStatus;
  campaignCreators: unknown[];
};

interface BrandDashboardProps {
  brand: BrandProfile;
  campaigns: CampaignSummary[];
  stats: {
    activeCampaigns: number;
    totalCreators: number;
    totalSpent: number;
    pendingApprovals: number;
  };
}

export function BrandDashboard({
  brand,
  campaigns,
  stats,
}: BrandDashboardProps) {
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
              { label: "Dashboard", href: "/dashboard", active: true },
              { label: "Campaigns", href: "/dashboard/brand/campaigns" },
              { label: "Creator Discovery", href: "/dashboard/brand/creators" },
              { label: "Payments", href: "/dashboard/brand/payments" },
              { label: "Analytics", href: "/dashboard/brand/analytics" },
              { label: "Settings", href: "/dashboard/brand/settings" },
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
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border bg-purple-50 p-4">
          <p className="text-xs font-semibold text-purple-700">
            {brand.subscriptionTier} Plan
          </p>
          <p className="mt-1 text-xs text-purple-600">
            {brand.campaignsUsed} /{" "}
            {brand.subscriptionTier === "ENTERPRISE"
              ? "∞"
              : brand.subscriptionTier === "GROWTH"
                ? "10"
                : "3"}{" "}
            campaigns used
          </p>
          {brand.subscriptionTier !== "ENTERPRISE" && (
            <a
              href="/pricing"
              className="mt-2 block text-xs font-medium text-primary hover:underline"
            >
              Upgrade Plan →
            </a>
          )}
        </div>
        <div className="absolute bottom-28 left-4 right-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full rounded-lg px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Welcome back, {brand.companyName}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s your campaign performance overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <StatCard
            title="Active Campaigns"
            value={stats.activeCampaigns.toString()}
            change="+2 this month"
          />
          <StatCard
            title="Total Creators"
            value={stats.totalCreators.toString()}
            change="+12 this month"
          />
          <StatCard
            title="Total Spent"
            value={`$${stats.totalSpent.toLocaleString()}`}
            change="On budget"
          />
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals.toString()}
            change="Needs attention"
            highlight={stats.pendingApprovals > 0}
          />
        </div>

        {/* Recent Campaigns */}
        <div className="rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-lg font-semibold">Recent Campaigns</h2>
            <a
              href="/dashboard/brand/campaigns/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              + New Campaign
            </a>
          </div>
          <div className="divide-y">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <h3 className="font-medium">{campaign.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {campaign.campaignCreators.length} creators ·{" "}
                    ${Number(campaign.budget).toLocaleString()} budget
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={campaign.status} />
                  <a
                    href={`/dashboard/brand/campaigns/${campaign.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View →
                  </a>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No campaigns yet. Create your first campaign to get started!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  highlight,
}: {
  title: string;
  value: string;
  change: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p
        className={`mt-1 text-xs ${highlight ? "text-orange-500" : "text-green-500"}`}
      >
        {change}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-green-100 text-green-700",
    MATCHING: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-purple-100 text-purple-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
