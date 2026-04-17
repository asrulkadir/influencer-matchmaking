"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { CampaignForm } from "@/components/campaigns/campaign-form";

const brandNav = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campaigns", href: "/dashboard/brand/campaigns" },
  { label: "Creator Discovery", href: "/dashboard/brand/creators" },
  { label: "Payments", href: "/dashboard/brand/payments" },
  { label: "Analytics", href: "/dashboard/brand/analytics" },
  { label: "Settings", href: "/dashboard/brand/settings" },
];

export function NewCampaignClient({
  nicheTags,
}: {
  nicheTags: Array<{ id: string; name: string }>;
}) {
  return (
    <DashboardLayout navItems={brandNav}>
      <CampaignForm nicheTags={nicheTags} />
    </DashboardLayout>
  );
}
