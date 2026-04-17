"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

const creatorNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Campaigns", href: "/dashboard/creator/campaigns" },
  { label: "Invitations", href: "/dashboard/creator/invitations" },
  { label: "Earnings", href: "/dashboard/creator/earnings" },
  { label: "Analytics", href: "/dashboard/creator/analytics" },
  { label: "Portfolio", href: "/dashboard/creator/portfolio" },
  { label: "Profile", href: "/dashboard/creator/profile" },
];

export function CreatorAnalyticsClient({
  data,
}: {
  data: {
    reports: any[];
    aggregated: {
      totalImpressions: number;
      totalReach: number;
      avgEngagement: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalSaves: number;
    };
  };
}) {
  return (
    <DashboardLayout navItems={creatorNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Your social media performance metrics
        </p>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/analytics", { method: "POST" });
            window.location.reload();
          }}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          Sync Social Media Stats
        </button>
      </div>

      {data.reports.length > 0 ? (
        <AnalyticsDashboard data={data} />
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-muted-foreground">
            No analytics data yet. Click &quot;Sync Social Media Stats&quot; to
            pull your latest metrics.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
