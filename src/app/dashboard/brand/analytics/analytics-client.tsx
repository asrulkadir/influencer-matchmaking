"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

const brandNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campaigns", href: "/dashboard/brand/campaigns" },
  { label: "Creator Discovery", href: "/dashboard/brand/creators" },
  { label: "Payments", href: "/dashboard/brand/payments" },
  { label: "Analytics", href: "/dashboard/brand/analytics" },
  { label: "Settings", href: "/dashboard/brand/settings" },
];

export function BrandAnalyticsClient({
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
    <DashboardLayout navItems={brandNav}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Campaign Analytics</h1>
        <p className="text-muted-foreground">
          Performance metrics across your campaign creators
        </p>
      </div>
      {data.reports.length > 0 ? (
        <AnalyticsDashboard data={data} />
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-muted-foreground">
            No analytics data yet. Analytics will appear once your campaign
            creators start generating reports.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
